from rest_framework import serializers
from .models import Product, Review


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Review
        fields = [
            'id', 'user', 'username', 'rating',
            'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'username', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


class ProductSerializer(serializers.ModelSerializer):
    seller_username = serializers.ReadOnlyField(source='seller.username')
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'seller', 'seller_username',
            'name', 'description', 'price', 'stock', 'image',
            'average_rating', 'review_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'seller', 'seller_username',
            'average_rating', 'review_count',
            'created_at', 'updated_at',
        ]
