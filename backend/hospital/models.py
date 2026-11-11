from datetime import date

from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    ROLE_PATIENT = "patient"
    ROLE_DOCTOR = "doctor"
    ROLE_ADMIN = "admin"
    ROLE_CHOICES = (
        (ROLE_PATIENT, "Patient"),
        (ROLE_DOCTOR, "Doctor"),
        (ROLE_ADMIN, "Admin"),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="user_profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Patient(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="hospital_patient")
    name = models.CharField(max_length=50)
    dob = models.DateField()
    address = models.CharField(max_length=100)
    mobile_no = models.CharField(max_length=15)
    gender = models.CharField(max_length=10)

    @property
    def age(self):
        today = date.today()
        years = today.year - self.dob.year
        if (today.month, today.day) < (self.dob.month, self.dob.day):
            years -= 1
        return years

    def __str__(self):
        return self.name


class Doctor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="hospital_doctor")
    name = models.CharField(max_length=50)
    dob = models.DateField()
    address = models.CharField(max_length=100)
    mobile_no = models.CharField(max_length=15)
    gender = models.CharField(max_length=10)
    registration_no = models.CharField(max_length=20)
    year_of_registration = models.DateField()
    qualification = models.CharField(max_length=50)
    state_medical_council = models.CharField(max_length=50)
    specialization = models.CharField(max_length=30)

    def __str__(self):
        return f"Dr. {self.name}"

