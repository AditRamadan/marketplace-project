from django.db import models
from accounts.models import User

class ActivityLog(models.Model):
    class Event(models.TextChoices):
        LOGIN = 'LOGIN', 'Login'
        VIEW_PRODUCT = 'VIEW_PRODUCT', 'View Product'
        ADD_TO_CART = 'ADD_TO_CART', 'Add To Cart'
        CHECKOUT = 'CHECKOUT', 'Checkout'
        PAYMENT_SUCCESS = 'PAYMENT_SUCCESS', 'Payment Success'
        ORDER_COMPLETED = 'ORDER_COMPLETED', 'Order Completed'

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    event = models.CharField(max_length=30, choices=Event.choices)
    details = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)