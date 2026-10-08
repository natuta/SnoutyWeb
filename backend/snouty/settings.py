import os
from pathlib import Path

from dotenv import load_dotenv
from corsheaders.defaults import default_headers
from celery.schedules import crontab


# ============================================================
# BASE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables desde .env en local
load_dotenv(os.path.join(BASE_DIR, ".env"))


# ============================================================
# CONFIGURACIÓN BÁSICA
# ============================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "dev-secret-key-snouty"
)

DEBUG = os.getenv(
    "DJANGO_DEBUG",
    "1"
) == "1"

ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost,snoutyweb.onrender.com"
).split(",")


# ============================================================
# APLICACIONES
# ============================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Terceros
    "corsheaders",
    "rest_framework",
    "storages",
    "django_celery_beat",
    "rest_framework_simplejwt.token_blacklist",

    # Proyecto
    "catalog.apps.CatalogConfig",
]


# ============================================================
# USUARIO PERSONALIZADO
# ============================================================

AUTH_USER_MODEL = "catalog.Usuario"


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    # WhiteNoise debe estar cerca de SecurityMiddleware
    "whitenoise.middleware.WhiteNoiseMiddleware",

    # CORS
    "corsheaders.middleware.CorsMiddleware",

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

        "DIRS": [
            BASE_DIR / "templates",
        ],

        "APP_DIRS": True,

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
# BASE DE DATOS
# ============================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ["DB_HOST"],
        "PORT": os.environ["DB_PORT"],
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    }
}


# ============================================================
# VALIDACIÓN DE CONTRASEÑAS
# ============================================================

# Por ahora vacío para no romper tu sistema actual.
# Luego podemos activar validadores en producción.

AUTH_PASSWORD_VALIDATORS = []


# ============================================================
# INTERNACIONALIZACIÓN
# ============================================================

LANGUAGE_CODE = "es"

TIME_ZONE = "America/La_Paz"

USE_I18N = True

USE_TZ = False

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ============================================================
# ARCHIVOS STATIC
# ============================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


# ============================================================
# AWS S3 - ARCHIVOS MEDIA
# ============================================================

AWS_ACCESS_KEY_ID = os.getenv(
    "AWS_ACCESS_KEY_ID"
)

AWS_SECRET_ACCESS_KEY = os.getenv(
    "AWS_SECRET_ACCESS_KEY"
)

AWS_STORAGE_BUCKET_NAME = os.getenv(
    "AWS_STORAGE_BUCKET_NAME"
)

AWS_S3_REGION_NAME = os.getenv(
    "AWS_S3_REGION_NAME",
    "us-west-1"
)

AWS_DEFAULT_ACL = None

AWS_S3_FILE_OVERWRITE = False


# Solo crear el dominio si existe el bucket
if AWS_STORAGE_BUCKET_NAME:

    AWS_S3_CUSTOM_DOMAIN = (
        f"{AWS_STORAGE_BUCKET_NAME}."
        f"s3.{AWS_S3_REGION_NAME}.amazonaws.com"
    )

    MEDIA_URL = (
        f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"
    )

    DEFAULT_FILE_STORAGE = (
        "catalog.storage_backends.MediaStorage"
    )

else:

    # Fallback para desarrollo local
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# STATIC EN S3 OPCIONAL
# ============================================================

USE_S3_STATIC = os.getenv(
    "USE_S3_STATIC",
    "0"
) == "1"


if (
    not DEBUG
    and USE_S3_STATIC
    and AWS_STORAGE_BUCKET_NAME
):

    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400"
    }

    AWS_LOCATION = "static"

    STATIC_URL = (
        f"https://{AWS_S3_CUSTOM_DOMAIN}/"
        f"{AWS_LOCATION}/"
    )

    STATICFILES_STORAGE = (
        "storages.backends.s3boto3."
        "S3Boto3Storage"
    )


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "https://snouty-frontend.onrender.com",
]

# Cuando Angular esté publicado,
# agregar aquí su URL:
#
# "https://snouty-frontend.onrender.com",


CORS_ALLOW_CREDENTIALS = False


CORS_ALLOW_HEADERS = (
    list(default_headers)
    + [
        "authorization",
    ]
)


# ============================================================
# CSRF
# ============================================================

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:4200",
    "https://snoutyweb.onrender.com",
    "https://snouty-frontend.onrender.com",
]

# Cuando Angular esté publicado,
# agregar:
#
# "https://snouty-frontend.onrender.com",


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt."
        "authentication.JWTAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),

    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),

    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ),
}


# ============================================================
# JWT
# ============================================================

SIMPLE_JWT = {

    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": True,
}


# ============================================================
# CELERY
# ============================================================

CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    "redis://localhost:6379/0"
)

CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    "redis://localhost:6379/0"
)

CELERY_ACCEPT_CONTENT = [
    "json",
]

CELERY_TASK_SERIALIZER = "json"

CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = "America/La_Paz"

CELERY_TASK_TRACK_STARTED = True

CELERY_TASK_TIME_LIMIT = 300


# ============================================================
# CELERY BEAT
# ============================================================

CELERY_BEAT_SCHEDULE = {

    "recordatorios-seguimiento-diario": {

        "task": (
            "catalog.tasks."
            "enviar_recordatorios_seguimiento"
        ),

        "schedule": crontab(
            hour=8,
            minute=0
        ),
    }
}


# ============================================================
# EMAIL
# ============================================================

EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
)

EMAIL_HOST = "smtp.gmail.com"

EMAIL_PORT = 587

EMAIL_USE_TLS = True

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    ""
)

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    ""
)

DEFAULT_FROM_EMAIL = (
    EMAIL_HOST_USER
    if EMAIL_HOST_USER
    else "webmaster@localhost"
)


# ============================================================
# LOGIN / LOGOUT
# ============================================================

LOGIN_URL = "/auth/login/"

LOGIN_REDIRECT_URL = "/api/"

LOGOUT_REDIRECT_URL = "/auth/login/"