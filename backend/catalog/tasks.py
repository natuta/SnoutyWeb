# catalog/tasks.py
from celery import shared_task
from django.db import transaction
from django.utils import timezone
import logging

from .models import SeguimientoConfig
from .utils_seguimiento import next_date
from .emails import send_email_adoptante_recordatorio

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enviar_recordatorios_seguimiento(self):
    """
    Envia recordatorios automáticos (modo AUTO) cuando proximo_envio <= hoy.
    - Evita duplicados con select_for_update(skip_locked=True)
    - Reprograma la próxima fecha según frecuencia
    - Desactiva al cumplir 1 año (según cfg.vencido())
    """
    hoy = timezone.now().date()

    try:
        with transaction.atomic():
            qs = (
                SeguimientoConfig.objects.select_related(
                    "solicitud",
                    "solicitud__perfil_adoptante__user",
                    "solicitud__mascota",
                    "solicitud__mascota__perfil_tutor__user",
                )
                .select_for_update(skip_locked=True)
                .filter(
                    activo=True,
                    modo="AUTO",
                    inicio__isnull=False,
                    proximo_envio__isnull=False,
                    proximo_envio__lte=hoy,
                    solicitud__estado="APROBADA",
                )
            )

            total = qs.count()
            logger.info(f"[SEGUIMIENTO] hoy={hoy} configs_a_procesar={total}")

            for cfg in qs:
                mascota = cfg.solicitud.mascota.nombre
                adoptante_email = cfg.solicitud.perfil_adoptante.user.email

                try:
                    # ✅ cortar por regla del modelo
                    if cfg.vencido():
                        logger.info(f"[SEGUIMIENTO] VENCIDO cfg={cfg.id} mascota={mascota}")
                        cfg.activo = False
                        cfg.proximo_envio = None
                        cfg.save(update_fields=["activo", "proximo_envio", "actualizado_en"])
                        continue

                    logger.info(f"[SEGUIMIENTO] ENVIANDO cfg={cfg.id} mascota={mascota} a={adoptante_email}")

                    send_email_adoptante_recordatorio(cfg, titulo_extra="Recordatorio automático")

                    cfg.proximo_envio = next_date(hoy, cfg.frecuencia)
                    cfg.save(update_fields=["proximo_envio", "actualizado_en"])

                    logger.info(f"[SEGUIMIENTO] REPROGRAMADO cfg={cfg.id} proximo_envio={cfg.proximo_envio}")

                except Exception as e:
                    # No tumba toda la tarea; solo registra y sigue con el resto
                    logger.exception(f"[SEGUIMIENTO] ERROR cfg={cfg.id} mascota={mascota}: {e}")

    except Exception as e:
        logger.exception(f"[SEGUIMIENTO] ERROR GLOBAL tarea: {e}")
        # reintento global del task
        raise self.retry(exc=e)
