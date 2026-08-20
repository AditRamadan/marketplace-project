from django.contrib import admin
from .models import MasterOrder, SellerOrder, OrderItem, Shipping

@admin.register(MasterOrder)
class MasterOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'buyer', 'total_amount', 'status', 'created_at')

@admin.register(SellerOrder)
class SellerOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'master_order', 'seller', 'subtotal', 'status', 'created_at')
    list_filter = ('status',)

admin.site.register(OrderItem)
admin.site.register(Shipping)