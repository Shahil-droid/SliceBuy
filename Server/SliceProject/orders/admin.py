from django.contrib import admin
from .models import OrderRoom, RoomMember, OrderItem, SubOrder, Payment


class RoomMemberInline(admin.TabularInline):
    model = RoomMember
    extra = 0
    readonly_fields = ['user', 'amount_owed', 'payment_status', 'joined_at']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'added_by', 'quantity', 'price_at_addition', 'stock_reserved']


@admin.register(OrderRoom)
class OrderRoomAdmin(admin.ModelAdmin):
    list_display = ['room_code', 'name', 'creator', 'status', 'split_mode', 'member_count', 'created_at']
    list_filter = ['status', 'split_mode']
    search_fields = ['room_code', 'name']
    inlines = [RoomMemberInline, OrderItemInline]


@admin.register(SubOrder)
class SubOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'seller', 'sub_total', 'commission_amount', 'net_amount', 'status']
    list_filter = ['status']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'member', 'amount', 'status', 'created_at']
    list_filter = ['status']
