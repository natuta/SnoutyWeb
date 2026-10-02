# catalog/views_seguimiento.py
from datetime import date
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import SolicitudAdopcion, SeguimientoSolicitud, SeguimientoConfig, Notificacion
from .serializers import (
    SeguimientoConfigSerializer,
    SolicitudAdopcionSerializer,
)

from .emails import send_email_tutor_evidencia  # ✅ firma: send_email_tutor_evidencia(evidencia)


# ============================================================
# HELPERS
# ============================================================
def is_tutor(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and getattr(user, "rol", None) == "TUTOR"
        and hasattr(user, "perfil_tutor")
    )


def is_adoptante(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and getattr(user, "rol", None) == "ADOPTANTE"
        and hasattr(user, "perfil_adoptante")
    )


# ============================================================
# ADOPTANTE: SUBIR EVIDENCIA (multipart)
# ============================================================
class SeguimientoUploadView(APIView):
    """
    POST /api/seguimientos/upload/
    multipart/form-data:
      - solicitud_id   (obligatorio)
      - fecha          (opcional, YYYY-MM-DD)
      - obs            (opcional)
      - file           (obligatorio)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        solicitud_id = request.data.get("solicitud_id")
        f = request.FILES.get("file")
        fecha = request.data.get("fecha") or date.today()
        obs = request.data.get("obs") or ""

        if not solicitud_id:
            return Response({"detail": "solicitud_id es obligatorio."}, status=400)
        if not f:
            return Response({"detail": "file es obligatorio."}, status=400)

        user = request.user
        if not is_adoptante(user):
            raise PermissionDenied("Solo ADOPTANTE puede subir evidencias.")

        try:
            solicitud = SolicitudAdopcion.objects.select_related(
                "perfil_adoptante", "perfil_adoptante__user",
                "mascota", "mascota__perfil_tutor", "mascota__perfil_tutor__user"
            ).get(id=solicitud_id)
        except SolicitudAdopcion.DoesNotExist:
            return Response({"detail": "Solicitud no encontrada."}, status=404)

        # ✅ solo dueño
        if solicitud.perfil_adoptante.user_id != user.id:
            raise PermissionDenied("Solo puedes subir evidencias de tus solicitudes.")

        # ✅ solo aprobada
        if solicitud.estado != "APROBADA":
            raise PermissionDenied("Solo si la solicitud está APROBADA.")

        cfg = getattr(solicitud, "seguimiento_config", None)
        if not cfg or not cfg.activo or not cfg.inicio:
            raise PermissionDenied("El seguimiento no está iniciado o no está activo.")

        if cfg.vencido():
            raise PermissionDenied("El seguimiento ya venció (máximo 1 año).")

        # ✅ evitar duplicados por fecha
        if SeguimientoSolicitud.objects.filter(solicitud=solicitud, fecha=fecha).exists():
            return Response({"detail": "Ya existe una evidencia para esa fecha."}, status=400)

        evidencia = SeguimientoSolicitud.objects.create(
            solicitud=solicitud,
            imagen=f,     # ✅ tu modelo sube a S3 en save()
            fecha=fecha,
            obs=obs
        )

        # ✅ Notificación DB al tutor
        try:
            Notificacion.objects.create(
                solicitud=solicitud,
                perfil_tutor=solicitud.mascota.perfil_tutor,
                tipo="EVIDENCIA_SUBIDA",
                titulo=f"Evidencia subida ({solicitud.mascota.nombre})",
                cuerpo=f"El adoptante subió evidencia el {evidencia.fecha}.",
            )
        except Exception:
            pass

        # ✅ Correo al tutor (firma corregida)
        try:
            send_email_tutor_evidencia(evidencia)
        except Exception:
            pass

        return Response(
            {
                "id": evidencia.id,
                "fecha": str(evidencia.fecha),
                "obs": evidencia.obs,
                "imagen_url": getattr(evidencia, "imagen_url", None),
                "s3_url": getattr(evidencia, "s3_url", None),
            },
            status=201
        )


# ============================================================
# TUTOR: LISTA SOLICITUDES APROBADAS (para UI)
# ============================================================
class TutorSolicitudesSeguimientoView(APIView):
    """
    GET /api/tutor/seguimientos/solicitudes/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_tutor(request.user):
            raise PermissionDenied("Solo TUTOR.")

        tutor = request.user.perfil_tutor
        qs = SolicitudAdopcion.objects.select_related(
            "mascota", "perfil_adoptante__user"
        ).filter(
            estado="APROBADA",
            mascota__perfil_tutor_id=tutor.id,
        ).order_by("-updated_at")

        return Response(SolicitudAdopcionSerializer(qs, many=True, context={"request": request}).data)


# ============================================================
# ADOPTANTE: LISTA CONFIGS INICIADAS (para UI)
# ============================================================
class AdoptanteConfigsSeguimientoView(APIView):
    """
    GET /api/adoptante/seguimientos/configs/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_adoptante(request.user):
            raise PermissionDenied("Solo ADOPTANTE.")

        adoptante = request.user.perfil_adoptante
        qs = SeguimientoConfig.objects.select_related(
            "solicitud",
            "solicitud__perfil_adoptante__user",
            "solicitud__mascota",
            "solicitud__mascota__perfil_tutor__user",
        ).filter(
            solicitud__perfil_adoptante_id=adoptante.id,
            solicitud__estado="APROBADA",
            activo=True,
            inicio__isnull=False,
        ).order_by("-actualizado_en")

        return Response(SeguimientoConfigSerializer(qs, many=True, context={"request": request}).data)
