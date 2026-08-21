from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer, SellerProfileSerializer
from activity.models import ActivityLog

from rest_framework.views import APIView
from accounts.models import SellerProfile

class PublicStoreDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, seller_id):
        try:
            profile = SellerProfile.objects.get(user_id=seller_id)
            store_data = SellerProfileSerializer(profile).data
        except SellerProfile.DoesNotExist:
            store_data = {
                "id": None,
                "store_name": f"Toko Seller #{seller_id}",
                "store_description": "Deskripsi toko belum diisi."
            }

        # Mengambil semua produk milik seller tersebut
        products = Product.objects.filter(seller_id=seller_id).order_by('-created_at')
        products_data = ProductSerializer(products, many=True).data

        return Response({
            "store": store_data,
            "products": products_data
        })

# API List Kategori Produk (Read-Only)
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

# API Khusus Seller untuk melihat & mengelola Produk Miliknya
class SellerProductListView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Mengambil seluruh produk (termasuk non-aktif) milik seller yang sedang login
        return Product.objects.filter(seller=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        if not self.request.user.is_seller:
            raise PermissionDenied("Hanya Seller yang dapat menambah produk.")
        serializer.save(seller=self.request.user)

class ProductListCreateView(generics.ListCreateAPIView):
    # Ubah dari Product.objects.filter(is_active=True) menjadi Product.objects.all()
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        if not self.request.user.is_seller:
            raise PermissionDenied("Hanya Seller yang dapat menambah produk.")
        serializer.save(seller=self.request.user, is_active=True)

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            ActivityLog.objects.create(user=request.user, event=ActivityLog.Event.VIEW_PRODUCT, details={'product_id': instance.id})
        
        data = self.get_serializer(instance).data
        data['is_mine'] = (request.user == instance.seller)
        return Response(data)

    def perform_update(self, serializer):
        if self.get_object().seller != self.request.user:
            raise PermissionDenied("Anda hanya bisa mengedit produk milik sendiri.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.seller != self.request.user:
            raise PermissionDenied("Anda hanya bisa menghapus produk milik sendiri.")
        instance.delete()