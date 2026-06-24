import razorpay
from decimal import Decimal
from django.conf import settings as django_settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OrderRoom, RoomMember, OrderItem, SubOrder, Payment, Message, PurchaseHistory
from .serializers import (
    OrderRoomListSerializer,
    OrderRoomDetailSerializer,
    OrderRoomCreateSerializer,
    OrderItemReadSerializer,
    AddItemSerializer,
    LockRoomSerializer,
    CreateRazorpayOrderSerializer,
    VerifyPaymentSerializer,
    MemberSerializer,
    PaymentSerializer,
    MessageSerializer,
    PurchaseHistorySerializer,
)

# ── Razorpay client (initialized once) ───────────────────
razorpay_client = razorpay.Client(
    auth=(django_settings.RAZORPAY_KEY_ID, django_settings.RAZORPAY_KEY_SECRET)
)


class OrderRoomViewSet(viewsets.ModelViewSet):
    """
    CRUD + custom actions for Order Rooms.

    LIST    GET    /api/orders/rooms/              → rooms the user is a member of
    CREATE  POST   /api/orders/rooms/              → create a new room
    DETAIL  GET    /api/orders/rooms/{room_code}/  → full room detail
    DELETE  DELETE /api/orders/rooms/{room_code}/  → cancel/delete room (creator only)

    Custom actions (all use room_code as lookup):
      POST  /api/orders/rooms/{room_code}/join/             → join by code
      POST  /api/orders/rooms/{room_code}/add_item/         → add product
      DELETE /api/orders/rooms/{room_code}/remove_item/{item_id}/
      POST  /api/orders/rooms/{room_code}/lock/             → lock & set deadline
      POST  /api/orders/rooms/{room_code}/pay/              → simulate payment
      POST  /api/orders/rooms/{room_code}/cancel/           → cancel room
      GET   /api/orders/rooms/{room_code}/my_share/         → what the user owes
      GET   /api/orders/rooms/{room_code}/messages/         → get chat messages
      POST  /api/orders/rooms/{room_code}/messages/         → send chat message
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'room_code'

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderRoomCreateSerializer
        if self.action == 'list':
            return OrderRoomListSerializer
        return OrderRoomDetailSerializer

    def get_queryset(self):
        """Only show rooms the user is a member of."""
        return OrderRoom.objects.filter(
            room_members__user=self.request.user
        ).distinct()

    # ── Join Room ────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='join')
    def join_room(self, request, room_code=None):
        room = self.get_object()

        if room.status != OrderRoom.Status.OPEN:
            return Response(
                {'error': 'This room is no longer accepting members.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if room.is_private:
            password = request.data.get('room_password', '')
            if room.room_password and room.room_password != password:
                return Response(
                    {'error': 'Incorrect room password.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if room.room_members.filter(user=request.user).exists():
            return Response(
                {'error': 'You are already a member of this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        RoomMember.objects.create(room=room, user=request.user)
        return Response(
            {'message': f'Joined room {room.room_code} successfully.'},
            status=status.HTTP_200_OK,
        )

    # ── Join by Code (non-member endpoint) ───────────────────
    # This allows joining a room without being a member first
    # by providing the room code. Overrides get_queryset for this action.

    # ── Add Item ─────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='add_item')
    def add_item(self, request, room_code=None):
        room = self.get_object()

        if room.status != OrderRoom.Status.OPEN:
            return Response(
                {'error': 'Cannot add items — room is not open.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not room.room_members.filter(user=request.user).exists():
            return Response(
                {'error': 'You must be a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AddItemSerializer(
            data=request.data,
            context={'request': request, 'room': room},
        )
        serializer.is_valid(raise_exception=True)
        item = serializer.save()

        return Response(
            OrderItemReadSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Remove Item ──────────────────────────────────────────
    @action(detail=True, methods=['delete'], url_path='remove_item/(?P<item_id>[0-9]+)')
    def remove_item(self, request, room_code=None, item_id=None):
        room = self.get_object()

        if room.status != OrderRoom.Status.OPEN:
            return Response(
                {'error': 'Cannot modify items — room is not open.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = OrderItem.objects.get(pk=item_id, room=room)
        except OrderItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only the person who added it or the room creator can remove
        if item.added_by != request.user and room.creator != request.user:
            return Response(
                {'error': 'You can only remove items you added.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Lock Room & Set Deadline ─────────────────────────────
    @action(detail=True, methods=['post'], url_path='lock')
    def lock_room(self, request, room_code=None):
        room = self.get_object()

        if room.creator != request.user:
            return Response(
                {'error': 'Only the room creator can lock the room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if room.status != OrderRoom.Status.OPEN:
            return Response(
                {'error': 'Room is not in open state.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if room.items.count() == 0:
            return Response(
                {'error': 'Cannot lock an empty room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LockRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deadline_hours = serializer.validated_data['deadline_hours']

        room.lock_room(deadline_hours=deadline_hours)
        self._calculate_member_shares(room)

        return Response(
            OrderRoomDetailSerializer(room).data,
            status=status.HTTP_200_OK,
        )

    # ── Calculate Shares ─────────────────────────────────────
    def _calculate_member_shares(self, room):
        """Calculate what each member owes based on split mode."""
        members = room.room_members.all()
        member_count = members.count()

        if member_count == 0:
            return

        if room.split_mode == OrderRoom.SplitMode.EQUAL:
            # Equal split: total ÷ members
            per_person = room.total_order_value / member_count
            for member in members:
                member.amount_owed = per_person
                member.save()

        elif room.split_mode == OrderRoom.SplitMode.INDIVIDUAL:
            # Individual: each pays for own items + proportional delivery
            delivery_per_person = room.delivery_fee / member_count if member_count > 0 else 0

            for member in members:
                items_total = sum(
                    item.line_total
                    for item in room.items.filter(added_by=member.user)
                )
                member.amount_owed = items_total + delivery_per_person
                member.save()

    # ── Razorpay: Get Public Key ──────────────────────────────
    @action(detail=False, methods=['get'], url_path='razorpay_key')
    def razorpay_key(self, request):
        """Return the Razorpay public key so the frontend can init checkout."""
        return Response({'key': django_settings.RAZORPAY_KEY_ID})

    # ── Razorpay: Create Order (Step 1) ──────────────────────
    @action(detail=True, methods=['post'], url_path='pay/create_order')
    def create_order(self, request, room_code=None):
        """
        Creates a Razorpay order for the requesting member's share.
        Returns the order_id, amount, and key needed by the frontend.
        """
        room = self.get_object()

        if room.status not in (OrderRoom.Status.LOCKED, OrderRoom.Status.PAYMENT_PENDING):
            return Response(
                {'error': 'Room is not ready for payments.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if room.is_deadline_expired:
            room.expire_room()
            return Response(
                {'error': 'Payment deadline has expired. Room cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            member = room.room_members.get(user=request.user)
        except RoomMember.DoesNotExist:
            return Response(
                {'error': 'You are not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if member.payment_status == RoomMember.PaymentStatus.PAID:
            return Response(
                {'error': 'You have already paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Amount in paise (Razorpay uses smallest currency unit)
        amount_paise = int(member.amount_owed * 100)

        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': f'room_{room.room_code}_user_{request.user.id}',
            'notes': {
                'room_code': room.room_code,
                'room_name': room.name,
                'user_id': str(request.user.id),
                'username': request.user.username,
            },
        })

        # Save the Razorpay order ID in a Payment record (status = INITIATED)
        payment = Payment.objects.create(
            room=room,
            member=member,
            amount=member.amount_owed,
            razorpay_order_id=razorpay_order['id'],
            status=Payment.Status.INITIATED,
        )

        return Response({
            'razorpay_order_id': razorpay_order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'key': django_settings.RAZORPAY_KEY_ID,
            'user': {
                'name': request.user.username,
                'email': request.user.email,
            },
            'room_name': room.name,
            'payment_id': payment.id,
        }, status=status.HTTP_201_CREATED)

    # ── Razorpay: Verify Payment (Step 2) ────────────────────
    @action(detail=True, methods=['post'], url_path='pay/verify')
    def verify_payment(self, request, room_code=None):
        """
        Verifies the Razorpay payment signature after the user
        completes checkout. On success, marks the member as paid.
        """
        room = self.get_object()

        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Verify signature
        # In DEBUG mode, allow test payments with 'test_' prefix IDs
        is_test_payment = (
            django_settings.DEBUG and
            data['razorpay_payment_id'].startswith('test_')
        )
        if not is_test_payment:
            try:
                razorpay_client.utility.verify_payment_signature({
                    'razorpay_order_id': data['razorpay_order_id'],
                    'razorpay_payment_id': data['razorpay_payment_id'],
                    'razorpay_signature': data['razorpay_signature'],
                })
            except razorpay.errors.SignatureVerificationError:
                return Response(
                    {'error': 'Payment verification failed. Invalid signature.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Update the Payment record
        try:
            payment = Payment.objects.get(
                razorpay_order_id=data['razorpay_order_id'],
                room=room,
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment record not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        payment.razorpay_payment_id = data['razorpay_payment_id']
        payment.razorpay_signature = data['razorpay_signature']
        payment.status = Payment.Status.SUCCESS
        payment.save()

        # Mark member as paid
        member = payment.member
        member.payment_status = RoomMember.PaymentStatus.PAID
        member.payment_id = data['razorpay_payment_id']
        member.save()

        # Save delivery_address if the user is the creator
        if room.creator == request.user and 'delivery_address' in data:
            room.delivery_address = data['delivery_address']

        # Update room status
        if room.status == OrderRoom.Status.LOCKED:
            room.status = OrderRoom.Status.PAYMENT_PENDING
            room.save()
        elif room.creator == request.user and 'delivery_address' in data:
            room.save(update_fields=['delivery_address'])

        # Check if all members have paid
        all_confirmed = room.check_all_payments_complete()

        return Response({
            'message': 'Payment successful!',
            'amount_paid': str(member.amount_owed),
            'order_confirmed': all_confirmed,
            'room_status': room.status,
        }, status=status.HTTP_200_OK)

    # ── My Share ─────────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='my_share')
    def my_share(self, request, room_code=None):
        room = self.get_object()

        try:
            member = room.room_members.get(user=request.user)
        except RoomMember.DoesNotExist:
            return Response(
                {'error': 'You are not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        my_items = room.items.filter(added_by=request.user)

        return Response({
            'amount_owed': str(member.amount_owed),
            'payment_status': member.payment_status,
            'split_mode': room.split_mode,
            'is_creator': room.creator == request.user,
            'my_items': OrderItemReadSerializer(my_items, many=True).data,
            'room_total': str(room.total_order_value),
            'member_count': room.member_count,
        })

    # ── Cancel Room ──────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_room(self, request, room_code=None):
        room = self.get_object()

        if room.creator != request.user:
            return Response(
                {'error': 'Only the room creator can cancel.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if room.status == OrderRoom.Status.CONFIRMED:
            return Response(
                {'error': 'Cannot cancel a confirmed order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        room.cancel_room()
        return Response(
            {'message': 'Room cancelled. Stock has been released.'},
            status=status.HTTP_200_OK,
        )

    # ── Chat Messages ────────────────────────────────────────
    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, room_code=None):
        room = self.get_object()

        if not room.room_members.filter(user=request.user).exists():
            return Response(
                {'error': 'You are not a member of this room.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.method == 'GET':
            # Support polling: ?after=<message_id> returns only newer messages
            after_id = request.query_params.get('after')
            qs = room.messages.select_related('user')
            if after_id:
                qs = qs.filter(id__gt=after_id).order_by('created_at')
            else:
                # Return last 50 messages in chronological order
                last_ids = room.messages.order_by('-created_at').values_list('id', flat=True)[:50]
                qs = qs.filter(id__in=last_ids).order_by('created_at')
            serializer = MessageSerializer(qs, many=True)
            return Response(serializer.data)

        # POST — send a message
        text = request.data.get('text', '').strip()
        if not text:
            return Response(
                {'error': 'Message text is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        msg = Message.objects.create(
            room=room, user=request.user, text=text
        )
        return Response(
            MessageSerializer(msg).data,
            status=status.HTTP_201_CREATED,
        )


class JoinRoomByCodeView(APIView):
    """
    POST /api/orders/join/
    Body: { "room_code": "ABC12345" }

    Allows any authenticated user to join a room by code
    (even if they're not yet a member, so it won't be
    filtered out by the viewset's get_queryset).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        room_code = request.data.get('room_code', '').strip().upper()
        if not room_code:
            return Response(
                {'error': 'Room code is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            room = OrderRoom.objects.get(room_code=room_code)
        except OrderRoom.DoesNotExist:
            return Response(
                {'error': 'Room not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if room.status != OrderRoom.Status.OPEN:
            return Response(
                {'error': 'This room is no longer accepting members.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if room.is_private:
            password = request.data.get('room_password', '')
            if room.room_password and room.room_password != password:
                return Response(
                    {'error': 'Incorrect room password.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if room.room_members.filter(user=request.user).exists():
            return Response(
                {'message': 'You are already a member of this room.', 'room_code': room.room_code},
                status=status.HTTP_200_OK,
            )

        RoomMember.objects.create(room=room, user=request.user)
        return Response(
            {
                'message': f'Joined room "{room.name}" successfully!',
                'room_code': room.room_code,
            },
            status=status.HTTP_200_OK,
        )


class PurchaseHistoryView(APIView):
    """
    GET /api/orders/purchase-history/
    Returns the authenticated user's purchase history
    (all items from rooms they created that were confirmed).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        purchases = PurchaseHistory.objects.filter(
            user=request.user
        ).select_related('room', 'product')

        serializer = PurchaseHistorySerializer(purchases, many=True)

        # Summary stats
        from django.db.models import Sum, Count
        stats = purchases.aggregate(
            total_spent=Sum('line_total'),
            total_items=Sum('quantity'),
            total_orders=Count('room', distinct=True),
        )

        return Response({
            'stats': {
                'total_spent': str(stats['total_spent'] or 0),
                'total_items': stats['total_items'] or 0,
                'total_orders': stats['total_orders'] or 0,
            },
            'purchases': serializer.data,
        })


class DirectCheckoutView(APIView):
    """
    Direct Buy Now checkout using Razorpay (no room required).

    POST /api/orders/direct-checkout/create/   → create Razorpay order
    POST /api/orders/direct-checkout/verify/   → verify payment signature
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, action=None):
        if action == 'create':
            return self._create_order(request)
        elif action == 'verify':
            return self._verify_payment(request)
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    def _create_order(self, request):
        from products.models import Product
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        if product.stock < quantity:
            return Response(
                {'error': f'Only {product.stock} units available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delivery_fee = Decimal('99.00')
        item_total = product.price * quantity
        total = item_total + delivery_fee
        amount_paise = int(total * 100)

        razorpay_order = razorpay_client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': f'direct_{request.user.id}_{product_id}',
            'notes': {
                'product_id': str(product_id),
                'product_name': product.name,
                'user_id': str(request.user.id),
                'username': request.user.username,
                'quantity': str(quantity),
                'type': 'direct_checkout',
            },
        })

        return Response({
            'razorpay_order_id': razorpay_order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'key': django_settings.RAZORPAY_KEY_ID,
            'user': {
                'name': request.user.username,
                'email': request.user.email,
            },
            'product': {
                'name': product.name,
                'price': str(product.price),
                'quantity': quantity,
            },
        }, status=status.HTTP_201_CREATED)

    def _verify_payment(self, request):
        from products.models import Product

        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response(
                {'error': 'Missing payment verification fields.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # In DEBUG mode, allow test payments with 'test_' prefix IDs
        is_test_payment = (
            django_settings.DEBUG and
            razorpay_payment_id.startswith('test_')
        )
        if not is_test_payment:
            try:
                razorpay_client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                })
            except razorpay.errors.SignatureVerificationError:
                return Response(
                    {'error': 'Payment verification failed. Invalid signature.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Create purchase history record for direct checkout
        if product_id:
            try:
                product = Product.objects.get(pk=product_id)
                PurchaseHistory.objects.create(
                    user=request.user,
                    room=None,  # direct purchase, no room
                    product=product,
                    product_name=product.name,
                    product_image=product.image.name if product.image else '',
                    seller_name=product.seller.username if product.seller else '',
                    quantity=quantity,
                    price_paid=product.price,
                    line_total=product.price * quantity,
                )
                # Decrement stock
                product.stock = max(0, product.stock - quantity)
                product.save()
            except Product.DoesNotExist:
                pass  # still return success — payment went through

        return Response({
            'message': 'Payment verified successfully!',
            'razorpay_payment_id': razorpay_payment_id,
        }, status=status.HTTP_200_OK)


