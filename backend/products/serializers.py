from rest_framework import serializers
from .models import Product, Category
from accounts.models import SellerProfile

class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = ['id', 'store_name', 'store_description', 'created_at']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source='category', read_only=True)
    # PERBAIKAN: Menggunakan SerializerMethodField()
    seller_profile = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('seller',)

    def get_seller_profile(self, obj):
        profile = getattr(obj.seller, 'seller_profile', None)
        if profile:
            return SellerProfileSerializer(profile).data
        return {
            "id": None,
            "store_name": obj.seller.username or obj.seller.email,
            "store_description": "Toko Belum Diatur",
            "created_at": getattr(obj.seller, 'date_joined', None)
        }