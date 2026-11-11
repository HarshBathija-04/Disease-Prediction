from datetime import date

from rest_framework import serializers

from hospital.models import Doctor
from hospital.serializers import PatientBriefSerializer
from records.models import PredictionRecord

from .models import Appointment


class DoctorBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ["id", "name", "specialization", "qualification"]


class PredictionBriefSerializer(serializers.ModelSerializer):
    confidence = serializers.FloatField()

    class Meta:
        model = PredictionRecord
        fields = ["id", "disease_name", "confidence", "symptoms", "specialization"]


class AppointmentSerializer(serializers.ModelSerializer):
    doctor = DoctorBriefSerializer(read_only=True)
    patient = PatientBriefSerializer(read_only=True)
    prediction = PredictionBriefSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "status",
            "doctor_notes",
            "rating",
            "review",
            "doctor",
            "patient",
            "prediction",
            "created_at",
        ]
        read_only_fields = fields


class AppointmentCreateSerializer(serializers.Serializer):
    doctor_id = serializers.PrimaryKeyRelatedField(queryset=Doctor.objects.all(), source="doctor")
    appointment_date = serializers.DateField()
    prediction_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_appointment_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Pick today or a future date.")
        if (value - date.today()).days > 180:
            raise serializers.ValidationError("Appointments can be booked up to 6 months ahead.")
        return value

    def validate_prediction_id(self, value):
        if value is None:
            return None
        patient = self.context["request"].user.hospital_patient
        prediction = PredictionRecord.objects.filter(id=value, patient=patient).first()
        if prediction is None:
            raise serializers.ValidationError("Prediction not found.")
        return prediction


class AppointmentUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[Appointment.STATUS_CONFIRMED, Appointment.STATUS_COMPLETED, Appointment.STATUS_CANCELLED],
        required=False,
    )
    doctor_notes = serializers.CharField(max_length=4000, required=False, allow_blank=True)


class ReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
