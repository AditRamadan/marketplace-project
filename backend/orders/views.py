from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

# Impor Model & Serializers
from .models import Cart, CartItem, MasterOrder, SellerOrder, OrderItem, Shipping, StockReservation
from .serializers import SellerOrderSerializer
from .serializers import MasterOrderSerializer
from products.models import Product
from activity.utils import log_activity

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        
        cart, _ = Cart.objects.get_or_create(user=user)
        cart_items = CartItem.objects.filter(cart=cart)

        if not cart_items.exists():
            return Response({'error': 'Keranjang belanja Anda masih kosong'}, status=400)

        # 1. Validasi Seller tidak boleh membeli produknya sendiri
        for item in cart_items:
            if item.product.seller == user:
                return Response({'error': f'Anda tidak dapat membeli produk Anda sendiri ({item.product.name})'}, status=400)

        # 2. Lock baris stok & hitung subtotal barang
        subtotal_products = 0
        items_by_seller = {}

        for item in cart_items:
            product = Product.objects.select_for_update().get(id=item.product.id)

            if product.stock < item.quantity:
                return Response({'error': f'Stok produk {product.name} tidak mencukupi'}, status=400)

            product.stock -= item.quantity
            product.save()

            StockReservation.objects.create(
                user=user,
                product=product,
                quantity=item.quantity,
                reserved_until=timezone.now() + timedelta(minutes=15)
            )

            item_total = product.price * item.quantity
            subtotal_products += item_total

            seller_id = product.seller.id
            if seller_id not in items_by_seller:
                items_by_seller[seller_id] = []
            items_by_seller[seller_id].append({'product': product, 'qty': item.quantity, 'price': product.price, 'subtotal': item_total})

        # --- PERHITUNGAN BIAYA TAMBAHAN (ONGKIR & SERVICE FEE) ---
        SHIPPING_FEE_PER_STORE = 15000
        SERVICE_FEE = 2000
        
        total_stores = len(items_by_seller)  # Jumlah toko unik
        total_shipping_fee = total_stores * SHIPPING_FEE_PER_STORE
        
        # Total Akhir yang akan disimpan ke database
        grand_total_amount = subtotal_products + total_shipping_fee + SERVICE_FEE

        # 3. Buat Master Order dengan GRAND TOTAL
        master_order = MasterOrder.objects.create(
            buyer=user,
            total_amount=grand_total_amount,  # <--- SUDAH MENCAKUP ONGKIR & BIAYA LAYANAN
            status=MasterOrder.Status.PENDING
        )

        # 4. Buat Seller Order Terpisah per Seller
        for seller_id, items in items_by_seller.items():
            seller_subtotal = sum(i['subtotal'] for i in items)
            
            # Subtotal seller bisa ditambah ongkir per toko jika dibutuhkan
            seller_order = SellerOrder.objects.create(
                master_order=master_order,
                seller_id=seller_id,
                subtotal=seller_subtotal + SHIPPING_FEE_PER_STORE, 
                status=SellerOrder.Status.WAITING_PAYMENT
            )

            for i in items:
                OrderItem.objects.create(
                    seller_order=seller_order,
                    product=i['product'],
                    price=i['price'],
                    quantity=i['qty']
                )

        cart_items.delete()

        return Response({
            'message': 'Checkout berhasil, order telah diproses.',
            'master_order_id': master_order.id,
            'total_amount': grand_total_amount
        }, status=201)

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        items = CartItem.objects.filter(cart=cart).select_related('product', 'product__seller')
        
        # Kelompokkan item per Seller untuk respon Frontend
        grouped_items = {}
        for item in items:
            seller_id = item.product.seller.id
            seller_name = item.product.seller.seller_profile.store_name if hasattr(item.product.seller, 'seller_profile') else item.product.seller.username
            
            if seller_id not in grouped_items:
                grouped_items[seller_id] = {
                    'seller_id': seller_id,
                    'store_name': seller_name,
                    'items': []
                }
            grouped_items[seller_id]['items'].append({
                'cart_item_id': item.id,
                'product_id': item.product.id,
                'product_name': item.product.name,
                'price': item.product.price,
                'quantity': item.quantity,
                'product_stock': item.product.stock,
                'subtotal': item.product.price * item.quantity
            })

        return Response(list(grouped_items.values()))

    # PERBAIKAN: Masukkan post() ke dalam class CartView (tambah indentasi)
    def post(self, request):
        product_id = request.data.get('product_id')
        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response({'error': 'Jumlah/quantity tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

        if not product_id:
            return Response({'error': 'product_id wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Produk tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Validasi: Seller tidak boleh membeli produk sendiri
        if product.seller == request.user:
            return Response(
                {'error': 'Anda tidak bisa menambahkan produk milik sendiri ke keranjang.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_item = CartItem.objects.filter(cart=cart, product=product).first()

        # Hitung akumulasi barang yang SUDAH ADA di keranjang
        existing_qty = cart_item.quantity if cart_item else 0
        total_requested_qty = existing_qty + quantity

        # 2. Validasi: Akumulasi total tidak boleh melebihi stok barang yang ada
        if total_requested_qty > product.stock:
            sisa_bisa_ditambah = product.stock - existing_qty
            if existing_qty > 0:
                return Response({
                    'error': f'Stok tidak mencukupi. Anda sudah memiliki {existing_qty} item di keranjang. Maksimal bisa menambah {sisa_bisa_ditambah} item lagi (Stok toko: {product.stock}).'
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': f'Jumlah melebihi stok yang tersedia ({product.stock} pcs).'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Simpan/update kuantitas keranjang
        if cart_item:
            cart_item.quantity = total_requested_qty
            cart_item.save()
        else:
            cart_item = CartItem.objects.create(cart=cart, product=product, quantity=quantity)

        # Log Aktivitas
        log_activity(request.user, 'ADD_TO_CART', {'product_id': product.id, 'quantity': quantity})

        return Response({'message': 'Produk berhasil ditambahkan ke keranjang.'}, status=status.HTTP_200_OK)

    # PERBAIKAN: Masukkan delete() ke dalam class CartView (tambah indentasi)
    def delete(self, request, item_id=None):
        if not item_id:
            return Response({'error': 'ID item keranjang diperlukan'}, status=status.HTTP_400_BAD_REQUEST)
        CartItem.objects.filter(id=item_id, cart__user=request.user).delete()
        return Response({'message': 'Item berhasil dihapus dari keranjang'})

class SellerOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_seller:
            return Response({'error': 'Akses khusus Seller'}, status=status.HTTP_403_FORBIDDEN)

        orders = SellerOrder.objects.filter(seller=request.user).order_by('-created_at')
        serializer = SellerOrderSerializer(orders, many=True)
        return Response(serializer.data)

class ProcessShippingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, seller_order_id):
        try:
            seller_order = SellerOrder.objects.get(id=seller_order_id, seller=request.user)
        except SellerOrder.DoesNotExist:
            return Response({'error': 'Pesanan tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        courier = request.data.get('courier')
        tracking_number = request.data.get('tracking_number')
        shipping_fee = request.data.get('shipping_fee', 0)

        # Buat/Update status pengiriman
        shipping, _ = Shipping.objects.get_or_create(seller_order=seller_order)
        shipping.courier = courier
        shipping.tracking_number = tracking_number
        shipping.shipping_fee = shipping_fee
        shipping.status = 'SHIPPED'
        shipping.save()

        # Update status Seller Order menjadi SHIPPED
        seller_order.status = SellerOrder.Status.SHIPPED
        seller_order.save()

        return Response({'message': 'Resi berhasil diperbarui dan status order diubah ke SHIPPED'})

class BuyerOrderListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders = MasterOrder.objects.filter(buyer=request.user).order_by('-created_at')
        serializer = MasterOrderSerializer(orders, many=True)
        return Response(serializer.data)


class CompleteOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, seller_order_id):
        try:
            seller_order = SellerOrder.objects.get(
                id=seller_order_id, 
                master_order__buyer=request.user
            )
        except SellerOrder.DoesNotExist:
            return Response(
                {'error': 'Pesanan tidak ditemukan'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Update status SellerOrder menjadi COMPLETED
        seller_order.status = 'COMPLETED'
        seller_order.save()

        # Update MasterOrder jika seluruh sub-order selesai
        master_order = seller_order.master_order
        if not master_order.seller_orders.exclude(status='COMPLETED').exists():
            master_order.status = 'COMPLETED'
            master_order.save()

        return Response({'message': 'Pesanan berhasil diselesaikan!'})