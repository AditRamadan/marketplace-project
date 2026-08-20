from rest_framework import serializers
from .models import Cart, CartItem, MasterOrder, SellerOrder, OrderItem, Shipping
from products.serializers import ProductSerializer

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = '__all__'

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'

class SellerOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = SellerOrder
        fields = '__all__'

class MasterOrderSerializer(serializers.ModelSerializer):
    seller_orders = SellerOrderSerializer(many=True, read_only=True)

    class Meta:
        model = MasterOrder
        fields = '__all__'