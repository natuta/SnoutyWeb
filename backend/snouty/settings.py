import os
from pathlib import Path
from dotenv import load_dotenv

from corsheaders.defaults import default_headers  # ✅ correcto (no uses default_loader)

# ============================================================
# BASE
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar .env
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ============================================================
# CONFIGURACIÓN BÁSICA
# ============================================================
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret")  # en prod: quita el fallback
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"

# ✅ Mejor que "*" (pero si estás solo en local, esto sirve)
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")

# ============================================================
# AWS S3 CONFIG
# ============================================================
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-west-1")

# Dominio base del bucket
AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"

# Media desde S3
MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"

# ✅ recomendado: evita problemas con "Bucket owner enforced"
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False

# Tu storage custom (MediaStorage) debe existir en catalog/storage_backends.py
DEFAULT_FILE_STORAGE = "catalog.storage_backends.MediaStorage"

# ============================================================
# STATICFILES (local en DEBUG / opcional S3 en PROD)
# ============================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"



# Si quieres static en S3 en prod (opcional)
USE_S3_STATIC = os.getenv("USE_S3_STATIC", "0") == "1"
if (not DEBUG) and USE_S3_STATIC:
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    AWS_LOCATION = "static"
    STATIC_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_LOCATION}/"
    STATICFILES_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

# ============================================================
# APPS
# ============================================================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",
    "storages",

    "django_celery_beat",
    "rest_framework_simplejwt.token_blacklist",
    "catalog.apps.CatalogConfig",
     ]


from celery.schedules import crontab

CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"  # añadido
CELERY_TIMEZONE = "America/La_Paz"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 min

# Programar recordatorios automáticos (1 vez al día a las 8:00 AM Bolivia)
CELERY_BEAT_SCHEDULE = {
    "recordatorios-seguimiento-diario": {
        "task": "catalog.tasks.enviar_recordatorios_seguimiento",
        "schedule": crontab(hour=8, minute=0),
    }
}


AUTH_USER_MODEL = "catalog.Usuario"

# ============================================================
# MIDDLEWARE
# ============================================================
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ============================================================
# URL / TEMPLATES / WSGI
# ============================================================
ROOT_URLCONF = "snouty.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,  # ✅ necesario para Admin
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "snouty.wsgi.application"

# ============================================================
# DATABASE
# ============================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DB_NAME", "bdsnouty"),
        "USER": os.getenv("DB_USER", "root"),
        "PASSWORD": os.getenv("DB_PASSWORD", "root"),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "3306"),
        "OPTIONS": {"charset": "utf8mb4"},
    }
}

# ============================================================
# AUTH PASSWORD VALIDATORS (en prod activa validadores)
# ============================================================
AUTH_PASSWORD_VALIDATORS = []  # local OK

# ============================================================
# INTERNATIONALIZATION
# ============================================================
LANGUAGE_CODE = "es"
TIME_ZONE = "America/La_Paz"
USE_I18N = True
USE_TZ = False
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ============================================================
# CORS / CSRF
# ============================================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
]

# ✅ Si usas JWT en Authorization header, normalmente NO necesitas credentials.
# Si estás usando cookies/sesión en el front, pon True.
CORS_ALLOW_CREDENTIALS = False

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:4200",
]

# ✅ correcto
CORS_ALLOW_HEADERS = list(default_headers) + ["authorization"]

# ============================================================
# DRF + JWT
# ============================================================
REST_FRAMEWORK = {
    # ✅ QUITADO el duplicado: solo JWT
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    # ✅ para que tus uploads funcionen (fotos/seguimientos)
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ),
}

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ============================================================
# EMAIL
# ============================================================


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True

EMAIL_HOST_USER = "tu_correo@gmail.com"
EMAIL_HOST_PASSWORD = "TU_APP_PASSWORD"  # contraseña de aplicación

DEFAULT_FROM_EMAIL = EMAIL_HOST_USER



# ============================================================
# LOGIN / LOGOUT (solo si usas admin/sesiones)
# ============================================================
LOGIN_URL = "/auth/login/"
LOGIN_REDIRECT_URL = "/api/"
LOGOUT_REDIRECT_URL = "/auth/login/"
