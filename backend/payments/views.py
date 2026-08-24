import base64
import hashlib
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from orders.models import MasterOrder, SellerOrder
from .models import Payment, PaymentProof

# payments/views.py
class CreatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, master_order_id):
        method = request.data.get('method')
        
        try:
            master_order = MasterOrder.objects.get(id=master_order_id, buyer=request.user)
        except MasterOrder.DoesNotExist:
            return Response({'error': 'Order tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        payment, _ = Payment.objects.get_or_create(
            master_order=master_order, 
            defaults={'method': method}
        )

        # 1. JIKA SUDAH PUNYA SNAP TOKEN, GUNAKAN TOKEN LAMA (TIDAK MINTA KE MIDTRANS LAGI)
        if method == Payment.Method.MIDTRANS and payment.snap_token:
            return Response({
                'snap_token': payment.snap_token,
                'payment_id': payment.id
            })

        payment.method = method
        payment.save()

        # 2. JIKA BELUM ADA TOKEN, MINTA TOKEN BARU KE MIDTRANS
        if method == Payment.Method.MIDTRANS:
            url = "https://app.sandbox.midtrans.com/snap/v1/transactions"
            
            auth_string = f"{settings.MIDTRANS_SERVER_KEY}:"
            encoded_auth = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')

            # Gunakan total_amount langsung dari MasterOrder (jangan ditambah ongkir lagi)
            gross_amt = int(master_order.total_amount)

            payload = {
                "transaction_details": {
                    "order_id": f"ORDER-{master_order.id}",
                    "gross_amount": gross_amt
                },
                "customer_details": {
                    "first_name": request.user.username,
                    "email": request.user.email or "buyer@example.com"
                }
            }
            
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Basic {encoded_auth}"
            }
            
            response = requests.post(url, json=payload, headers=headers)
            res_data = response.json()

            if response.status_code not in [200, 201]:
                return Response(
                    {'error': res_data.get('error_messages', ['Gagal terhubung ke Midtrans'])[0]}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            payment.snap_token = res_data.get('token')
            payment.save()

            return Response({
                'snap_token': payment.snap_token,
                'payment_id': payment.id
            })

        elif method == Payment.Method.COD:
            payment.status = Payment.Status.WAITING
            payment.save()
            master_order.seller_orders.update(status=SellerOrder.Status.PROCESSING)
            return Response({'message': 'Order COD berhasil dibuat', 'payment_id': payment.id})

        elif method == Payment.Method.MANUAL:
            payment.status = Payment.Status.WAITING
            payment.save()
            return Response({'message': 'Silakan lakukan transfer manual', 'payment_id': payment.id})

        return Response({'error': 'Metode pembayaran tidak valid'}, status=status.HTTP_400_BAD_REQUEST)

class MidtransWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        order_id_str = data.get('order_id')
        status_code = data.get('status_code')
        gross_amount = data.get('gross_amount')
        signature_key = data.get('signature_key')

        # Verifikasi Signature Key Midtrans untuk keamanan
        calc_signature = hashlib.sha512(f"{order_id_str}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}".encode('utf-8')).hexdigest()

        if calc_signature != signature_key:
            return Response({'error': 'Invalid Signature'}, status=400)

        transaction_status = data.get('transaction_status')
        master_order_id = order_id_str.replace("ORDER-", "")
        master_order = MasterOrder.objects.get(id=master_order_id)

        if transaction_status in ['capture', 'settlement']:
            master_order.status = MasterOrder.Status.PAID
            master_order.save()
            master_order.payment.status = Payment.Status.PAID
            master_order.payment.save()
            # Update seluruh seller order ke status PAID
            master_order.seller_orders.update(status=SellerOrder.Status.PAID)

        return Response({'status': 'OK'})

class UploadPaymentProofView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id, master_order__buyer=request.user)
        except Payment.DoesNotExist:
            return Response({'error': 'Transaksi tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        image = request.FILES.get('image')
        if not image:
            return Response({'error': 'File gambar bukti transfer wajib diunggah'}, status=status.HTTP_400_BAD_REQUEST)

        PaymentProof.objects.create(payment=payment, image=image)
        payment.status = Payment.Status.REVIEW
        payment.save()

        # Update status Seller Orders terkait ke PAYMENT_REVIEW
        payment.master_order.seller_orders.update(status=SellerOrder.Status.PAYMENT_REVIEW)

        return Response({'message': 'Bukti transfer berhasil diunggah, menunggu verifikasi Seller'})

class ReviewPaymentProofView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, seller_order_id):
        action = request.data.get('action') # 'APPROVE' atau 'REJECT'
        
        try:
            seller_order = SellerOrder.objects.get(id=seller_order_id, seller=request.user)
        except SellerOrder.DoesNotExist:
            return Response({'error': 'Pesanan tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'APPROVE':
            seller_order.status = SellerOrder.Status.PAID
            seller_order.save()

            # Cek dan update status MasterOrder & Payment jika disetujui
            master_order = seller_order.master_order
            master_order.status = MasterOrder.Status.PAID
            master_order.save()

            if hasattr(master_order, 'payment'):
                master_order.payment.status = Payment.Status.PAID
                master_order.payment.save()

            return Response({'message': 'Pembayaran disetujui. Order siap diproses.'})
            
        elif action == 'REJECT':
            seller_order.status = SellerOrder.Status.CANCELLED
            seller_order.save()
            return Response({'message': 'Pembayaran ditolak.'})

        return Response({'error': 'Aksi tidak valid'}, status=status.HTTP_400_BAD_REQUEST)

    # Tambahkan import CheckPaymentStatusView pada payments/views.py
class CheckPaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, master_order_id):
        try:
            master_order = MasterOrder.objects.get(id=master_order_id, buyer=request.user)
        except MasterOrder.DoesNotExist:
            return Response({'error': 'Order tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        order_id_str = f"ORDER-{master_order.id}"
        url = f"https://api.sandbox.midtrans.com/v2/{order_id_str}/status"

        auth_string = f"{settings.MIDTRANS_SERVER_KEY}:"
        encoded_auth = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {encoded_auth}"
        }

        response = requests.get(url, headers=headers)
        res_data = response.json()

        if response.status_code == 200:
            transaction_status = res_data.get('transaction_status')

            # Update status database jika transaksi sudah capture/settlement (Lunas)
            if transaction_status in ['capture', 'settlement']:
                master_order.status = MasterOrder.Status.PAID
                master_order.save()

                if hasattr(master_order, 'payment'):
                    master_order.payment.status = Payment.Status.PAID
                    master_order.payment.save()

                # Update seluruh order penjual menjadi PAID
                master_order.seller_orders.update(status=SellerOrder.Status.PAID)

                return Response({'message': 'Pembayaran berhasil dikonfirmasi', 'status': 'PAID'})
            
            elif transaction_status in ['deny', 'cancel', 'expire']:
                master_order.status = MasterOrder.Status.CANCELLED
                master_order.save()
                
                if hasattr(master_order, 'payment'):
                    master_order.payment.status = Payment.Status.REJECTED
                    master_order.save()
                    
                master_order.seller_orders.update(status=SellerOrder.Status.CANCELLED)
                return Response({'message': 'Pembayaran gagal atau kedaluwarsa', 'status': 'CANCELLED'})

        return Response({
            'message': 'Pembayaran masih diproses/pending', 
            'status': master_order.status,
            'midtrans_status': res_data.get('transaction_status')
        })