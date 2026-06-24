from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model for SliceBuy.
    Extends Django's AbstractUser with marketplace-specific fields.
    """
    email = models.EmailField(unique=True)
    is_seller = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.username
