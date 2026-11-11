from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET


@require_GET
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok", "db": "ok"})
    except Exception:
        return JsonResponse({"status": "error", "db": "error"}, status=503)


urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("main_app.urls")),
    path("api/", include("hospital.urls")),
    path("api/", include("records.urls")),
    path("api/", include("appointments.urls")),
    path("api/", include("chats.urls")),
]

handler404 = "disease_prediction.errors.not_found"
handler500 = "disease_prediction.errors.server_error"
