from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsDoctor, IsPatient
from disease_prediction.throttles import AIThrottle
from main_app import ml

from .ai import explain_prediction
from .models import DoctorNote, PredictionRecord
from .serializers import DoctorNoteSerializer, PredictionCreateSerializer, PredictionSerializer


class PredictionViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    serializer_class = PredictionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsPatient()]
        if self.action == "notes":
            return [IsDoctor()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = PredictionRecord.objects.select_related("patient").prefetch_related("doctor_notes__doctor")
        if hasattr(user, "hospital_patient"):
            return queryset.filter(patient=user.hospital_patient)
        if hasattr(user, "hospital_doctor"):
            doctor = user.hospital_doctor
            return queryset.filter(Q(doctor=doctor) | Q(appointments__doctor=doctor)).distinct()
        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = PredictionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        symptoms = serializer.validated_data["symptoms"]
        disease, confidence, specialist = ml.predict(symptoms)
        record = PredictionRecord.objects.create(
            patient=request.user.hospital_patient,
            disease_name=disease,
            confidence=confidence,
            specialization=specialist,
            symptoms=symptoms,
        )
        return Response(PredictionSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], throttle_classes=[AIThrottle])
    def explain(self, request, pk=None):
        record = self.get_object()
        if not record.ai_explanation:
            record.ai_explanation = explain_prediction(record)
            record.save(update_fields=["ai_explanation"])
        return Response({"id": record.id, "ai_explanation": record.ai_explanation})

    @action(detail=True, methods=["post"])
    def notes(self, request, pk=None):
        record = self.get_object()
        serializer = DoctorNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = DoctorNote.objects.create(
            prediction=record, doctor=request.user.hospital_doctor, **serializer.validated_data
        )
        return Response(DoctorNoteSerializer(note).data, status=status.HTTP_201_CREATED)
