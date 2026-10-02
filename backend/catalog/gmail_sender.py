# snouty/gmail_sender.py
import base64
import logging
from email.message import EmailMessage
from pathlib import Path

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def send_gmail(to_email: str, subject: str, body: str) -> bool:
    """
    Envía correo real por Gmail API (OAuth2).
    Requiere gmail_token.json junto a manage.py (raíz del backend).

    Retorna:
        True  -> si el correo se envió correctamente
        False -> si no se pudo enviar

    Nota:
        Este método lanza excepción solo si quieres detectar el problema arriba.
        Por seguridad, deja trazas claras en logs.
    """
    if not to_email:
        logger.warning("send_gmail: destinatario vacío.")
        return False

    base_dir = Path(__file__).resolve().parents[1]
    token_path = base_dir / "gmail_token.json"

    if not token_path.exists():
        logger.error("No existe el archivo de token Gmail: %s", token_path)
        raise FileNotFoundError(f"No existe {token_path}. Debe estar junto a manage.py")

    try:
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    except Exception as e:
        logger.exception("No se pudo leer gmail_token.json: %s", e)
        raise Exception(f"No se pudo leer gmail_token.json: {e}")

    try:
        if creds.expired:
            if creds.refresh_token:
                creds.refresh(Request())
                token_path.write_text(creds.to_json(), encoding="utf-8")
            else:
                logger.error("Las credenciales de Gmail expiraron y no tienen refresh_token.")
                raise Exception("Las credenciales de Gmail expiraron y no tienen refresh_token.")
    except RefreshError as e:
        logger.exception("Error refrescando token Gmail: %s", e)
        raise Exception(f"Credenciales Gmail inválidas o revocadas: {e}")
    except Exception as e:
        logger.exception("Error preparando credenciales Gmail: %s", e)
        raise

    try:
        service = build("gmail", "v1", credentials=creds)

        msg = EmailMessage()
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
        service.users().messages().send(userId="me", body={"raw": raw}).execute()

        logger.info("Correo enviado correctamente a %s", to_email)
        return True

    except Exception as e:
        logger.exception("Error enviando correo a %s: %s", to_email, e)
        raise Exception(f"No se pudo enviar el correo a {to_email}: {e}")