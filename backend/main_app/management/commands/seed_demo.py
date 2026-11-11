"""Idempotent demo data so the deployed app is not empty. Safe to run on every deploy."""

from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from appointments.models import Appointment
from chats.models import Chat
from hospital.models import Doctor, Patient, UserProfile
from main_app import ml
from records.models import DoctorNote, PredictionRecord

# Public demo credentials, shown in the README and on the sign-in page.
DEMO_PASSWORD = "DemoPass#2024"

DOCTORS = [
    ("dr_mehta", "Ananya Mehta", "Female", "MD (General Medicine)", "General Physician", 2009, "Mumbai, Maharashtra"),
    ("dr_iyer", "Rohan Iyer", "Male", "MD, DM (Gastroenterology)", "Gastroenterologist", 2011, "Chennai, Tamil Nadu"),
    ("dr_kapoor", "Neha Kapoor", "Female", "MD (Dermatology)", "Dermatologist", 2014, "New Delhi, Delhi"),
    ("dr_singh", "Arjun Singh", "Male", "MD, DM (Cardiology)", "Cardiologist", 2007, "Jaipur, Rajasthan"),
    ("dr_rao", "Kavya Rao", "Female", "MD (Neurology)", "Neurologist", 2012, "Bengaluru, Karnataka"),
    ("dr_khan", "Imran Khan", "Male", "MD (Immunology)", "Allergist/Immunologist", 2010, "Hyderabad, Telangana"),
    ("dr_das", "Priya Das", "Female", "MS (ENT)", "ENT specialist", 2015, "Kolkata, West Bengal"),
    ("dr_joshi", "Vikram Joshi", "Male", "MS (Urology)", "Urologist", 2013, "Pune, Maharashtra"),
    ("dr_nair", "Meera Nair", "Female", "MD (Rheumatology)", "Rheumatologist", 2016, "Kochi, Kerala"),
]

PATIENTS = [
    ("demo_patient", "Aarav Sharma", "Male", date(1994, 3, 14), "Andheri West, Mumbai"),
    ("riya_patel", "Riya Patel", "Female", date(1999, 8, 2), "Navrangpura, Ahmedabad"),
    ("sam_thomas", "Sam Thomas", "Male", date(1987, 11, 23), "Indiranagar, Bengaluru"),
]

# (patient, symptoms, doctor, days from today, status, rating, review, chat)
VISITS = [
    (
        "demo_patient",
        ["itching", "skin_rash", "nodal_skin_eruptions"],
        "dr_kapoor",
        -40,
        "completed",
        5,
        "Explained the fungal infection clearly and the cream worked within a week.",
        [],
    ),
    (
        "demo_patient",
        ["acidity", "stomach_pain", "chest_pain", "vomiting"],
        "dr_iyer",
        -12,
        "completed",
        4,
        "Very patient, gave me a practical diet plan.",
        [],
    ),
    (
        "demo_patient",
        ["high_fever", "headache", "muscle_pain", "joint_pain", "nausea"],
        "dr_mehta",
        2,
        "confirmed",
        None,
        "",
        [
            ("patient", "Hi doctor, the fever has been above 101F for two days now."),
            ("doctor", "Thanks for letting me know. Are you drinking enough fluids and is there any rash?"),
            ("patient", "Yes, plenty of water. A few red spots appeared on my arms this morning."),
            ("doctor", "Please get a CBC and dengue NS1 test done today. We'll review the results at your visit."),
        ],
    ),
    (
        "demo_patient",
        ["continuous_sneezing", "shivering", "chills", "watering_from_eyes"],
        None,
        None,
        None,
        None,
        "",
        [],
    ),
    (
        "riya_patel",
        ["headache", "nausea", "visual_disturbances", "acidity"],
        "dr_rao",
        -20,
        "completed",
        5,
        "Finally understood my migraine triggers. Highly recommend.",
        [],
    ),
    (
        "riya_patel",
        ["itching", "skin_rash", "pus_filled_pimples", "blackheads"],
        "dr_kapoor",
        -5,
        "completed",
        4,
        "Quick consultation and helpful skincare advice.",
        [],
    ),
    (
        "sam_thomas",
        ["chest_pain", "breathlessness", "sweating", "fast_heart_rate"],
        "dr_singh",
        -30,
        "completed",
        5,
        "Took my symptoms seriously and arranged an ECG the same day.",
        [],
    ),
    (
        "sam_thomas",
        ["joint_pain", "knee_pain", "swelling_joints", "movement_stiffness"],
        "dr_nair",
        5,
        "pending",
        None,
        "",
        [],
    ),
    (
        "sam_thomas",
        ["burning_micturition", "bladder_discomfort", "continuous_feel_of_urine"],
        "dr_joshi",
        -8,
        "completed",
        4,
        "Clear explanation and a short course of treatment.",
        [],
    ),
]


class Command(BaseCommand):
    help = "Create demo doctors, patients, predictions, appointments and chats (idempotent)."

    def _user(self, username, role):
        user, created = User.objects.get_or_create(username=username, defaults={"email": f"{username}@demo.health"})
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        UserProfile.objects.get_or_create(user=user, defaults={"role": role})
        return user

    @transaction.atomic
    def handle(self, *args, **options):
        doctors = {}
        for i, (username, name, gender, qualification, specialization, year, city) in enumerate(DOCTORS):
            user = self._user(username, UserProfile.ROLE_DOCTOR)
            doctors[username], _ = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "name": name,
                    "gender": gender,
                    "dob": date(year - 27, 1 + i, 10 + i),
                    "address": city,
                    "mobile_no": f"+91 98200 1{i:04d}",
                    "registration_no": f"MCI-{year}-{4210 + i}",
                    "year_of_registration": date(year, 6, 1),
                    "qualification": qualification,
                    "state_medical_council": f"{city.split(', ')[1]} Medical Council",
                    "specialization": specialization,
                },
            )

        patients = {}
        for i, (username, name, gender, dob, address) in enumerate(PATIENTS):
            user = self._user(username, UserProfile.ROLE_PATIENT)
            patients[username], _ = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "name": name,
                    "gender": gender,
                    "dob": dob,
                    "address": address,
                    "mobile_no": f"+91 99300 2{i:04d}",
                },
            )

        if PredictionRecord.objects.filter(patient__in=patients.values()).exists():
            self.stdout.write("Demo data already present; users verified.")
            return

        today = date.today()
        for username, symptoms, doctor_key, offset, status, rating, review, chat in VISITS:
            patient = patients[username]
            doctor = doctors.get(doctor_key)
            disease, confidence, specialist = ml.predict(symptoms)
            record = PredictionRecord.objects.create(
                patient=patient,
                doctor=doctor,
                disease_name=disease,
                confidence=confidence,
                specialization=specialist,
                symptoms=symptoms,
            )
            if not doctor:
                continue
            appointment = Appointment.objects.create(
                patient=patient,
                doctor=doctor,
                prediction=record,
                status=status,
                appointment_date=today + timedelta(days=offset),
                rating=rating,
                review=review,
                doctor_notes="Reviewed symptoms and history. Follow-up advised if symptoms persist."
                if status == "completed"
                else "",
            )
            if status == "completed":
                DoctorNote.objects.create(
                    prediction=record,
                    doctor=doctor,
                    note=f"Findings consistent with {disease}. Treatment started; review in two weeks.",
                )
            for sender, message in chat:
                Chat.objects.create(
                    appointment=appointment,
                    message=message,
                    sender=doctor.user if sender == "doctor" else patient.user,
                )
        self.stdout.write(self.style.SUCCESS("Demo data created."))
