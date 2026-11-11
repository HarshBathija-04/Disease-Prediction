from django.db import models

from hospital.models import Doctor, Patient


class PredictionRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="prediction_records")
    doctor = models.ForeignKey(
        Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name="prediction_records"
    )
    disease_name = models.CharField(max_length=200)
    confidence = models.DecimalField(max_digits=5, decimal_places=2)
    symptoms = models.JSONField(default=list)
    specialization = models.CharField(max_length=50, blank=True)
    ai_explanation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    legacy_diseaseinfo_id = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.name} - {self.disease_name} ({self.created_at.date()})"


class DoctorNote(models.Model):
    prediction = models.ForeignKey(PredictionRecord, on_delete=models.CASCADE, related_name="doctor_notes")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="notes")
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note for {self.prediction_id} by {self.doctor.name}"
