from django.contrib import admin

from .models import Doctor, Patient, UserProfile

admin.site.register(UserProfile)
admin.site.register(Patient)
admin.site.register(Doctor)


admin.site.site_header = "Disease Prediction admin"
admin.site.site_title = "Disease Prediction admin"
