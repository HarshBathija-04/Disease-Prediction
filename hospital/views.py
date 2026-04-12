from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, redirect, render

from appointments.models import Appointment
from records.models import PredictionRecord

from .models import Doctor, Patient, UserProfile


def _sync_hospital_patient(user):
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
        UserProfile.objects.get_or_create(user=user, defaults={"role": UserProfile.ROLE_PATIENT})
        return patient_obj
    return None


def _sync_hospital_doctor(user):
    if hasattr(user, "doctor"):
        legacy = user.doctor
        doctor_obj, _ = Doctor.objects.get_or_create(
            user=user,
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
        UserProfile.objects.get_or_create(user=user, defaults={"role": UserProfile.ROLE_DOCTOR})
        return doctor_obj
    return None


@login_required
def patient_profile(request):
    patient_obj = _sync_hospital_patient(request.user)
    if not patient_obj:
        return redirect("home")
    history = PredictionRecord.objects.filter(patient=patient_obj).order_by("-created_at")
    appointments = Appointment.objects.filter(patient=patient_obj).order_by("-appointment_date")
    return render(
        request,
        "hospital/patient_profile.html",
        {"patient": patient_obj, "history": history, "appointments": appointments},
    )


@login_required
def doctor_dashboard(request):
    doctor_obj = _sync_hospital_doctor(request.user)
    if not doctor_obj:
        return redirect("home")
    appointments = Appointment.objects.filter(doctor=doctor_obj).select_related("patient", "prediction")
    predictions = (
        PredictionRecord.objects.filter(doctor=doctor_obj)
        .select_related("patient__user")
        .order_by("-created_at")
    )
    return render(
        request,
        "hospital/doctor_dashboard.html",
        {"doctor": doctor_obj, "appointments": appointments, "predictions": predictions},
    )


@login_required
def doctor_patients(request):
    doctor_obj = _sync_hospital_doctor(request.user)
    if not doctor_obj:
        return redirect("home")
    patients = (
        Patient.objects.filter(appointments__doctor=doctor_obj)
        .select_related("user")
        .distinct()
        .order_by("name")
    )
    return render(request, "hospital/doctor_patients.html", {"doctor": doctor_obj, "patients": patients})


@login_required
def patient_history(request):
    user = get_object_or_404(User, username=request.session.get("patientusername", request.user.username))
    patient_obj = _sync_hospital_patient(user)
    if not patient_obj:
        return redirect("home")
    history = PredictionRecord.objects.filter(patient=patient_obj).order_by("-created_at")
    return render(request, "hospital/patient_history.html", {"history": history, "patient": patient_obj})
