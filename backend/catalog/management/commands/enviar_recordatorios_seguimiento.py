# catalog/management/commands/enviar_recordatorios_seguimiento.py
from django.core.management.base import BaseCommand
from django.utils import timezone

from catalog.models import SeguimientoConfig, Notificacion
from catalog.gmail_sender import send_gmail

from datetime import timedelta
import calendar


def next_date(hoy, freq: str):
    freq = (freq or "").upper()

    if freq == "DIARIO":
        return hoy + timedelta(days=1)
    if freq == "SEMANAL":
        return hoy + timedelta(days=7)
    if freq == "QUINCENAL":
        return hoy + timedelta(days=15)
    if freq == "MENSUAL":
        y, m = hoy.year, hoy.month + 1
        if m == 13:
            m = 1
            y += 1
        d = min(hoy.day, calendar.monthrange(y, m)[1])
        return hoy.replace(year=y, month=m, day=d)
    if freq == "TRIMESTRAL":
        y, m = hoy.year, hoy.month + 3
        while m > 12:
            m -= 12
            y += 1
        d = min(hoy.day, calendar.monthrange(y, m)[1])
        return hoy.replace(year=y, month=m, day=d)

    return hoy + timedelta(days=7)


class Command(BaseCommand):
    help = "Envía recordatorios automáticos de seguimiento (fotos) a adoptantes."

    def handle(self, *args, **options):
        hoy = timezone.now().date()

        qs = (
            SeguimientoConfig.objects.select_related(
                "solicitud",
                "solicitud__mascota",
                "solicitud__mascota__perfil_tutor",
                "solicitud__perfil_adoptante",
                "solicitud__perfil_adoptante__user",
            )
            .filter(
                activo=True,
                modo="AUTO",
                solicitud__estado="APROBADA",
                proximo_envio__isnull=False,
                proximo_envio__lte=hoy,
            )
        )

        enviados = 0

        for cfg in qs:
            sol = cfg.solicitud
            mascota = sol.mascota.nombre
            tutor = sol.mascota.perfil_tutor
            adoptante_email = sol.perfil_adoptante.user.email

            # ✅ Log notificación tutor
            try:
                Notificacion.objects.create(
                    solicitud=sol,
                    perfil_tutor=tutor,
                    tipo="RECORDATORIO_AUTO",
                    titulo=f"Recordatorio automático enviado ({mascota})",
                    cuerpo=f"Se envió recordatorio automático a: {adoptante_email}. Frecuencia: {cfg.frecuencia}",
                )
            except Exception:
                pass

            # ✅ Email
            try:
                send_gmail(
                    to_email=adoptante_email,
                    subject=f"Snouty | Recordatorio automático: foto de {mascota}",
                    body=(
                        f"Hola 👋\n\n"
                        f"Recordatorio automático: por favor sube una foto de seguimiento de {mascota}.\n"
                        f"Frecuencia elegida por el tutor: {cfg.frecuencia}\n\n"
                        f"Gracias,\nSnouty"
                    ),
                )
                enviados += 1
            except Exception:
                continue

            # ✅ Reprogramar
            cfg.proximo_envio = next_date(hoy, cfg.frecuencia)
            cfg.save(update_fields=["proximo_envio", "actualizado_en"])

        self.stdout.write(self.style.SUCCESS(f"Recordatorios enviados: {enviados}"))
