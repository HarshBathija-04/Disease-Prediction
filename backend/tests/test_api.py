from datetime import date, timedelta
from unittest import mock

import pytest
from django.core.management import call_command

from appointments.models import Appointment
from records.ai import AIRateLimited
from records.models import PredictionRecord

pytestmark = pytest.mark.django_db

REGISTER = {
    "role": "patient",
    "username": "new_patient",
    "email": "new@example.com",
    "password": "Correct-Horse-42",
    "name": "New Patient",
    "dob": "1995-05-05",
    "gender": "Female",
    "address": "Mumbai",
    "mobile_no": "+91 9876543210",
}


def test_health_reports_db_ok(api):
    response = api.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}


def test_symptoms_list_is_public_and_deduplicated(api):
    data = api.get("/api/symptoms").json()
    keys = [s["key"] for s in data["symptoms"]]
    assert len(keys) == len(set(keys)) == 131
    assert "Dermatologist" in data["specializations"]


def test_register_login_and_me(api):
    response = api.post("/api/auth/register", REGISTER, format="json")
    assert response.status_code == 201, response.json()
    assert response.json()["user"]["role"] == "patient"

    response = api.post("/api/auth/login", {"username": "new_patient", "password": REGISTER["password"]}, format="json")
    assert response.status_code == 200
    token = response.json()["access"]

    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    me = api.get("/api/auth/me").json()
    assert me["profile"]["name"] == "New Patient"

    updated = api.patch("/api/auth/me", {"address": "Pune"}, format="json").json()
    assert updated["profile"]["address"] == "Pune"


def test_register_validation_errors_are_consistent(api):
    response = api.post("/api/auth/register", {**REGISTER, "role": "doctor", "password": "123"}, format="json")
    assert response.status_code == 400
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert "password" in error["details"]


def test_login_rejects_bad_password(api, patient):
    response = api.post("/api/auth/login", {"username": "pat", "password": "wrong"}, format="json")
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Incorrect username or password."


def test_auth_endpoints_are_rate_limited(api):
    codes = [
        api.post("/api/auth/login", {"username": "x", "password": "y"}, format="json").status_code for _ in range(11)
    ]
    assert codes[-1] == 429


def test_protected_endpoint_requires_token(api):
    assert api.get("/api/predictions").status_code == 401


