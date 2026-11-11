from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .ml import SPECIALIZATIONS, SYMPTOMS, label


@api_view(["GET"])
@permission_classes([AllowAny])
def symptoms(request):
    keys = sorted(set(SYMPTOMS), key=label)
    return Response(
        {"symptoms": [{"key": key, "label": label(key)} for key in keys], "specializations": SPECIALIZATIONS}
    )
