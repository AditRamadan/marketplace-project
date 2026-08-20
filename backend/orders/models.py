from django.db import models
from accounts.models import User
from products.models import Product

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

class MasterOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        CANCELLED = 'CANCELLED', 'Cancelled'

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='master_orders')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

class SellerOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        RESERVED = 'RESERVED', 'Reserved'
        WAITING_PAYMENT = 'WAITING_PAYMENT', 'Waiting Payment'
        PAYMENT_REVIEW = 'PAYMENT_REVIEW', 'Payment Review'
        PAID = 'PAID', 'Paid'
        PROCESSING = 'PROCESSING', 'Processing'
        SHIPPED = 'SHIPPED', 'Shipped'
        DELIVERED = 'DELIVERED', 'Delivered'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        EXPIRED = 'EXPIRED', 'Expired'

    master_order = models.ForeignKey(MasterOrder, on_delete=models.CASCADE, related_name='seller_orders')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seller_orders')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

class OrderItem(models.Model):
    seller_order = models.ForeignKey(SellerOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()

class StockReservation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    reserved_until = models.DateTimeField()
    is_released = models.BooleanField(default=False)

class Shipping(models.Model):
    seller_order = models.OneToOneField(SellerOrder, on_delete=models.CASCADE, related_name='shipping')
    courier = models.CharField(max_length=100)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=50, default='PENDING')