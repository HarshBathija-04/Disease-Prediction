from rest_framework import serializers

from hospital.serializers import PatientBriefSerializer
from main_app.ml import SYMPTOM_SET, label

from .models import DoctorNote, PredictionRecord


class DoctorNoteSerializer(serializers.ModelSerializer):
    doctor = serializers.CharField(source="doctor.name", read_only=True)
    note = serializers.CharField(max_length=2000)

    class Meta:
        model = DoctorNote
        fields = ["id", "doctor", "note", "created_at"]


class PredictionSerializer(serializers.ModelSerializer):
    confidence = serializers.FloatField(read_only=True)
    symptom_labels = serializers.SerializerMethodField()
    patient = PatientBriefSerializer(read_only=True)
    doctor_notes = DoctorNoteSerializer(many=True, read_only=True)

    class Meta:
        model = PredictionRecord
        fields = [
            "id",
            "disease_name",
            "confidence",
            "specialization",
            "symptoms",
            "symptom_labels",
            "ai_explanation",
            "patient",
            "doctor_notes",
            "created_at",
        ]

    def get_symptom_labels(self, obj):
        return [label(s) for s in obj.symptoms]


class PredictionCreateSerializer(serializers.Serializer):
    symptoms = serializers.ListField(child=serializers.CharField(max_length=60), min_length=1, max_length=17)

    def validate_symptoms(self, value):
        unknown = sorted(set(value) - SYMPTOM_SET)
        if unknown:
            raise serializers.ValidationError(f"Unknown symptoms: {', '.join(unknown[:5])}")
        return list(dict.fromkeys(value))
