from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, SellerProfile, StoreApplication
from .serializers import UserSerializer, StoreApplicationSerializer
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

class IsAdminUserPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == User.Role.ADMIN or request.user.is_superuser)


# BUYER: Mengajukan Buka Toko & Cek Status Pengajuan
class ApplyStoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Ambil daftar pengajuan user yang sedang login
        applications = StoreApplication.objects.filter(user=request.user).order_by('-created_at')
        serializer = StoreApplicationSerializer(applications, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.is_seller:
            return Response({'error': 'Anda sudah menjadi Seller'}, status=status.HTTP_400_BAD_REQUEST)

        # Cek apakah ada pengajuan PENDING
        if StoreApplication.objects.filter(user=request.user, status=StoreApplication.Status.PENDING).exists():
            return Response({'error': 'Anda memiliki pengajuan toko yang sedang diproses.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = StoreApplicationSerializer(data=request.data)
        if serializer.is_valid():
            pass
        
        store_name = request.data.get('store_name')
        store_description = request.data.get('store_description', '')
        phone_number = request.data.get('phone_number', '')

        if not store_name:
            return Response({'error': 'Nama toko wajib diisi'}, status=status.HTTP_400_BAD_REQUEST)

        application = StoreApplication.objects.create(
            user=request.user,
            store_name=store_name,
            store_description=store_description,
            phone_number=phone_number
        )

        return Response(StoreApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


# ADMIN: Menampilkan Daftar Pengajuan & Melakukan Approve/Reject
class AdminStoreApplicationsView(APIView):
    permission_classes = [IsAdminUserPermission]

    def get(self, request):
        status_filter = request.query_params.get('status')
        applications = StoreApplication.objects.all().order_by('-created_at')
        if status_filter:
            applications = applications.filter(status=status_filter)
        
        serializer = StoreApplicationSerializer(applications, many=True)
        return Response(serializer.data)


class AdminReviewStoreApplicationView(APIView):
    permission_classes = [IsAdminUserPermission]

    def post(self, request, application_id):
        action = request.data.get('action') # 'APPROVE' atau 'REJECT'
        rejection_reason = request.data.get('rejection_reason', '')

        try:
            app = StoreApplication.objects.get(id=application_id)
        except StoreApplication.DoesNotExist:
            return Response({'error': 'Pengajuan tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        if app.status != StoreApplication.Status.PENDING:
            return Response({'error': 'Pengajuan ini sudah diproses sebelumnya'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'APPROVE':
            app.status = StoreApplication.Status.APPROVED
            app.save()

            # Aktifkan Seller status & buat SellerProfile
            user = app.user
            user.is_seller = True
            user.save()

            SellerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'store_name': app.store_name,
                    'store_description': app.store_description
                }
            )

            return Response({
                'message': f'Pengajuan toko "{app.store_name}" disetujui.',
                'application': StoreApplicationSerializer(app).data
            })

        elif action == 'REJECT':
            app.status = StoreApplication.Status.REJECTED
            app.rejection_reason = rejection_reason
            app.save()

            return Response({
                'message': f'Pengajuan toko "{app.store_name}" ditolak.',
                'application': StoreApplicationSerializer(app).data
            })

        return Response({'error': 'Aksi tidak valid (Gunakan APPROVE atau REJECT)'}, status=status.HTTP_400_BAD_REQUEST)