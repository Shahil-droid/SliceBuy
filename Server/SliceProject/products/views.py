from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F, Avg

from .models import Product, Review
from .serializers import ProductSerializer, ReviewSerializer


class IsSellerOrReadOnly(permissions.BasePermission):
    """
    • Anyone (including unauthenticated users) can list / retrieve.
    • Only authenticated users with is_seller=True can create.
    • Only the product's own seller can update / delete.
    """

    def has_permission(self, request, view):
        # Safe methods (GET, HEAD, OPTIONS) → allow everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write methods require authentication + is_seller
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_seller
        )

    def has_object_permission(self, request, view, obj):
        # Safe methods → allow everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        # Update / delete → only the seller who owns the product
        return obj.seller == request.user


class ProductViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for listing, retrieving, creating, updating, and
    deleting products in the SliceBuy marketplace.

    GET    /api/products/                     → list   (anyone)
    GET    /api/products/{id}/                → detail (anyone)
    POST   /api/products/                     → create (sellers only)
    PUT    /api/products/{id}/                → update (owner only)
    PATCH  /api/products/{id}/                → partial update (owner only)
    DELETE /api/products/{id}/                → delete (owner only)

    Reviews (nested under each product):
    GET    /api/products/{id}/reviews/        → list reviews (anyone)
    POST   /api/products/{id}/reviews/        → add review   (authenticated, non-seller-of-product)
    PUT    /api/products/{id}/reviews/{r_id}/ → update own review
    DELETE /api/products/{id}/reviews/{r_id}/ → delete own review
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsSellerOrReadOnly]

    def perform_create(self, serializer):
        """Automatically set the seller to the requesting user."""
        serializer.save(seller=self.request.user)

    def get_queryset(self):
        """
        For unsafe methods (PUT, PATCH, DELETE) restrict the queryset
        to products owned by the requesting user so that sellers can
        only modify their own products.
        """
        qs = Product.objects.all()
        if self.action in ('update', 'partial_update', 'destroy'):
            qs = qs.filter(seller=self.request.user)
        return qs

    # ── List Reviews ─────────────────────────────────────────
    @action(detail=True, methods=['get', 'post'], url_path='reviews',
            permission_classes=[permissions.AllowAny])
    def reviews(self, request, pk=None):
        """
        GET  → list all reviews for this product.
        POST → add a review (authenticated users only, one per product).
        """
        product = self.get_object()

        if request.method == 'GET':
            qs = product.reviews.select_related('user').all()
            serializer = ReviewSerializer(qs, many=True)
            return Response({
                'average_rating': product.average_rating,
                'review_count': product.review_count,
                'reviews': serializer.data,
            })

        # POST — create a review
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'error': 'You must be logged in to leave a review.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Seller cannot review own product
        if product.seller == request.user:
            return Response(
                {'error': 'You cannot review your own product.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check for existing review
        if Review.objects.filter(product=product, user=request.user).exists():
            return Response(
                {'error': 'You have already reviewed this product. You can edit your existing review.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product, user=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # ── Update / Delete a single Review ──────────────────────
    @action(detail=True, methods=['put', 'patch', 'delete'],
            url_path='reviews/(?P<review_id>[0-9]+)',
            permission_classes=[permissions.IsAuthenticated])
    def review_detail(self, request, pk=None, review_id=None):
        """
        PUT/PATCH → update your own review.
        DELETE    → delete your own review.
        """
        product = self.get_object()

        try:
            review = Review.objects.get(pk=review_id, product=product)
        except Review.DoesNotExist:
            return Response(
                {'error': 'Review not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only the author can modify/delete
        if review.user != request.user:
            return Response(
                {'error': 'You can only edit or delete your own review.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.method == 'DELETE':
            review.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PUT / PATCH
        partial = request.method == 'PATCH'
        serializer = ReviewSerializer(review, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SellerDashboardView(APIView):
    """
    GET /api/products/dashboard/
    Returns seller-specific aggregated stats and data.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_seller:
            return Response(
                {'error': 'Only sellers can access the dashboard.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from orders.models import SubOrder, OrderItem

        user = request.user

        # Products
        products = Product.objects.filter(seller=user)
        product_count = products.count()
        total_stock = products.aggregate(s=Sum('stock'))['s'] or 0
        low_stock = products.filter(stock__gt=0, stock__lte=5).count()
        out_of_stock = products.filter(stock=0).count()

        # Sub-orders & revenue
        sub_orders = SubOrder.objects.filter(seller=user)
        total_orders = sub_orders.count()
        revenue = sub_orders.aggregate(r=Sum('sub_total'))['r'] or 0
        commission_paid = sub_orders.aggregate(c=Sum('commission_amount'))['c'] or 0
        net_earnings = sub_orders.aggregate(n=Sum('net_amount'))['n'] or 0

        # Recent sub-orders with items
        recent_sub_orders = []
        for so in sub_orders.select_related('room').order_by('-created_at')[:10]:
            items = OrderItem.objects.filter(sub_order=so).select_related('product')
            recent_sub_orders.append({
                'id': so.id,
                'room_code': so.room.room_code,
                'room_name': so.room.name,
                'status': so.status,
                'sub_total': str(so.sub_total),
                'commission_amount': str(so.commission_amount),
                'net_amount': str(so.net_amount),
                'created_at': so.created_at.isoformat(),
                'items': [
                    {
                        'product_name': item.product.name,
                        'quantity': item.quantity,
                        'price': str(item.price_at_addition),
                        'line_total': str(item.line_total),
                    }
                    for item in items
                ],
            })

        # Product list (for management)
        products_data = ProductSerializer(products, many=True).data

        return Response({
            'stats': {
                'product_count': product_count,
                'total_stock': total_stock,
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
                'total_orders': total_orders,
                'revenue': str(revenue),
                'commission_paid': str(commission_paid),
                'net_earnings': str(net_earnings),
            },
            'recent_sub_orders': recent_sub_orders,
            'products': products_data,
        })
