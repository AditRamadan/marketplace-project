from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, SellerProfile
from .serializers import UserSerializer
from google.oauth2 import id_token
from google.auth.transport import requests

# Custom Serializer Login agar mengembalikan data User lengkap (termasuk is_seller)
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Menggunakan UserSerializer untuk serialize data user secara lengkap
        data['user'] = UserSerializer(self.user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

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
        return Response({'message': 'Akses Seller berhasil diaktifkan', 'user': UserSerializer(user).data})

class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token tidak ditemukan'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_info = id_token.verify_oauth2_token(token, requests.Request())

            email = id_info.get('email')
            first_name = id_info.get('given_name', '')
            last_name = id_info.get('family_name', '')
            username = email.split('@')[0]

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'first_name': first_name,
                    'last_name': last_name,
                }
            )

            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data  # <-- Mengembalikan seluruh field (is_seller, role, seller_profile)
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Token Google tidak valid'}, status=status.HTTP_400_BAD_REQUEST)