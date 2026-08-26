from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import RegisterView, ActivateSellerView, GoogleLoginView, CustomTokenObtainPairView
from products.views import ProductListCreateView, ProductDetailView, CategoryListView, SellerProductListView, PublicStoreDetailView
from orders.views import CheckoutView, CartView, SellerOrderListView, ProcessShippingView, BuyerOrderListView, CompleteOrderView
from payments.views import CreatePaymentView, MidtransWebhookView, UploadPaymentProofView, ReviewPaymentProofView, CheckPaymentStatusView
from chat.views import GetOrCreateConversationView, ConversationMessagesView, SellerConversationsView


urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/login/', CustomTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/activate-seller/', ActivateSellerView.as_view()),
    path('api/auth/google/', GoogleLoginView.as_view(), name='google_login'),

    # Products & Categories
    path('api/categories/', CategoryListView.as_view()),
    path('api/products/', ProductListCreateView.as_view()),
    path('api/products/<int:pk>/', ProductDetailView.as_view()),
    path('api/seller/products/', SellerProductListView.as_view()), # <-- Endpoint Produk Seller
    path('api/stores/<int:seller_id>/', PublicStoreDetailView.as_view()),

    # Cart & Checkout
    path('api/cart/', CartView.as_view()),
    path('api/cart/<int:item_id>/', CartView.as_view()),
    path('api/checkout/', CheckoutView.as_view()),

    # Buyer Orders
    path('api/buyer/orders/', BuyerOrderListView.as_view()),
    path('api/buyer/orders/<int:seller_order_id>/complete/', CompleteOrderView.as_view(), name='complete-order'),

    # Seller Orders & Shipping
    path('api/seller/orders/', SellerOrderListView.as_view()),
    path('api/seller/orders/<int:seller_order_id>/ship/', ProcessShippingView.as_view()),
    path('api/seller/orders/<int:seller_order_id>/review-payment/', ReviewPaymentProofView.as_view()),

    # Payments
    path('api/payments/create/<int:master_order_id>/', CreatePaymentView.as_view()),
    path('api/payments/<int:payment_id>/upload-proof/', UploadPaymentProofView.as_view()),
    path('api/payments/midtrans/notification/', MidtransWebhookView.as_view()),
    path('api/payments/check-status/<int:master_order_id>/', CheckPaymentStatusView.as_view()),

    # Chat Endpoints
    path('api/chat/conversation/', GetOrCreateConversationView.as_view()),
    path('api/chat/conversation/<int:conversation_id>/messages/', ConversationMessagesView.as_view()),
    path('api/seller/chats/', SellerConversationsView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)