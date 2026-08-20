from django.contrib import admin
from .models import User, SellerProfile

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'username', 'role', 'is_seller', 'is_staff')
    list_filter = ('role', 'is_seller')
    search_fields = ('email', 'username')

@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'store_name', 'user', 'is_active', 'created_at')