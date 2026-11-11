from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from disease_prediction.throttles import AuthThrottle

from . import views

urlpatterns = [
    path("register", views.register),
    path("login", views.login),
    path("refresh", TokenRefreshView.as_view(throttle_classes=[AuthThrottle])),
    path("me", views.me),
]
