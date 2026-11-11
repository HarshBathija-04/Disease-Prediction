from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from hospital.models import Doctor

from .models import DoctorNote, PredictionRecord


@login_required
def prediction_list(request):
    doctor_obj = Doctor.objects.filter(user=request.user).first()
    if not doctor_obj:
        return redirect("home")
    predictions = PredictionRecord.objects.filter(doctor=doctor_obj).order_by("-created_at")
    return render(request, "records/prediction_list.html", {"predictions": predictions})


@login_required
def prediction_detail(request, record_id):
    doctor_obj = Doctor.objects.filter(user=request.user).first()
    if not doctor_obj:
        return redirect("home")
    record = get_object_or_404(PredictionRecord, id=record_id)

    if request.method == "POST":
        note = request.POST.get("note", "").strip()
        if doctor_obj and note:
            DoctorNote.objects.create(prediction=record, doctor=doctor_obj, note=note)
            messages.success(request, "Doctor note saved.")
        return redirect("prediction_detail", record_id=record.id)

    notes = record.doctor_notes.select_related("doctor").order_by("-created_at")
    return render(request, "records/prediction_detail.html", {"record": record, "notes": notes})
