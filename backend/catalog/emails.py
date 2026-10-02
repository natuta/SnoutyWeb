# catalog/emails.py
from .gmail_sender import send_gmail

def send_email_adoptante_recordatorio(cfg, titulo_extra="Recordatorio"):
    sol = cfg.solicitud
    mascota_nombre = sol.mascota.nombre
    adoptante_email = sol.perfil_adoptante.user.email

    subject = f"Snouty | Seguimiento: {mascota_nombre}"
    body = (
        f"Hola 👋\n\n"
        f"{titulo_extra}.\n"
        f"Por favor sube una foto/evidencia del seguimiento de {mascota_nombre} en Snouty.\n\n"
        f"Gracias,\nSnouty"
    )
    try:
        send_gmail(adoptante_email, subject, body)
    except Exception as e:
        # log defensivo por si se usa fuera de Celery
        print(f"[EMAIL ADOPTANTE ERROR] {e}")

def send_email_tutor_evidencia(evidencia):
    sol = evidencia.solicitud
    mascota_nombre = sol.mascota.nombre
    tutor_email = sol.mascota.perfil_tutor.user.email

    subject = f"Snouty | Evidencia subida: {mascota_nombre}"
    body = (
        f"Hola 👋\n\n"
        f"El adoptante subió una evidencia de seguimiento.\n\n"
        f"Mascota: {mascota_nombre}\n"
        f"Solicitud ID: {sol.id}\n"
        f"Fecha evidencia: {evidencia.fecha}\n"
        f"Obs: {evidencia.obs or '-'}\n\n"
        f"Snouty"
    )
    try:
        send_gmail(tutor_email, subject, body)
    except Exception as e:
        print(f"[EMAIL TUTOR ERROR] {e}")
