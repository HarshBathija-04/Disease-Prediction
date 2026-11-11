from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("main_app", "0007_auto_20200118_2040"),
        ("chats", "0003_chat_appointment"),
    ]

    operations = [
        migrations.DeleteModel(name="rating_review"),
        migrations.DeleteModel(name="consultation"),
        migrations.DeleteModel(name="diseaseinfo"),
        migrations.DeleteModel(name="doctor"),
        migrations.DeleteModel(name="patient"),
    ]
