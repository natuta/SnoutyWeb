
# catalog/emails.py

import logging

from .gmail_sender import send_gmail

logger = logging.getLogger(__name__)


# ============================================================
# ENVIAR RECORDATORIO AL ADOPTANTE
# ============================================================

def send_email_adoptante_recordatorio(
    cfg,
    titulo_extra="Recordatorio"
):
    sol = cfg.solicitud

    mascota_nombre = sol.mascota.nombre

    adoptante_email = (
        sol.perfil_adoptante.user.email or ""
    ).strip()

    if not adoptante_email:
        raise ValueError(
            "El adoptante no tiene correo electrónico registrado."
        )

    subject = f"Snouty | Seguimiento: {mascota_nombre}"

    body = (
        f"Hola 👋\n\n"
        f"{titulo_extra}.\n\n"
        f"Por favor, ingresa a Snouty y sube "
        f"una fotografía como evidencia del "
        f"seguimiento de {mascota_nombre}.\n\n"
        f"Gracias,\n"
        f"Equipo Snouty"
    )

    return send_gmail(
        adoptante_email,
        subject,
        body
    )

# ============================================================
# NOTIFICAR AL TUTOR CUANDO SE SUBE UNA EVIDENCIA
# ============================================================
def send_email_tutor_evidencia(evidencia):

    sol = evidencia.solicitud

    mascota_nombre = sol.mascota.nombre

    tutor_email = (
        sol.mascota.perfil_tutor.user.email or ""
    ).strip()

    if not tutor_email:
        raise ValueError(
            "El tutor no tiene un correo electrónico registrado."
        )

    subject = f"Snouty | Evidencia subida: {mascota_nombre}"

    body = (
        f"Hola 👋\n\n"
        f"El adoptante subió una evidencia "
        f"de seguimiento.\n\n"
        f"Mascota: {mascota_nombre}\n"
        f"Solicitud ID: {sol.id}\n"
        f"Fecha de evidencia: {evidencia.fecha}\n"
        f"Observaciones: {evidencia.obs or '-'}\n\n"
        f"Equipo Snouty"
    )

    try:
        resultado = send_gmail(
            tutor_email,
            subject,
            body
        )

        if resultado is False or resultado == 0:
            raise RuntimeError(
                "El servicio de Gmail no confirmó el envío."
            )

        logger.info(
            "Notificación al tutor procesada "
            "para evidencia %s",
            evidencia.id
        )

        return resultado

    except Exception:
        logger.exception(
            "Error notificando la evidencia %s",
            evidencia.id
        )
        raise
