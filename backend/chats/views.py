from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import FeedbackSerializer


@api_view(["POST"])
def feedback(request):
    serializer = FeedbackSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(sender=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
