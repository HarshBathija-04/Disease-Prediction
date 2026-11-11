from rest_framework.permissions import BasePermission

from hospital.models import UserProfile


def role_of(user):
    profile = getattr(user, "user_profile", None)
    if profile:
        return profile.role
    return UserProfile.ROLE_ADMIN if user.is_superuser else None


class IsPatient(BasePermission):
    message = "Only patients can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "hospital_patient"))


class IsDoctor(BasePermission):
    message = "Only doctors can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "hospital_doctor"))
