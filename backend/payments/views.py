import hashlib
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from orders.models import MasterOrder, SellerOrder
from .models import Payment, PaymentProof

class CreatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, master_order_id):
        method = request.data.get('method') # MIDTRANS, MANUAL, atau COD
        master_order = MasterOrder.objects.get(id=master_order_id, buyer=request.user)

        payment, _ = Payment.objects.get_or_create(master_order=master_order, defaults={'method': method})

        if method == Payment.Method.MIDTRANS:
            # Integrasi API Midtrans Snap
            url = "https://app.sandbox.midtrans.com/snap/v1/transactions"
            payload = {
                "transaction_details": {
                    "order_id": f"ORDER-{master_order.id}",
                    "gross_amount": int(master_order.total_amount)
                },
                "customer_details": {"email": request.user.email}
            }
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Basic {settings.MIDTRANS_SERVER_KEY}"
            }
            response = requests.post(url, json=payload, headers=headers)
            res_data = response.json()
            payment.snap_token = res_data.get('token')
            payment.save()

            return Response({'snap_token': payment.snap_token})

        elif method == Payment.Method.COD:
            payment.status = Payment.Status.WAITING
            payment.save()
            # Order COD langsung siap diproses Seller
            master_order.seller_orders.update(status=SellerOrder.Status.PROCESSING)
            return Response({'message': 'Order COD berhasil dibuat'})

        elif method == Payment.Method.MANUAL:
            payment.status = Payment.Status.WAITING
            payment.save()
            return Response({'message': 'Silakan lakukan transfer ke rekening marketplace dan unggah bukti transfer'})

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
            return Response({'message': 'Pembayaran disetujui. Order siap diproses.'})
        elif action == 'REJECT':
            seller_order.status = SellerOrder.Status.CANCELLED
            seller_order.save()
            return Response({'message': 'Pembayaran ditolak.'})

        return Response({'error': 'Aksi tidak valid'}, status=status.HTTP_400_BAD_REQUEST)