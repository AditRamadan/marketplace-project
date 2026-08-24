from rest_framework import serializers
from .models import Cart, CartItem, MasterOrder, SellerOrder, OrderItem, Shipping
from payments.models import Payment, PaymentProof
from products.serializers import ProductSerializer

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = '__all__'

class PaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProof
        fields = ['id', 'image', 'uploaded_at']

class PaymentSerializer(serializers.ModelSerializer):
    proofs = PaymentProofSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'method', 'status', 'snap_token', 'proofs']

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'price', 'quantity']

class SellerOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    store_name = serializers.SerializerMethodField()

    class Meta:
        model = SellerOrder
        fields = ['id', 'seller', 'seller_name', 'store_name', 'subtotal', 'status', 'created_at', 'items']

    def get_store_name(self, obj):
        if hasattr(obj.seller, 'seller_profile'):
            return obj.seller.seller_profile.store_name
        return obj.seller.username

class MasterOrderSerializer(serializers.ModelSerializer):
    seller_orders = SellerOrderSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model = MasterOrder
        fields = ['id', 'buyer', 'total_amount', 'status', 'created_at', 'seller_orders', 'payment']