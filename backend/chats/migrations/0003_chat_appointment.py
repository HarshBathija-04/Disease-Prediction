import django.db.models.deletion
from django.db import migrations, models


def delete_legacy_chats(apps, schema_editor):
    # Legacy chats hang off main_app.consultation, which is being consolidated into appointments.
    apps.get_model("chats", "Chat").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0001_initial"),
        ("chats", "0002_feedback"),
    ]

    operations = [
        migrations.RunPython(delete_legacy_chats, migrations.RunPython.noop),
        migrations.RemoveField(model_name="chat", name="consultation_id"),
        migrations.AddField(
            model_name="chat",
            name="appointment",
            field=models.ForeignKey(
                default=None,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages",
                to="appointments.appointment",
            ),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(name="chat", options={"ordering": ["created", "id"]}),
    ]
