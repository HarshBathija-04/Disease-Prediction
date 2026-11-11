from rest_framework import serializers

from .models import Chat, Feedback


class ChatSerializer(serializers.ModelSerializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ["id", "message", "sender_name", "is_mine", "created"]
        read_only_fields = ["id", "created"]

    def get_sender_name(self, obj):
        user = obj.sender
        profile = getattr(user, "hospital_doctor", None)
        if profile:
            return f"Dr. {profile.name}"
        profile = getattr(user, "hospital_patient", None)
        return profile.name if profile else user.username

    def get_is_mine(self, obj):
        return obj.sender_id == self.context["request"].user.id


class FeedbackSerializer(serializers.ModelSerializer):
    feedback = serializers.CharField(min_length=3, max_length=2000)

    class Meta:
        model = Feedback
        fields = ["id", "feedback", "created"]
        read_only_fields = ["id", "created"]
