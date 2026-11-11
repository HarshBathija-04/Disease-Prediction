from django.urls import path

from . import views

urlpatterns = [
    path("", views.prediction_list, name="prediction_list"),
    path("<int:record_id>", views.prediction_detail, name="prediction_detail"),
]

