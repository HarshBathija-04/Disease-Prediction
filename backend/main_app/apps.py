from django.apps import AppConfig
from django.db.backends.signals import connection_created


def ensure_schema(sender, connection, **kwargs):
    """Create this app's Postgres schema on first connect (search_path is set via OPTIONS)."""
    from django.conf import settings
    from psycopg import sql

    with connection.cursor() as cursor:
        cursor.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(settings.DB_SCHEMA)))


class MainAppConfig(AppConfig):
    name = "main_app"
    verbose_name = "Prediction engine"

    def ready(self):
        connection_created.connect(ensure_schema, dispatch_uid="ensure_db_schema")
