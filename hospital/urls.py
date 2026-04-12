from django.urls import path

from . import views

urlpatterns = [
    path("patient/profile", views.patient_profile, name="hospital_patient_profile"),
    path("patient/history", views.patient_history, name="hospital_patient_history"),
    path("doctor/dashboard", views.doctor_dashboard, name="hospital_doctor_dashboard"),
    path("doctor/patients", views.doctor_patients, name="hospital_doctor_patients"),
]

