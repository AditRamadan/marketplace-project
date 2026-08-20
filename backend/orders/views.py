from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from products.models import Product
from .models import Cart, CartItem, MasterOrder, SellerOrder, OrderItem, StockReservation

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        
        # PERBAIKAN: Gunakan get_or_create agar tidak crash jika cart belum ada
        cart, _ = Cart.objects.get_or_create(user=user)
        cart_items = CartItem.objects.filter(cart=cart)

        if not cart_items.exists():
            return Response({'error': 'Keranjang belanja Anda masih kosong'}, status=400)

        # 1. Validasi Seller tidak boleh membeli produknya sendiri
        for item in cart_items:
            if item.product.seller == user:
                return Response({'error': f'Anda tidak dapat membeli produk Anda sendiri ({item.product.name})'}, status=400)

        # 2. Lock baris stok (atomic transaction)
        total_master_amount = 0
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
            total_master_amount += item_total

            seller_id = product.seller.id
            if seller_id not in items_by_seller:
                items_by_seller[seller_id] = []
            items_by_seller[seller_id].append({'product': product, 'qty': item.quantity, 'price': product.price, 'subtotal': item_total})

        # 3. Buat Master Order
        master_order = MasterOrder.objects.create(
            buyer=user,
            total_amount=total_master_amount,
            status=MasterOrder.Status.PENDING
        )

        # 4. Buat Seller Order Terpisah per Seller
        for seller_id, items in items_by_seller.items():
            seller_subtotal = sum(i['subtotal'] for i in items)
            seller_order = SellerOrder.objects.create(
                master_order=master_order,
                seller_id=seller_id,
                subtotal=seller_subtotal,
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
            'total_amount': total_master_amount
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
                'subtotal': item.product.price * item.quantity
            })

        return Response(list(grouped_items.values()))

    def post(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Produk tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

        # BR-03: Seller tidak boleh membeli produk miliknya sendiri
        if product.seller == request.user:
            return Response({'error': 'Anda tidak bisa menambahkan produk milik sendiri ke keranjang'}, status=status.HTTP_400_BAD_REQUEST)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)

        if not created:
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
        cart_item.save()

        # Log Activity
        log_activity(request.user, 'ADD_TO_CART', {'product_id': product.id, 'quantity': quantity})

        return Response({'message': 'Produk berhasil ditambahkan ke keranjang'})

    def delete(self, request, item_id):
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