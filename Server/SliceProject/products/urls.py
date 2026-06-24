from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, SellerDashboardView

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('dashboard/', SellerDashboardView.as_view(), name='seller-dashboard'),
    path('', include(router.urls)),
]
