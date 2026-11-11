from django.db.models import Avg, Count, F, Q
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from appointments.models import Appointment

from .models import Doctor
from .serializers import DoctorPublicSerializer

REVIEWED = Q(appointments__rating__isnull=False)


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DoctorPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Doctor.objects.annotate(
            avg_rating=Avg("appointments__rating"), review_count=Count("appointments", filter=REVIEWED)
        ).order_by(F("avg_rating").desc(nulls_last=True), "name")
        specialization = self.request.query_params.get("specialization", "").strip()
        search = self.request.query_params.get("search", "").strip()[:50]
        if specialization:
            queryset = queryset.filter(specialization__iexact=specialization)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(specialization__icontains=search))
        return queryset

    def retrieve(self, request, *args, **kwargs):
        doctor = self.get_object()
        reviews = (
            Appointment.objects.filter(doctor=doctor, rating__isnull=False)
            .select_related("patient")
            .order_by("-appointment_date")[:10]
        )
        data = self.get_serializer(doctor).data
        data["reviews"] = [
            {
                "id": a.id,
                "rating": a.rating,
                "review": a.review,
                "patient": a.patient.name.split()[0],
                "date": a.appointment_date,
            }
            for a in reviews
        ]
        return Response(data)
