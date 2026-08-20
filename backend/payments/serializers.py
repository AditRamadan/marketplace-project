from rest_framework import serializers
from .models import Payment, PaymentProof

class PaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProof
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    proofs = PaymentProofSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'