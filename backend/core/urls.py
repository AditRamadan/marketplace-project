from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import RegisterView, ActivateSellerView
from products.views import ProductListCreateView, ProductDetailView
from orders.views import CheckoutView, CartView, SellerOrderListView, ProcessShippingView
from payments.views import CreatePaymentView, MidtransWebhookView, UploadPaymentProofView, ReviewPaymentProofView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/login/', TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/activate-seller/', ActivateSellerView.as_view()),

    # Products
    path('api/products/', ProductListCreateView.as_view()),
    path('api/products/<int:pk>/', ProductDetailView.as_view()),

    # Cart & Checkout
    path('api/cart/', CartView.as_view()),
    path('api/cart/<int:item_id>/', CartView.as_view()),
    path('api/checkout/', CheckoutView.as_view()),

    # Seller Orders & Shipping
    path('api/seller/orders/', SellerOrderListView.as_view()),
    path('api/seller/orders/<int:seller_order_id>/ship/', ProcessShippingView.as_view()),
    path('api/seller/orders/<int:seller_order_id>/review-payment/', ReviewPaymentProofView.as_view()),

    # Payments
    path('api/payments/create/<int:master_order_id>/', CreatePaymentView.as_view()),
    path('api/payments/<int:payment_id>/upload-proof/', UploadPaymentProofView.as_view()),
    path('api/payments/midtrans/notification/', MidtransWebhookView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)