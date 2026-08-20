from django.contrib import admin
from .models import Payment, PaymentProof

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'master_order', 'method', 'status', 'updated_at')
    list_filter = ('method', 'status')