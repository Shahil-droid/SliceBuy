from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.cache import cache
import random

User = get_user_model()


# ──────────────────────────────────────────────
#  Admin — Full User Details
# ──────────────────────────────────────────────
class AdminUserSerializer(serializers.ModelSerializer):
    """Read-only serializer exposing admin-relevant fields."""
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone',
            'is_seller', 'is_staff', 'is_superuser', 'is_active',
            'date_joined', 'last_login',
        ]
        read_only_fields = fields


# ──────────────────────────────────────────────
#  Registration
# ──────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'is_seller', 'phone']
        read_only_fields = ['id']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            is_seller=validated_data.get('is_seller', False),
            phone=validated_data.get('phone', ''),
        )
        return user


# ──────────────────────────────────────────────
#  Forgot Password — Step 1: Send OTP
# ──────────────────────────────────────────────
OTP_TTL = 600  # 10 minutes

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

    def save(self, **kwargs):
        email = self.validated_data['email']
        user = User.objects.get(email=email)

        # Generate a 6-digit OTP and cache it against the email
        otp = f"{random.randint(100000, 999999)}"
        cache_key = f"pwd_reset_otp_{email}"
        cache.set(cache_key, otp, timeout=OTP_TTL)

        subject = 'SliceBuy — Your Password Reset OTP'
        message = (
            f"Hi {user.username},\n\n"
            f"Your password reset OTP is: {otp}\n\n"
            f"This code expires in 10 minutes.\n"
            f"If you didn't request this, you can safely ignore this email.\n\n"
            f"— The SliceBuy Team"
        )
        html_message = (
            f'<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;'
            f'background:#0a0f1e;color:#f1f5f9;border-radius:16px;">'
            f'<h2 style="color:#a29bfe;margin-bottom:8px;">Slice<span style="color:#55efc4;">Buy</span></h2>'
            f'<p style="color:#94a3b8;margin-bottom:24px;">Password Reset OTP</p>'
            f'<p>Hi <strong>{user.username}</strong>,</p>'
            f'<p>Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>'
            f'<div style="text-align:center;margin:32px 0;">'
            f'<div style="display:inline-block;padding:20px 48px;'
            f'background:linear-gradient(135deg,#6c5ce7,#a29bfe);'
            f'border-radius:16px;letter-spacing:12px;'
            f'font-size:32px;font-weight:900;color:#fff;">{otp}</div>'
            f'</div>'
            f'<p style="color:#64748b;font-size:13px;">If you didn\'t request this, you can safely ignore this email.</p>'
            f'<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">'
            f'<p style="color:#64748b;font-size:12px;">— The SliceBuy Team</p>'
            f'</div>'
        )

        from django.core.mail import send_mail
        send_mail(
            subject=subject,
            message=message,
            from_email=None,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )

        print(f"  ✅ OTP sent to {email}")
        print(f"  🔑 OTP: {otp}")

        return {'email': email}


# ──────────────────────────────────────────────
#  Forgot Password — Step 2: Verify OTP & Reset
# ──────────────────────────────────────────────
class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        email = attrs['email']
        otp = attrs['otp']

        cache_key = f"pwd_reset_otp_{email}"
        cached_otp = cache.get(cache_key)

        if cached_otp is None:
            raise serializers.ValidationError("OTP has expired. Please request a new one.")

        if cached_otp != otp:
            raise serializers.ValidationError("Invalid OTP. Please check and try again.")

        try:
            attrs['user'] = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        return attrs

    def save(self, **kwargs):
        user = self.validated_data['user']
        email = self.validated_data['email']
        user.set_password(self.validated_data['new_password'])
        user.save()
        cache.delete(f"pwd_reset_otp_{email}")
        return user
