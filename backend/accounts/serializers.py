from rest_framework import serializers
from .models import User, SellerProfile, StoreApplication

class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    seller_profile = SellerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'role', 'is_seller', 'seller_profile')

class StoreApplicationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = StoreApplication
        fields = [
            'id', 'user', 'user_email', 'user_name', 
            'store_name', 'store_description', 'phone_number', 
            'status', 'rejection_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'rejection_reason']
