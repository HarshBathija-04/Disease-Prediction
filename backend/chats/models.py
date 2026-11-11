from django.contrib.auth.models import User
from django.db import models

from appointments.models import Appointment


class Chat(models.Model):
    """A consultation message between the patient and doctor of an appointment."""

    created = models.DateTimeField(auto_now_add=True)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()

    class Meta:
        ordering = ["created", "id"]

    def __str__(self):
        return self.message[:50]


class Feedback(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    feedback = models.TextField()

    def __str__(self):
        return self.feedback[:50]
