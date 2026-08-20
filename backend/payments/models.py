from django.db import models
from orders.models import MasterOrder

class Payment(models.Model):
    class Method(models.TextChoices):
        MIDTRANS = 'MIDTRANS', 'Payment Gateway'
        MANUAL = 'MANUAL', 'Transfer Manual'
        COD = 'COD', 'Cash On Delivery'

    class Status(models.TextChoices):
        WAITING = 'WAITING', 'Waiting'
        REVIEW = 'REVIEW', 'Review'
        PAID = 'PAID', 'Paid'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'

    master_order = models.OneToOneField(MasterOrder, on_delete=models.CASCADE, related_name='payment')
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    snap_token = models.CharField(max_length=255, blank=True, null=True)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

class PaymentProof(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='proofs')
    image = models.ImageField(upload_to='payment_proofs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)