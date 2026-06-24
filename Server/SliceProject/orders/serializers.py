from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OrderRoom, RoomMember, OrderItem, SubOrder, Payment, Message, PurchaseHistory

User = get_user_model()


# ──────────────────────────────────────────────
#  Nested / Read Serializers
# ──────────────────────────────────────────────
class MemberSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    user_id = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = RoomMember
        fields = [
            'id', 'user_id', 'username', 'amount_owed',
            'payment_status', 'payment_id', 'joined_at',
        ]
        read_only_fields = fields


class OrderItemReadSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_image = serializers.ImageField(source='product.image', read_only=True)
    seller_username = serializers.ReadOnlyField(source='product.seller.username')
    added_by_username = serializers.ReadOnlyField(source='added_by.username')
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'seller_username', 'added_by', 'added_by_username',
            'quantity', 'price_at_addition', 'line_total',
            'stock_reserved', 'added_at',
        ]
        read_only_fields = fields


class SubOrderSerializer(serializers.ModelSerializer):
    seller_username = serializers.ReadOnlyField(source='seller.username')
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = SubOrder
        fields = [
            'id', 'seller', 'seller_username', 'sub_total',
            'commission_rate', 'commission_amount', 'net_amount',
            'status', 'items', 'created_at',
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='member.user.username')

    class Meta:
        model = Payment
        fields = [
            'id', 'username', 'amount', 'razorpay_order_id',
            'razorpay_payment_id', 'status', 'created_at',
        ]
        read_only_fields = fields


# ──────────────────────────────────────────────
#  Order Room — Full Detail
# ──────────────────────────────────────────────
class OrderRoomDetailSerializer(serializers.ModelSerializer):
    creator_username = serializers.ReadOnlyField(source='creator.username')
    members_list = MemberSerializer(source='room_members', many=True, read_only=True)
    items = OrderItemReadSerializer(many=True, read_only=True)
    sub_orders = SubOrderSerializer(many=True, read_only=True)
    total_items_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_order_value = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderRoom
        fields = [
            'id', 'room_code', 'name', 'creator', 'creator_username',
            'split_mode', 'status', 'is_private', 'delivery_address', 'delivery_fee',
            'payment_deadline', 'total_items_cost', 'total_order_value',
            'member_count', 'members_list', 'items', 'sub_orders',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'room_code', 'creator', 'creator_username',
            'status', 'payment_deadline', 'total_items_cost',
            'total_order_value', 'member_count', 'created_at', 'updated_at',
        ]


# ──────────────────────────────────────────────
#  Order Room — List (lighter)
# ──────────────────────────────────────────────
class OrderRoomListSerializer(serializers.ModelSerializer):
    creator_username = serializers.ReadOnlyField(source='creator.username')
    member_count = serializers.IntegerField(read_only=True)
    total_order_value = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = OrderRoom
        fields = [
            'id', 'room_code', 'name', 'creator_username',
            'split_mode', 'status', 'is_private', 'member_count',
            'item_count', 'total_order_value',
            'payment_deadline', 'created_at',
        ]

    def get_item_count(self, obj):
        return obj.items.count()


# ──────────────────────────────────────────────
#  Order Room — Create
# ──────────────────────────────────────────────
PLATFORM_DELIVERY_FEE = 99  # Standard platform delivery fee (₹)


class OrderRoomCreateSerializer(serializers.ModelSerializer):
    room_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = OrderRoom
        fields = ['id', 'room_code', 'name', 'split_mode', 'status', 'is_private', 'room_password']
        read_only_fields = ['id', 'room_code', 'status']

    def create(self, validated_data):
        user = self.context['request'].user
        room = OrderRoom.objects.create(
            creator=user,
            delivery_fee=PLATFORM_DELIVERY_FEE,
            **validated_data,
        )
        # Creator auto-joins as a member
        RoomMember.objects.create(room=room, user=user)
        return room


# ──────────────────────────────────────────────
#  Add Item to Room
# ──────────────────────────────────────────────
class AddItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate_product_id(self, value):
        from products.models import Product
        try:
            product = Product.objects.get(pk=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found.")
        if product.stock <= 0:
            raise serializers.ValidationError("Product is out of stock.")
        return value

    def validate(self, attrs):
        from products.models import Product
        product = Product.objects.get(pk=attrs['product_id'])
        if product.stock < attrs['quantity']:
            raise serializers.ValidationError(
                f"Only {product.stock} units available."
            )
        return attrs

    def create(self, validated_data):
        from products.models import Product
        room = self.context['room']
        user = self.context['request'].user
        product = Product.objects.get(pk=validated_data['product_id'])

        # Check if same product already added by this user — increment quantity
        existing = OrderItem.objects.filter(
            room=room, product=product, added_by=user
        ).first()

        if existing:
            existing.quantity += validated_data['quantity']
            existing.save()
            return existing

        return OrderItem.objects.create(
            room=room,
            product=product,
            added_by=user,
            quantity=validated_data['quantity'],
            price_at_addition=product.price,
        )


# ──────────────────────────────────────────────
#  Lock Room
# ──────────────────────────────────────────────
class LockRoomSerializer(serializers.Serializer):
    deadline_hours = serializers.IntegerField(min_value=1, max_value=72, default=24)


# ──────────────────────────────────────────────
#  Razorpay – Create Order (Step 1)
# ──────────────────────────────────────────────
class CreateRazorpayOrderSerializer(serializers.Serializer):
    """No input needed — the backend calculates amount from member's share."""
    pass


# ──────────────────────────────────────────────
#  Razorpay – Verify Payment (Step 2)
# ──────────────────────────────────────────────
class VerifyPaymentSerializer(serializers.Serializer):
    """
    After Razorpay checkout, the frontend sends back these three
    values so the server can verify the signature.
    """
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()
    delivery_address = serializers.CharField(required=False, allow_blank=True)


# ──────────────────────────────────────────────
#  Chat Message
# ──────────────────────────────────────────────
class MessageSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    user_id = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = Message
        fields = ['id', 'user_id', 'username', 'text', 'created_at']
        read_only_fields = ['id', 'user_id', 'username', 'created_at']


# ──────────────────────────────────────────────
#  Purchase History
# ──────────────────────────────────────────────
class PurchaseHistorySerializer(serializers.ModelSerializer):
    room_code = serializers.ReadOnlyField(source='room.room_code')
    room_name = serializers.ReadOnlyField(source='room.name')
    product_id = serializers.ReadOnlyField(source='product.id')

    class Meta:
        model = PurchaseHistory
        fields = [
            'id', 'product_id', 'product_name', 'product_image',
            'seller_name', 'quantity', 'price_paid', 'line_total',
            'room_code', 'room_name', 'purchased_at',
        ]
        read_only_fields = fields

