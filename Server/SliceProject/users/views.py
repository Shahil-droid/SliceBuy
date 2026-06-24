from rest_framework import status, permissions, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    AdminUserSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()


class UserViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    A ViewSet for user-related operations.

    GET    /api/users/              -> list users  (authenticated)
    GET    /api/users/{id}/         -> user detail  (authenticated)
    POST   /api/users/register/     -> create a new user (anyone)
    GET    /api/users/me/           -> current user profile (authenticated)
    POST   /api/users/password-reset/         -> request password reset (anyone)
    POST   /api/users/password-reset-confirm/ -> confirm password reset (anyone)
    GET    /api/users/admin/users/            -> list all users (admin only)
    DELETE /api/users/admin/users/<id>/       -> delete a user  (admin only)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        """
        Open endpoints (register, password-reset) -> AllowAny.
        Admin endpoints -> IsAdminUser (is_staff).
        Everything else -> IsAuthenticated.
        """
        if self.action in ('register', 'password_reset', 'password_reset_confirm'):
            return [permissions.AllowAny()]
        if self.action in ('admin_list_users', 'admin_delete_user'):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    # -- Registration -----------------------------------------
    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """
        POST /api/users/register/
        Creates a new user and returns JWT tokens.
        """
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'message': 'User registered successfully.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )

    # -- Current User Profile ---------------------------------
    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        GET /api/users/me/
        Returns the authenticated user's profile data (includes is_staff).
        """
        serializer = UserSerializer(request.user)
        data = serializer.data
        data['is_staff'] = request.user.is_staff
        return Response(data)

    # -- Password Reset Step 1 --------------------------------
    @action(detail=False, methods=['post'], url_path='password-reset')
    def password_reset(self, request):
        """
        POST /api/users/password-reset/
        Accepts { "email": "..." } and sends a password-reset email.
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'message': 'If an account with that email exists, a reset link has been sent.'},
            status=status.HTTP_200_OK,
        )

    # -- Password Reset Step 2 --------------------------------
    @action(detail=False, methods=['post'], url_path='password-reset-confirm')
    def password_reset_confirm(self, request):
        """
        POST /api/users/password-reset-confirm/
        Accepts { "uidb64": "...", "token": "...", "new_password": "..." }
        and updates the user's password after verifying the token.
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'message': 'Password has been reset successfully.'},
            status=status.HTTP_200_OK,
        )

    # -- Admin: List All Users --------------------------------
    @action(detail=False, methods=['get'], url_path='admin/users')
    def admin_list_users(self, request):
        """
        GET /api/users/admin/users/
        Returns all users with admin-level detail. Staff only.
        """
        users = User.objects.all().order_by('-date_joined')
        serializer = AdminUserSerializer(users, many=True)
        return Response(serializer.data)

    # -- Admin: Delete a User ---------------------------------
    @action(detail=False, methods=['delete'], url_path=r'admin/users/(?P<user_id>\d+)')
    def admin_delete_user(self, request, user_id=None):
        """
        DELETE /api/users/admin/users/<id>/
        Deletes a user account. Cannot delete superusers. Staff only.
        """
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target.is_superuser:
            return Response(
                {'error': 'Cannot delete a superuser account.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if target.pk == request.user.pk:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = target.username
        target.delete()
        return Response(
            {'message': f'User "{username}" has been deleted.'},
            status=status.HTTP_200_OK,
        )
