from rest_framework.permissions import BasePermission


class IsPatient(BasePermission):
    message = "Only patients can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "hospital_patient"))


class IsDoctor(BasePermission):
    message = "Only doctors can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "hospital_doctor"))