def test_patient_prediction_flow(as_patient):
    response = as_patient.post("/api/predictions", {"symptoms": ["itching", "skin_rash"]}, format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["disease_name"] == "Fungal infection"
    assert body["symptom_labels"] == ["Itching", "Skin rash"]
    assert [p["id"] for p in as_patient.get("/api/predictions").json()] == [body["id"]]


def test_prediction_rejects_unknown_symptoms(as_patient):
    response = as_patient.post("/api/predictions", {"symptoms": ["telepathy"]}, format="json")
    assert response.status_code == 400


def test_doctor_cannot_create_prediction(doctor_api):
    response = doctor_api.post("/api/predictions", {"symptoms": ["itching"]}, format="json")
    assert response.status_code == 403


def test_explain_caches_ai_text(as_patient, patient):
    record = PredictionRecord.objects.create(
        patient=patient, disease_name="Acne", confidence=90, symptoms=["blackheads"]
    )
    with mock.patch("records.views.explain_prediction", return_value="### What this condition is\nAcne.") as fake:
        first = as_patient.post(f"/api/predictions/{record.id}/explain")
        second = as_patient.post(f"/api/predictions/{record.id}/explain")
    assert first.status_code == second.status_code == 200
    assert first.json()["ai_explanation"].startswith("### What")
    assert fake.call_count == 1


def test_explain_without_key_returns_friendly_503(as_patient, patient, settings):
    settings.GROQ_API_KEY = ""
    record = PredictionRecord.objects.create(
        patient=patient, disease_name="Acne", confidence=90, symptoms=["blackheads"]
    )
    response = as_patient.post(f"/api/predictions/{record.id}/explain")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ai_unavailable"


def test_explain_rate_limited_by_groq(as_patient, patient):
    record = PredictionRecord.objects.create(
        patient=patient, disease_name="Acne", confidence=90, symptoms=["blackheads"]
    )
    with mock.patch("records.views.explain_prediction", side_effect=AIRateLimited()):
        response = as_patient.post(f"/api/predictions/{record.id}/explain")
    assert response.status_code == 429


def test_other_patient_cannot_see_prediction(api, patient):
    from tests.conftest import make_user

    record = PredictionRecord.objects.create(
        patient=patient, disease_name="Acne", confidence=90, symptoms=["blackheads"]
    )
    api.force_authenticate(make_user("intruder", "patient"))
    assert api.get(f"/api/predictions/{record.id}").status_code == 404


def test_appointment_lifecycle_with_chat_and_review(as_patient, doctor_api, patient, doctor):
    record = as_patient.post("/api/predictions", {"symptoms": ["itching", "skin_rash"]}, format="json").json()
    booked = as_patient.post(
        "/api/appointments",
        {
            "doctor_id": doctor.id,
            "appointment_date": str(date.today() + timedelta(days=1)),
            "prediction_id": record["id"],
        },
        format="json",
    )
    assert booked.status_code == 201, booked.json()
    appointment_id = booked.json()["id"]

    # doctor sees the linked prediction and can add a note
    assert doctor_api.get(f"/api/predictions/{record['id']}").status_code == 200
    assert (
        doctor_api.post(f"/api/predictions/{record['id']}/notes", {"note": "Looks fungal."}, format="json").status_code
        == 201
    )

    # chat both ways, incremental polling
    first = as_patient.post(f"/api/appointments/{appointment_id}/messages", {"message": "Hello doctor"}, format="json")
    assert first.status_code == 201
    doctor_api.post(f"/api/appointments/{appointment_id}/messages", {"message": "Hello!"}, format="json")
    newer = as_patient.get(f"/api/appointments/{appointment_id}/messages?after={first.json()['id']}").json()
    assert [m["message"] for m in newer] == ["Hello!"]
    assert newer[0]["is_mine"] is False

    # patient cannot complete; doctor confirms then completes
    assert (
        as_patient.patch(f"/api/appointments/{appointment_id}", {"status": "completed"}, format="json").status_code
        == 403
    )
    assert (
        doctor_api.patch(f"/api/appointments/{appointment_id}", {"status": "completed"}, format="json").status_code
        == 400
    )
    doctor_api.patch(f"/api/appointments/{appointment_id}", {"status": "confirmed"}, format="json")
    done = doctor_api.patch(
        f"/api/appointments/{appointment_id}", {"status": "completed", "doctor_notes": "Cream"}, format="json"
    )
    assert done.json()["status"] == "completed"

    # closed consultation: no more chat, one review
    closed = as_patient.post(f"/api/appointments/{appointment_id}/messages", {"message": "Thanks"}, format="json")
    assert closed.status_code == 400
    review = as_patient.post(
        f"/api/appointments/{appointment_id}/review", {"rating": 5, "review": "Great"}, format="json"
    )
    assert review.status_code == 200
    again = as_patient.post(f"/api/appointments/{appointment_id}/review", {"rating": 1}, format="json")
    assert again.status_code == 400

    doctors = as_patient.get("/api/doctors").json()
    assert doctors[0]["rating"] == 5.0 and doctors[0]["review_count"] == 1


def test_cannot_book_in_the_past(as_patient, doctor):
    response = as_patient.post(
        "/api/appointments", {"doctor_id": doctor.id, "appointment_date": "2000-01-01"}, format="json"
    )
    assert response.status_code == 400
    assert Appointment.objects.count() == 0


def test_feedback(as_patient):
    assert as_patient.post("/api/feedback", {"feedback": "Lovely app"}, format="json").status_code == 201


def test_seed_is_idempotent():
    call_command("seed_demo")
    count = PredictionRecord.objects.count()
    call_command("seed_demo")
    assert PredictionRecord.objects.count() == count > 0


def test_unknown_route_returns_json_404(api):
    response = api.get("/api/nope")
    assert response.status_code == 404
