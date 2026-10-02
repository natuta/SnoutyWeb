# snouty/celery.py
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "snouty.settings")

app = Celery("snouty")

# Carga configuración desde settings.py con prefijo CELERY_
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-descubre tasks en apps de Django
app.autodiscover_tasks()
