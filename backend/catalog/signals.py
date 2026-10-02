import os
import base64
import logging

from email.mime.text import MIMEText
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
TOKEN_PATH = "token.json"


def send_gmail(to_email, subject, body):
    if not to_email:
        logger.warning("send_gmail llamado sin destinatario.")
        return False

    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds:
        raise Exception("No se encontró token.json válido para Gmail.")

    try:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())
    except RefreshError as e:
        logger.exception("No se pudieron refrescar las credenciales de Gmail: %s", e)
        raise Exception(f"Credenciales de Gmail inválidas o expiradas: {e}")

    service = build("gmail", "v1", credentials=creds)

    message = MIMEText(body, "plain", "utf-8")
    message["to"] = to_email
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    service.users().messages().send(
        userId="me",
        body={"raw": raw}
    ).execute()

    return True