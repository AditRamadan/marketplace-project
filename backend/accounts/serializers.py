from rest_framework import serializers
from .models import User, SellerProfile
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    seller_profile = SellerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'role', 'is_seller', 'seller_profile')

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Menambahkan object user lengkap ke response login
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'username': self.user.username,
            'role': self.user.role,
            'is_seller': self.user.is_seller, # <-- PASTI DILAMPIRKAN
        }
        return data