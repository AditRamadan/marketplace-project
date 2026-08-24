from rest_framework import serializers
from .models import User, SellerProfile

class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    seller_profile = SellerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'role', 'is_seller', 'seller_profile')

