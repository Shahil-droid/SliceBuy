from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Register the custom User model with the admin site."""
    list_display = ['username', 'email', 'is_seller', 'is_staff']
    list_filter = ['is_seller', 'is_staff', 'is_superuser']
    fieldsets = UserAdmin.fieldsets + (
        ('Marketplace', {'fields': ('is_seller', 'phone')}),
    )
