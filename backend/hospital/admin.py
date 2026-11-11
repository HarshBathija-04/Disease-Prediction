from django.contrib import admin

from .models import Doctor, Patient, UserProfile

admin.site.register([UserProfile, Patient, Doctor])
admin.site.site_header = admin.site.site_title = "Disease Prediction admin"
