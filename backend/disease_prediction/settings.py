"""Django settings for the Disease Prediction API. All configuration comes from env vars."""

import os
import re
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip().rstrip("/") for item in os.environ.get(name, default).split(",") if item.strip()]


DEBUG = env_bool("DEBUG", False)
SECRET_KEY = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("Set JWT_SECRET (or SECRET_KEY) in the environment.")
    SECRET_KEY = "dev-only-insecure-secret-key-change-me-0123456789"

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")
if os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "main_app.apps.MainAppConfig",
    "accounts.apps.AccountsConfig",
    "hospital.apps.HospitalConfig",
    "records.apps.RecordsConfig",
    "appointments.apps.AppointmentsConfig",
    "chats.apps.ChatsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "disease_prediction.urls"
WSGI_APPLICATION = "disease_prediction.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database: Postgres via DATABASE_URL, tables live in their own schema (DB_SCHEMA) ---
DB_SCHEMA = os.environ.get("DB_SCHEMA", "disease_prediction")
if not re.fullmatch(r"[a-z_][a-z0-9_]*", DB_SCHEMA):
    raise ImproperlyConfigured("DB_SCHEMA must be a lowercase SQL identifier.")
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ImproperlyConfigured("Set DATABASE_URL (PostgreSQL connection string).")
DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, conn_health_checks=True)}
DATABASES["default"].setdefault("OPTIONS", {})["options"] = f"-c search_path={DB_SCHEMA}"
# Unique test DB name: the local Postgres is shared with other projects.
DATABASES["default"]["TEST"] = {"NAME": f"test_{DB_SCHEMA}"}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

# --- CORS: only the deployed frontend(s) ---
CORS_ALLOWED_ORIGINS = env_list("FRONTEND_URL", "http://localhost:5210")
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# --- Security headers ---
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SECURE_REDIRECT_EXEMPT = [r"^health$"]
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# --- REST framework / JWT ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "EXCEPTION_HANDLER": "disease_prediction.errors.exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.environ.get("THROTTLE_ANON", "120/min"),
        "user": os.environ.get("THROTTLE_USER", "600/min"),
        "auth": os.environ.get("THROTTLE_AUTH", "10/min"),
        "ai": os.environ.get("THROTTLE_AI", "8/min"),
    },
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "SIGNING_KEY": SECRET_KEY,
    "UPDATE_LAST_LOGIN": True,
}

# --- Groq (LLM explanations) ---
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_TEXT_MODEL = os.environ.get("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}
