from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import OrderRoomViewSet, JoinRoomByCodeView, PurchaseHistoryView, DirectCheckoutView

router = DefaultRouter()
router.register(r'rooms', OrderRoomViewSet, basename='orderroom')

urlpatterns = [
    path('', include(router.urls)),
    path('join/', JoinRoomByCodeView.as_view(), name='join_room_by_code'),
    path('purchase-history/', PurchaseHistoryView.as_view(), name='purchase_history'),
    path('direct-checkout/<str:action>/', DirectCheckoutView.as_view(), name='direct_checkout'),
]

