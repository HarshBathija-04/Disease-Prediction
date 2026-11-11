from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.tokens import RefreshToken

from hospital.models import Doctor, Patient, UserProfile
from hospital.serializers import (
    GENDERS,
    DoctorProfileSerializer,
    PatientSerializer,
    mobile_validator,
    past_date,
)
from main_app.ml import SPECIALIZATIONS

username_validator = RegexValidator(r"^[a-zA-Z0-9_.]{3,30}$", "Use 3-30 letters, numbers, dots or underscores.")


def user_payload(user):
    account = getattr(user, "user_profile", None)
    role = account.role if account else (UserProfile.ROLE_ADMIN if user.is_superuser else None)
    profile = None
    if hasattr(user, "hospital_patient"):
        profile = PatientSerializer(user.hospital_patient).data
    elif hasattr(user, "hospital_doctor"):
        profile = DoctorProfileSerializer(user.hospital_doctor).data
    return {"id": user.id, "username": user.username, "email": user.email, "role": role, "profile": profile}


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "user": user_payload(user)}


class RegisterSerializer(serializers.Serializer):
    DOCTOR_FIELDS = [
        "registration_no",
        "year_of_registration",
        "qualification",
        "state_medical_council",
        "specialization",
    ]

    role = serializers.ChoiceField(choices=[UserProfile.ROLE_PATIENT, UserProfile.ROLE_DOCTOR])
    username = serializers.CharField(
        validators=[username_validator, UniqueValidator(User.objects.all(), "That username is already taken.")]
    )
    email = serializers.EmailField(
        validators=[UniqueValidator(User.objects.all(), "That email is already registered.", lookup="iexact")]
    )
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    name = serializers.CharField(max_length=50)
    dob = serializers.DateField(validators=[past_date])
    gender = serializers.ChoiceField(choices=GENDERS)
    address = serializers.CharField(max_length=100)
    mobile_no = serializers.CharField(validators=[mobile_validator])
    registration_no = serializers.CharField(max_length=20, required=False)
    year_of_registration = serializers.DateField(required=False, validators=[past_date])
    qualification = serializers.CharField(max_length=50, required=False)
    state_medical_council = serializers.CharField(max_length=50, required=False)
    specialization = serializers.ChoiceField(choices=SPECIALIZATIONS, required=False)

    def validate(self, attrs):
        if attrs["role"] == UserProfile.ROLE_DOCTOR:
            missing = {f: "Required for doctors." for f in self.DOCTOR_FIELDS if not attrs.get(f)}
            if missing:
                raise serializers.ValidationError(missing)
        try:
            validate_password(attrs["password"], User(username=attrs["username"], email=attrs["email"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        data = dict(validated_data)
        role = data.pop("role")
        user = User.objects.create_user(data.pop("username"), data.pop("email"), data.pop("password"))
        UserProfile.objects.create(user=user, role=role)
        if role == UserProfile.ROLE_DOCTOR:
            Doctor.objects.create(user=user, **data)
        else:
            Patient.objects.create(user=user, **{k: v for k, v in data.items() if k not in self.DOCTOR_FIELDS})
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)
