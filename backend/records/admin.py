from django.contrib import admin

from .models import DoctorNote, PredictionRecord

admin.site.register([PredictionRecord, DoctorNote])
