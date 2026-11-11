from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from disease_prediction.throttles import AuthThrottle
from hospital.serializers import DoctorProfileSerializer, PatientSerializer

from .serializers import LoginSerializer, RegisterSerializer, tokens_for, user_payload


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(tokens_for(serializer.save()), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(request, **serializer.validated_data)
    if user is None or not user.is_active:
        raise AuthenticationFailed("Incorrect username or password.")
    return Response(tokens_for(user))


@api_view(["GET", "PATCH"])
def me(request):
    user = request.user
    if request.method == "PATCH":
        if hasattr(user, "hospital_doctor"):
            serializer = DoctorProfileSerializer(user.hospital_doctor, data=request.data, partial=True)
        elif hasattr(user, "hospital_patient"):
            serializer = PatientSerializer(user.hospital_patient, data=request.data, partial=True)
        else:
            raise ValidationError({"profile": "This account has no editable profile."})
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(user_payload(user))
