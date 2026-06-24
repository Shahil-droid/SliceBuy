import uuid
import threading
import logging
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class OrderRoom(models.Model):
    """
    A collaborative order room where multiple users can add products
    and split payments using either Individual or Equal split mode.
    """

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'                         # Members can join & add items
        LOCKED = 'locked', 'Locked'                    # No more changes, awaiting payments
        PAYMENT_PENDING = 'payment_pending', 'Payment Pending'  # Payments in progress
        CONFIRMED = 'confirmed', 'Confirmed'           # All payments done → order confirmed
        CANCELLED = 'cancelled', 'Cancelled'           # Deadline expired / manually cancelled
        EXPIRED = 'expired', 'Expired'                 # Payment deadline passed

    class SplitMode(models.TextChoices):
        INDIVIDUAL = 'individual', 'Individual Split'  # Each pays for own items + proportional delivery
        EQUAL = 'equal', 'Equal Split'                 # Total split equally among members

    room_code = models.CharField(max_length=8, unique=True, editable=False)
    name = models.CharField(max_length=200)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_rooms',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='RoomMember',
        related_name='joined_rooms',
    )
    split_mode = models.CharField(
        max_length=20,
        choices=SplitMode.choices,
        default=SplitMode.INDIVIDUAL,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    is_private = models.BooleanField(default=False)
    room_password = models.CharField(max_length=100, blank=True, default='')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_address = models.TextField(blank=True, default='')  # JSON string set by room creator
    payment_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.room_code:
            self.room_code = uuid.uuid4().hex[:8].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Room {self.room_code}: {self.name}"

    # ── Computed Properties ──────────────────────────────────
    @property
    def total_items_cost(self):
        """Sum of all order items (price × quantity)."""
        return sum(
            item.line_total for item in self.items.all()
        )

    @property
    def total_order_value(self):
        """Items cost + delivery fee."""
        return self.total_items_cost + self.delivery_fee

    @property
    def member_count(self):
        return self.room_members.count()

    @property
    def is_deadline_expired(self):
        if self.payment_deadline:
            return timezone.now() > self.payment_deadline
        return False

    def lock_room(self, deadline_hours=24):
        """Lock the room and set a payment deadline."""
        self.status = self.Status.LOCKED
        self.payment_deadline = timezone.now() + timedelta(hours=deadline_hours)
        self.save()
        # Reserve stock for all items
        for item in self.items.all():
            item.reserve_stock()

    def check_all_payments_complete(self):
        """Check if every member has paid. If so, confirm the order."""
        all_paid = all(
            m.payment_status == RoomMember.PaymentStatus.PAID
            for m in self.room_members.all()
        )
        if all_paid:
            self.status = self.Status.CONFIRMED
            self.save()
            self._generate_sub_orders()
            return True
        return False

    def cancel_room(self):
        """Cancel the room: release stock, mark as cancelled. Auto-deletes after 30 seconds."""
        self.status = self.Status.CANCELLED
        self.save()
        for item in self.items.all():
            item.release_stock()
        # Schedule auto-deletion after 30 seconds
        self._schedule_deletion()

    def _schedule_deletion(self):
        """Schedule this room for deletion 30 seconds after cancellation."""
        room_id = self.pk
        room_code = self.room_code

        def delete_cancelled_room():
            from django.db import connection
            try:
                room = OrderRoom.objects.filter(
                    pk=room_id, status=OrderRoom.Status.CANCELLED
                ).first()
                if room:
                    room.delete()
                    logger.info(f'Auto-deleted cancelled room {room_code} after 30s.')
            except Exception as e:
                logger.error(f'Failed to auto-delete room {room_code}: {e}')
            finally:
                connection.close()

        timer = threading.Timer(30.0, delete_cancelled_room)
        timer.daemon = True
        timer.start()
        logger.info(f'Scheduled deletion of cancelled room {room_code} in 30 seconds.')

    def expire_room(self):
        """Handle deadline expiration."""
        self.status = self.Status.EXPIRED
        self.save()
        for item in self.items.all():
            item.release_stock()
        # Mark unpaid members
        for member in self.room_members.filter(
            payment_status=RoomMember.PaymentStatus.PENDING
        ):
            member.payment_status = RoomMember.PaymentStatus.FAILED
            member.save()

    def _generate_sub_orders(self):
        """Create seller-specific sub-orders after confirmation."""
        from collections import defaultdict
        seller_items = defaultdict(list)

        for item in self.items.select_related('product__seller').all():
            seller_items[item.product.seller_id].append(item)

        for seller_id, items in seller_items.items():
            sub_total = sum(i.line_total for i in items)
            commission_rate = 5  # 5% platform commission
            commission_amount = sub_total * commission_rate / 100

            sub_order = SubOrder.objects.create(
                room=self,
                seller_id=seller_id,
                sub_total=sub_total,
                commission_rate=commission_rate,
                commission_amount=commission_amount,
                net_amount=sub_total - commission_amount,
            )
            for item in items:
                item.sub_order = sub_order
                item.save()

        # Generate purchase history for the room creator
        self._generate_purchase_history()

    def _generate_purchase_history(self):
        """Create PurchaseHistory entries for the room creator."""
        for item in self.items.select_related('product').all():
            PurchaseHistory.objects.create(
                user=self.creator,
                room=self,
                product=item.product,
                product_name=item.product.name,
                product_image=item.product.image.name if item.product.image else '',
                seller_name=item.product.seller.username if item.product.seller else '',
                quantity=item.quantity,
                price_paid=item.price_at_addition,
                line_total=item.line_total,
            )


class RoomMember(models.Model):
    """
    Through-model for OrderRoom ↔ User relationship.
    Tracks each member's payment status and amount owed.
    """

    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    room = models.ForeignKey(OrderRoom, on_delete=models.CASCADE, related_name='room_members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='room_memberships')
    amount_owed = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    payment_id = models.CharField(max_length=100, blank=True, null=True)  # Razorpay payment ID
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['room', 'user']
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.room.room_code}"


class OrderItem(models.Model):
    """
    A product added to an order room by a specific member.
    Tracks which member added it (important for individual split).
    """
    room = models.ForeignKey(OrderRoom, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='order_items')
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='added_items')
    quantity = models.PositiveIntegerField(default=1)
    price_at_addition = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot of price
    stock_reserved = models.BooleanField(default=False)
    sub_order = models.ForeignKey('SubOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['added_at']

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in {self.room.room_code}"

    @property
    def line_total(self):
        return self.price_at_addition * self.quantity

    def reserve_stock(self):
        """Reserve stock on the product when room is locked."""
        if not self.stock_reserved:
            self.product.stock -= self.quantity
            self.product.save()
            self.stock_reserved = True
            self.save()

    def release_stock(self):
        """Release reserved stock (on cancellation/expiration)."""
        if self.stock_reserved:
            self.product.stock += self.quantity
            self.product.save()
            self.stock_reserved = False
            self.save()


class SubOrder(models.Model):
    """
    A seller-specific sub-order generated after a room is confirmed.
    Fragments the main order into per-seller fulfillment units.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'

    room = models.ForeignKey(OrderRoom, on_delete=models.CASCADE, related_name='sub_orders')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sub_orders')
    sub_total = models.DecimalField(max_digits=10, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)  # sub_total - commission
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"SubOrder #{self.id} — Seller {self.seller.username} (Room {self.room.room_code})"


class Payment(models.Model):
    """
    Records each member's payment attempt/result.
    Integrates with Razorpay (test mode).
    """

    class Status(models.TextChoices):
        INITIATED = 'initiated', 'Initiated'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    room = models.ForeignKey(OrderRoom, on_delete=models.CASCADE, related_name='payments')
    member = models.ForeignKey(RoomMember, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=256, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INITIATED,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} — {self.member.user.username} — ₹{self.amount}"


class Message(models.Model):
    """Chat message within an order room."""
    room = models.ForeignKey(OrderRoom, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username}: {self.text[:50]}"


class PurchaseHistory(models.Model):
    """
    Tracks completed purchases per user.
    Created automatically when a room is confirmed.
    All items are attributed to the room creator.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purchase_history',
    )
    room = models.ForeignKey(
        OrderRoom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_records',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_records',
    )
    # Snapshots (preserved even if product is deleted)
    product_name = models.CharField(max_length=255)
    product_image = models.CharField(max_length=500, blank=True)
    seller_name = models.CharField(max_length=150, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price_paid = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-purchased_at']
        verbose_name_plural = 'Purchase histories'

    def __str__(self):
        return f"{self.user.username} — {self.product_name} x{self.quantity}"

