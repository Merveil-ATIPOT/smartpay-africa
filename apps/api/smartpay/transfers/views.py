from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.transfers.models import TransferSimulation
from smartpay.transfers.serializers import TransferSimulationSerializer


class TransferSimulationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = TransferSimulation.objects.filter(initiator=request.user)
        if request.user.is_admin_role:
            qs = TransferSimulation.objects.all()
        serializer = TransferSimulationSerializer(qs[:100], many=True)
        return Response({"count": qs.count(), "results": serializer.data})
