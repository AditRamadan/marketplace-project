from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, SellerProfile

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        username = request.data.get('username', email.split('@')[0])

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email sudah terdaftar'}, status=400)

        user = User.objects.create_user(username=username, email=email, password=password)
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {'id': user.id, 'email': user.email, 'is_seller': user.is_seller}
        }, status=210)

class ActivateSellerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        store_name = request.data.get('store_name')
        if not store_name:
            return Response({'error': 'Nama toko wajib diisi'}, status=400)

        user = request.user
        user.is_seller = True
        user.save()

        SellerProfile.objects.get_or_create(user=user, defaults={'store_name': store_name})
        return Response({'message': 'Akses Seller berhasil diaktifkan'})