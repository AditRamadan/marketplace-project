from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from activity.models import ActivityLog

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        if not self.request.user.is_seller:
            raise PermissionDenied("Hanya Seller yang dapat menambah produk.")
        serializer.save(seller=self.request.user)

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Catat behavior VIEW_PRODUCT (PRD Requirement)
        if request.user.is_authenticated:
            ActivityLog.objects.create(user=request.user, event=ActivityLog.Event.VIEW_PRODUCT, details={'product_id': instance.id})
        
        data = self.get_serializer(instance).data
        # Aturan BR-03: Tandai apakah produk ini milik user yang sedang login
        data['is_mine'] = (request.user == instance.seller)
        return Response(data)

    def perform_update(self, serializer):
        if self.get_object().seller != self.request.user:
            raise PermissionDenied("Anda hanya bisa mengedit produk milik sendiri.")
        serializer.save()