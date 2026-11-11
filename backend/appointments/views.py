from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.permissions import IsPatient
from chats.models import Chat
from chats.serializers import ChatSerializer

from .models import Appointment
from .serializers import (
    AppointmentCreateSerializer,
    AppointmentSerializer,
    AppointmentUpdateSerializer,
    ReviewSerializer,
)


class AppointmentViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    serializer_class = AppointmentSerializer

    def get_permissions(self):
        if self.action in ("create", "review"):
            return [IsPatient()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.select_related("doctor", "patient", "prediction")
        if hasattr(user, "hospital_patient"):
            return queryset.filter(patient=user.hospital_patient)
        if hasattr(user, "hospital_doctor"):
            return queryset.filter(doctor=user.hospital_doctor)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = AppointmentCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        prediction = data.get("prediction_id")
        appointment = Appointment.objects.create(
            patient=request.user.hospital_patient,
            doctor=data["doctor"],
            appointment_date=data["appointment_date"],
            prediction=prediction,
        )
        if prediction and prediction.doctor_id is None:
            prediction.doctor = data["doctor"]
            prediction.save(update_fields=["doctor"])
        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        appointment = self.get_object()
        serializer = AppointmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        is_doctor = appointment.doctor.user_id == request.user.id
        new_status = data.get("status")

        if not is_doctor and (set(data) - {"status"} or new_status != Appointment.STATUS_CANCELLED):
            raise PermissionDenied("Patients can only cancel their appointments.")
        if new_status and not appointment.is_open:
            raise ValidationError({"status": f"This appointment is already {appointment.status}."})
        if new_status == Appointment.STATUS_COMPLETED and appointment.status != Appointment.STATUS_CONFIRMED:
            raise ValidationError({"status": "Confirm the appointment before completing it."})

        for field, value in data.items():
            setattr(appointment, field, value)
        appointment.save(update_fields=list(data) or None)
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status != Appointment.STATUS_COMPLETED:
            raise ValidationError({"rating": "You can review a consultation once it is completed."})
        if appointment.rating is not None:
            raise ValidationError({"rating": "You have already reviewed this consultation."})
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment.rating = serializer.validated_data["rating"]
        appointment.review = serializer.validated_data["review"]
        appointment.save(update_fields=["rating", "review"])
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        appointment = self.get_object()
        if request.method == "POST":
            if not appointment.is_open:
                raise ValidationError({"message": "This consultation is closed."})
            serializer = ChatSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            chat = serializer.save(appointment=appointment, sender=request.user)
            return Response(ChatSerializer(chat, context={"request": request}).data, status=status.HTTP_201_CREATED)

        chats = Chat.objects.filter(appointment=appointment).select_related("sender")
        after = request.query_params.get("after", "")
        if after.isdigit():
            chats = chats.filter(id__gt=int(after))
        return Response(ChatSerializer(chats[:500], many=True, context={"request": request}).data)
