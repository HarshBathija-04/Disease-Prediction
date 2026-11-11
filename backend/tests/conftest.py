from datetime import date

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient

from hospital.models import Doctor, Patient, UserProfile


@pytest.fixture(autouse=True)
def _clear_throttles():
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


def make_user(username, role):
    user = User.objects.create_user(username, f"{username}@example.com", "Sup3r-secret-pass")
    UserProfile.objects.create(user=user, role=role)
    return user


@pytest.fixture
def patient(db):
    user = make_user("pat", UserProfile.ROLE_PATIENT)
    return Patient.objects.create(
        user=user, name="Pat Example", dob=date(1990, 1, 1), address="Pune", mobile_no="+91 9000000000", gender="Male"
    )


@pytest.fixture
def doctor(db):
    user = make_user("doc", UserProfile.ROLE_DOCTOR)
    return Doctor.objects.create(
        user=user,
        name="Doc Example",
        dob=date(1980, 1, 1),
        address="Pune",
        mobile_no="+91 9000000001",
        gender="Female",
        registration_no="R-1",
        year_of_registration=date(2010, 1, 1),
        qualification="MD",
        state_medical_council="MMC",
        specialization="Dermatologist",
    )


@pytest.fixture
def as_patient(api, patient):
    api.force_authenticate(patient.user)
    return api


@pytest.fixture
def doctor_api(doctor):
    client = APIClient()
    client.force_authenticate(doctor.user)
    return client
