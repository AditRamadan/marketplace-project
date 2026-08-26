from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Q
from .models import Conversation, Message
from accounts.models import User

class GetOrCreateConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        seller_id = request.data.get('seller_id')
        if not seller_id:
            return Response(
                {'error': 'seller_id wajib disertakan.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            seller = User.objects.get(id=seller_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Penjual tidak ditemukan.'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user == seller:
            return Response(
                {'error': 'Anda tidak bisa memulai chat dengan diri sendiri.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = Conversation.objects.filter(
            (Q(buyer=request.user) & Q(seller=seller)) | (Q(buyer=seller) & Q(seller=request.user))
        ).first()

        if not conversation:
            conversation = Conversation.objects.create(buyer=request.user, seller=seller)

        return Response({
            'conversation_id': conversation.id,
            'buyer_id': conversation.buyer.id,
            'seller_id': conversation.seller.id,
        }, status=status.HTTP_200_OK)


class ConversationMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Percakapan tidak ditemukan.'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Izinkan jika user adalah buyer atau seller percakapan ini
        if request.user.id != conv.buyer_id and request.user.id != conv.seller_id:
            return Response(
                {'error': 'Akses ditolak.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        messages = conv.messages.order_by('timestamp')
        data = [
            {
                'id': m.id,
                'sender_id': m.sender_id,
                'sender_name': m.sender.username or m.sender.email,
                'message': m.text,
                'timestamp': str(m.timestamp),
            }
            for m in messages
        ]
        return Response(data, status=status.HTTP_200_OK)


class SellerConversationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(seller=request.user).order_by('-created_at')
        
        data = []
        for conv in conversations:
            last_msg = conv.messages.order_by('-timestamp').first()
            data.append({
                'conversation_id': conv.id,
                'buyer_id': conv.buyer.id,
                'buyer_name': conv.buyer.username or conv.buyer.email,
                'last_message': last_msg.text if last_msg else '',
                'last_message_time': str(last_msg.timestamp) if last_msg else str(conv.created_at),
            })
        return Response(data, status=status.HTTP_200_OK)