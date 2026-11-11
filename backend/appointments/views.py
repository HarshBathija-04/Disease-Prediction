from datetime import date

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from hospital.models import Doctor, Patient
from main_app.models import doctor as LegacyDoctor
from records.models import PredictionRecord

from .models import Appointment


def _get_or_sync_patient(user):
    patient_obj = Patient.objects.filter(user=user).first()
    if patient_obj:
        return patient_obj
    if hasattr(user, "patient"):
        legacy = user.patient
        patient_obj, _ = Patient.objects.get_or_create(
            user=user,
            defaults={
                "name": legacy.name,
                "dob": legacy.dob,
                "address": legacy.address,
                "mobile_no": legacy.mobile_no,
                "gender": legacy.gender,
            },
        )
        return patient_obj
    return None


def _sync_doctors():
    for legacy in LegacyDoctor.objects.select_related("user").all():
        Doctor.objects.get_or_create(
            user=legacy.user,
            defaults={
                "name": legacy.name,
                "dob": legacy.dob,
                "address": legacy.address,
                "mobile_no": legacy.mobile_no,
                "gender": legacy.gender,
                "registration_no": legacy.registration_no,
                "year_of_registration": legacy.year_of_registration,
                "qualification": legacy.qualification,
                "state_medical_council": legacy.State_Medical_Council,
                "specialization": legacy.specialization,
            },
        )


@login_required
def book_appointment(request):
    if request.method == "GET":
        _sync_doctors()
        doctors = Doctor.objects.order_by("name")
        patient_obj = _get_or_sync_patient(request.user)
        predictions = PredictionRecord.objects.filter(patient=patient_obj).order_by("-created_at") if patient_obj else []
        return render(
            request,
            "appointments/book_appointment.html",
            {"doctors": doctors, "predictions": predictions, "today": date.today()},
        )

    doctor_id = request.POST.get("doctor_id")
    appointment_date = request.POST.get("appointment_date")
    prediction_id = request.POST.get("prediction_id")

    patient_obj = _get_or_sync_patient(request.user)
    doctor_obj = Doctor.objects.filter(id=doctor_id).first()
    prediction_obj = PredictionRecord.objects.filter(id=prediction_id).first() if prediction_id else None

    if not patient_obj or not doctor_obj or not appointment_date:
        messages.error(request, "Please provide all required appointment details.")
        return redirect("book_appointment")

    Appointment.objects.create(
        patient=patient_obj,
        doctor=doctor_obj,
        appointment_date=appointment_date,
        prediction=prediction_obj,
        status=Appointment.STATUS_PENDING,
    )
    messages.success(request, "Appointment booked successfully.")
    return redirect("hospital_patient_profile")
