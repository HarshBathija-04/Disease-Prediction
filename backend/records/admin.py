from django.contrib import admin

from .models import DoctorNote, PredictionRecord

admin.site.register(PredictionRecord)
admin.site.register(DoctorNote)

