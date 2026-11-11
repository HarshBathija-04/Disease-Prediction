from datetime import date

from django.core.validators import RegexValidator
from rest_framework import serializers

from main_app.ml import SPECIALIZATIONS

from .models import Doctor, Patient

GENDERS = ["Male", "Female", "Other"]
mobile_validator = RegexValidator(r"^\+?[0-9 ]{7,15}$", "Enter a valid phone number (7-15 digits).")


def past_date(value):
    if value >= date.today():
        raise serializers.ValidationError("Must be a date in the past.")
    return value


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    dob = serializers.DateField(validators=[past_date])
    gender = serializers.ChoiceField(choices=GENDERS)
    mobile_no = serializers.CharField(validators=[mobile_validator])

    class Meta:
        model = Patient
        fields = ["id", "name", "dob", "age", "gender", "address", "mobile_no"]


class PatientBriefSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = ["id", "name", "age", "gender"]


class DoctorProfileSerializer(serializers.ModelSerializer):
    """The doctor's own editable profile."""

    dob = serializers.DateField(validators=[past_date])
    year_of_registration = serializers.DateField(validators=[past_date])
    gender = serializers.ChoiceField(choices=GENDERS)
    mobile_no = serializers.CharField(validators=[mobile_validator])
    specialization = serializers.ChoiceField(choices=SPECIALIZATIONS)

    class Meta:
        model = Doctor
        fields = [
            "id",
            "name",
            "dob",
            "gender",
            "address",
            "mobile_no",
            "registration_no",
            "year_of_registration",
            "qualification",
            "state_medical_council",
            "specialization",
        ]


class DoctorPublicSerializer(serializers.ModelSerializer):
    """What patients see when choosing a doctor (no DOB or phone number)."""

    rating = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True, default=0)
    years_experience = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            "id",
            "name",
            "gender",
            "qualification",
            "specialization",
            "state_medical_council",
            "address",
            "rating",
            "review_count",
            "years_experience",
        ]

    def get_rating(self, obj):
        value = getattr(obj, "avg_rating", None)
        return round(float(value), 1) if value is not None else None

    def get_years_experience(self, obj):
        return max(0, date.today().year - obj.year_of_registration.year)
