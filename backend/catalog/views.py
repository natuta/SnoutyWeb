# catalog/views.py
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldError
from django.db.models import Avg, Count, Q, OuterRef, Exists
from django.utils import timezone

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import (
    Especie,
    Raza,
    Mascota,
    FotoMascota,
    HistorialMedico,
    CartillaMedica,
    Vacuna,
    SolicitudAdopcion,
    Notificacion,
    Valoracion,
    SeguimientoConfig,
    SeguimientoSolicitud,
    PerfilTutor,
    PerfilAdoptante,
)

from .serializers import (
    RegistroUsuarioSerializer,
    UsuarioSerializer,
    EspecieSerializer,
    RazaSerializer,
    MascotaSerializer,
    FotoMascotaSerializer,
    HistorialMedicoSerializer,
    CartillaMedicaSerializer,
    VacunaSerializer,
    SolicitudAdopcionSerializer,
    SolicitudTutorEstadoSerializer,
    NotificacionSerializer,
    ValoracionSerializer,
    SeguimientoSolicitudSerializer,
    SeguimientoConfigSerializer,
    MascotasTopRazaSerializer,
    SolicitudesPorTutorSerializer,
    SeguimientoCumplimientoResponseSerializer,
    PerfilTutorListSerializer,
    PerfilAdoptanteListSerializer,
)

from .permissions import (
    is_admin,
    is_tutor,
    is_adoptante,
    MascotaPermission,
    FotoMascotaPermission,
    CartillaMedicaPermission,
    HistorialMedicoPermission,
    VacunaPermission,
    SolicitudAdopcionPermission,
    NotificacionPermission,
    ValoracionPermission,
    IsTutor,
    IsAdoptante,
    IsTutorOrAdminReadOnly,
    IsAdoptanteOrAdminReadOnly,
)

from .utils_seguimiento import next_date
from .emails import send_email_adoptante_recordatorio, send_email_tutor_evidencia

UserModel = get_user_model()


# ============================================================
# HELPERS
# ============================================================
def filter_activo_if_exists(qs, activo=True):
    """
    Aplica filtro por 'activo' SOLO si existe el campo en el modelo.
    Evita error SQL cuando la columna no existe en MySQL.
    """
    try:
        return qs.filter(activo=activo)
    except FieldError:
        return qs


# ============================================================
# BASE VIEWSET
# ============================================================
class BaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ["id"]
    search_fields = ["id"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ============================================================
# REGISTRO (TUTOR/ADOPTANTE) - AllowAny
# ============================================================
class RegistroUsuarioViewSet(viewsets.GenericViewSet):
    queryset = UserModel.objects.all()
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(serializer.to_representation(user), status=status.HTTP_201_CREATED)


# ============================================================
# USUARIOS
# - ADMIN: CRUD
# - TUTOR/ADOPTANTE: solo ver/editar su propio usuario
# ============================================================
class UsuarioViewSet(BaseViewSet):
    queryset = UserModel.objects.all().order_by("-id")
    serializer_class = UsuarioSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    search_fields = ["email", "nombres", "apellidos", "telefono"]
    ordering_fields = ["id", "email", "rol", "is_active", "is_staff", "date_joined"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if is_admin(user):
            return qs
        return qs.filter(id=user.id)

    def create(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not is_admin(request.user) and obj.id != request.user.id:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not is_admin(request.user) and obj.id != request.user.id:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)


# ============================================================
# ESPECIES / RAZAS
# ADMIN: list/create/destroy (no update)
# ============================================================
class EspecieViewSet(BaseViewSet):
    queryset = Especie.objects.all().order_by("nombre")
    serializer_class = EspecieSerializer
    search_fields = ["nombre"]
    ordering_fields = ["id", "nombre"]

    def update(self, request, *args, **kwargs):
        return Response({"detail": "No autorizado."}, status=403)

    def partial_update(self, request, *args, **kwargs):
        return Response({"detail": "No autorizado."}, status=403)

    def create(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().destroy(request, *args, **kwargs)


class RazaViewSet(BaseViewSet):
    queryset = Raza.objects.select_related("especie").all().order_by("nombre")
    serializer_class = RazaSerializer
    search_fields = ["nombre", "especie__nombre"]
    ordering_fields = ["id", "nombre", "especie__nombre"]

    def update(self, request, *args, **kwargs):
        return Response({"detail": "No autorizado."}, status=403)

    def partial_update(self, request, *args, **kwargs):
        return Response({"detail": "No autorizado."}, status=403)

    def create(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().destroy(request, *args, **kwargs)


# ============================================================
# MASCOTAS
# - ADMIN: CRUD total
# - TUTOR: SOLO lectura de sus mascotas
# - ADOPTANTE: lectura (si lo usas) -> disponibles + con cartilla (+ activo si existe)
# ============================================================
from django.db.models import OuterRef, Exists
from rest_framework.response import Response

class MascotaViewSet(BaseViewSet):
    queryset = (
        Mascota.objects
        .select_related("especie", "raza", "perfil_tutor", "perfil_tutor__user")
        .all()
        .order_by("-id")
    )
    serializer_class = MascotaSerializer
    permission_classes = [MascotaPermission]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        cartilla_exists = CartillaMedica.objects.filter(mascota_id=OuterRef("pk"))
        qs = qs.annotate(tiene_cartilla=Exists(cartilla_exists))

        if is_admin(user):
            return qs

        if is_tutor(user):
            perfil = getattr(user, "perfil_tutor", None)
            if not perfil:
                return qs.none()
            return qs.filter(perfil_tutor_id=perfil.id)

        if is_adoptante(user):
            return qs.filter(estado="DISPONIBLE", activo=True, tiene_cartilla=True)

        return qs.none()

    def create(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return super().destroy(request, *args, **kwargs)
    
    # ============================================================
# FOTOS MASCOTA (ViewSet)
# REGLA FINAL:
# - SOLO TUTOR puede crear/editar/eliminar
# - ADMIN: solo lectura
# - ADOPTANTE: solo lectura
# ============================================================
# ============================================================
# FOTOS MASCOTA (ViewSet)
# REGLA FINAL:
# - SOLO TUTOR puede crear/editar/eliminar
# - ADMIN: solo lectura
# - ADOPTANTE: solo lectura
# ============================================================
from django.db.models import OuterRef, Exists
from rest_framework import status

class FotoMascotaViewSet(BaseViewSet):
    queryset = (
        FotoMascota.objects
        .select_related("mascota", "mascota__perfil_tutor", "mascota__perfil_tutor__user")
        .all()
        .order_by("-id")
    )
    serializer_class = FotoMascotaSerializer
    permission_classes = [FotoMascotaPermission]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        # TUTOR: solo fotos de SUS mascotas
        if is_tutor(user):
            try:
                return qs.filter(mascota__perfil_tutor_id=user.perfil_tutor.id)
            except Exception:
                return qs.none()

        # ADOPTANTE: solo fotos de mascotas disponibles + con cartilla + activo
        if is_adoptante(user):
            cartilla_exists = CartillaMedica.objects.filter(mascota_id=OuterRef("mascota_id"))
            qs = qs.annotate(tiene_cartilla=Exists(cartilla_exists)).filter(
                mascota__estado="DISPONIBLE",
                tiene_cartilla=True,
            )
            # por si algún día 'activo' no existiera, usa tu helper
            qs = filter_activo_if_exists(qs, True)
            return qs

        # ADMIN: lectura total
        if is_admin(user):
            return qs

        return qs.none()

    def create(self, request, *args, **kwargs):
        if not is_tutor(request.user):
            return Response({"detail": "No autorizado. Solo TUTOR puede crear fotos."}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not is_tutor(request.user):
            return Response({"detail": "No autorizado. Solo TUTOR puede editar fotos."}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not is_tutor(request.user):
            return Response({"detail": "No autorizado. Solo TUTOR puede editar fotos."}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_tutor(request.user):
            return Response({"detail": "No autorizado. Solo TUTOR puede eliminar fotos."}, status=403)
        return super().destroy(request, *args, **kwargs)
from datetime import date
from django.utils.dateparse import parse_date
from rest_framework import permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Mascota, FotoMascota
from .permissions import is_tutor, is_admin, is_adoptante


class FotoMascotaUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user

        # ✅ SOLO TUTOR puede subir fotos
        if not is_tutor(user):
            return Response(
                {"detail": "No autorizado. Solo TUTOR puede subir fotos de mascotas."},
                status=403,
            )

        files = request.FILES.getlist("files")
        mascota_id = request.data.get("mascota_id")

        # fecha opcional (YYYY-MM-DD)
        fecha_raw = request.data.get("fecha")
        fecha = parse_date(fecha_raw) if fecha_raw else date.today()
        if fecha_raw and not fecha:
            return Response({"detail": "fecha inválida. Use YYYY-MM-DD."}, status=400)

        if not mascota_id:
            return Response({"detail": "mascota_id es obligatorio."}, status=400)
        if not files:
            return Response({"detail": "No se enviaron archivos."}, status=400)

        try:
            mascota = Mascota.objects.select_related("perfil_tutor").get(id=mascota_id)
        except Mascota.DoesNotExist:
            return Response({"detail": "Mascota no encontrada."}, status=404)

        # ✅ TUTOR solo puede subir a SUS mascotas
        try:
            perfil_tutor_id = user.perfil_tutor.id
        except Exception:
            return Response({"detail": "El usuario no tiene perfil de tutor."}, status=403)

        if mascota.perfil_tutor_id != perfil_tutor_id:
            return Response({"detail": "No autorizado. Esa mascota no te pertenece."}, status=403)

        # crear fotos
        urls = []
        for f in files:
            foto = FotoMascota.objects.create(mascota=mascota, imagen=f, fecha=fecha)
            urls.append(foto.imagen_url or "")

        return Response(
            {
                "detail": "Fotos subidas correctamente.",
                "mascota_id": mascota.id,
                "fecha": str(fecha),
                "urls": urls,
            },
            status=201,
        )


# ============================================================
# HISTORIAL MÉDICO
# - ADMIN: CRUD
# - TUTOR: solo lectura de lo suyo
# ============================================================
class HistorialMedicoViewSet(BaseViewSet):
    queryset = HistorialMedico.objects.all().order_by("id")
    serializer_class = HistorialMedicoSerializer
    permission_classes = [HistorialMedicoPermission]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if is_admin(user):
            return qs

        if is_tutor(user):
            # Si tu HistorialMedico tiene FK a Mascota (historial.mascota)
            if hasattr(HistorialMedico, "mascota"):
                return qs.filter(mascota__perfil_tutor_id=user.perfil_tutor.id)

            # Fallback si se relaciona por cartillas
            return qs.filter(cartillas__mascota__perfil_tutor_id=user.perfil_tutor.id).distinct()

        return qs.none()


# ============================================================
# CARTILLAS
# - ADMIN: CRUD
# - TUTOR: solo lectura de lo suyo
# ============================================================
class CartillaMedicaViewSet(BaseViewSet):
    queryset = CartillaMedica.objects.select_related("mascota", "historial_medico").all().order_by("-id")
    serializer_class = CartillaMedicaSerializer
    permission_classes = [CartillaMedicaPermission]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if is_admin(user):
            return qs

        if is_tutor(user):
            qs = qs.filter(mascota__perfil_tutor_id=user.perfil_tutor.id)
        else:
            return qs.none()

        mascota_id = self.request.query_params.get("mascota_id")
        if mascota_id:
            qs = qs.filter(mascota_id=mascota_id)

        return qs


# ============================================================
# VACUNAS
# - ADMIN: CRUD
# - TUTOR: solo lectura de lo suyo
# ============================================================
class VacunaViewSet(BaseViewSet):
    queryset = Vacuna.objects.select_related("cartilla_medica", "cartilla_medica__mascota").all().order_by("-id")
    serializer_class = VacunaSerializer
    permission_classes = [VacunaPermission]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if is_admin(user):
            return qs

        if is_tutor(user):
            qs = qs.filter(cartilla_medica__mascota__perfil_tutor_id=user.perfil_tutor.id)
            cartilla_id = self.request.query_params.get("cartilla_medica_id")
            if cartilla_id:
                qs = qs.filter(cartilla_medica_id=cartilla_id)
            return qs

        return qs.none()


# ============================================================
# SOLICITUDES (manteniendo tu lógica)
# ============================================================


# ============================================================
# NOTIFICACIONES
# ============================================================
class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated, NotificacionPermission]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", None)

        qs = Notificacion.objects.select_related(
            "solicitud",
            "perfil_tutor",
            "perfil_tutor__user",
        ).order_by("-creada_en")

        if rol == "ADMIN":
            return qs

        if rol == "TUTOR":
            try:
                return qs.filter(perfil_tutor=user.perfil_tutor)
            except Exception:
                return Notificacion.objects.none()

        return Notificacion.objects.none()


# ============================================================
# VALORACIONES
# ============================================================
class ValoracionViewSet(viewsets.ModelViewSet):
    queryset = (
        Valoracion.objects
        .select_related("autor", "usuario")
        .all()
        .order_by("-creado_en")
    )
    serializer_class = ValoracionSerializer
    permission_classes = [permissions.IsAuthenticated, ValoracionPermission]

    def get_queryset(self):
        qs = super().get_queryset()
        usuario_id = self.request.query_params.get("usuario")
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        return qs

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "rol", "").upper() == "ADMIN":
            raise MethodNotAllowed("POST", detail="ADMIN no puede registrar valoraciones.")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if getattr(request.user, "rol", "").upper() == "ADMIN":
            raise MethodNotAllowed("PUT", detail="ADMIN no puede modificar valoraciones.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if getattr(request.user, "rol", "").upper() == "ADMIN":
            raise MethodNotAllowed("PATCH", detail="ADMIN no puede modificar valoraciones.")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "rol", "").upper() == "ADMIN":
            raise MethodNotAllowed("DELETE", detail="ADMIN no puede eliminar valoraciones.")
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)

    @action(detail=False, methods=["get"], url_path="ranking")
    def ranking(self, request):
        data = (
            Valoracion.objects
            .values("usuario")
            .annotate(
                promedio_puntuacion=Avg("puntuacion"),
                total_valoraciones=Count("id"),
            )
            .order_by("-promedio_puntuacion")
        )
        return Response(list(data))


# ============================================================
# SEGUIMIENTOS (te mantengo lo tuyo)
# ============================================================




# ============================================================
# BUSCADOR
# ============================================================
class BuscadorViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        q = (request.query_params.get("q") or "").strip()
        user = request.user

        qs = Mascota.objects.select_related("especie", "raza", "perfil_tutor").all()

        cartilla_exists = CartillaMedica.objects.filter(mascota_id=OuterRef("pk"))
        qs = qs.annotate(tiene_cartilla=Exists(cartilla_exists))

        if is_adoptante(user):
            qs = qs.filter(estado="DISPONIBLE", tiene_cartilla=True)
            qs = filter_activo_if_exists(qs, True)
        elif is_tutor(user):
            qs = qs.filter(perfil_tutor_id=user.perfil_tutor.id)
        elif is_admin(user):
            pass
        else:
            return Response([], status=200)

        if q:
            qs = qs.filter(
                Q(nombre__icontains=q)
                | Q(descripcion__icontains=q)
                | Q(especie__nombre__icontains=q)
                | Q(raza__nombre__icontains=q)
            )

        data = MascotaSerializer(qs[:50], many=True, context={"request": request}).data
        return Response(data)


# ============================================================
# LISTAS DE PERFILES
# ============================================================
class PerfilTutorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PerfilTutorListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PerfilTutor.objects.select_related("user").all().order_by("-id")


class PerfilAdoptanteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PerfilAdoptanteListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PerfilAdoptante.objects.select_related("user").all().order_by("-id")


# ============================================================
# ADMIN STATS (solo admin)
# ============================================================
class AdminStatsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _only_admin(self, request):
        if not is_admin(request.user):
            return Response({"detail": "No autorizado."}, status=403)
        return None

    @action(detail=False, methods=["get"], url_path="mascotas-disponibles-top-razas")
    def mascotas_disponibles_top_razas(self, request):
        deny = self._only_admin(request)
        if deny:
            return deny

        top = int(request.query_params.get("top", 10))

        cartilla_exists = CartillaMedica.objects.filter(mascota_id=OuterRef("pk"))

        base = (
            Mascota.objects
            .annotate(tiene_cartilla=Exists(cartilla_exists))
            .filter(estado="DISPONIBLE", tiene_cartilla=True)
        )
        base = filter_activo_if_exists(base, True)

        qs = (
            base.values("especie__nombre", "raza__nombre")
            .annotate(total=Count("id"))
            .order_by("-total")[:top]
        )

        serializer = MascotasTopRazaSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="solicitudes-por-tutor")
    def solicitudes_por_tutor(self, request):
        deny = self._only_admin(request)
        if deny:
            return deny

        qs = (
            SolicitudAdopcion.objects
            .values(
                "mascota__perfil_tutor_id",
                "mascota__perfil_tutor__user__email",
                "mascota__perfil_tutor__user__nombres",
                "mascota__perfil_tutor__user__apellidos",
            )
            .annotate(
                total=Count("id"),
                aprobadas=Count("id", filter=Q(estado="APROBADA")),
                rechazadas=Count("id", filter=Q(estado="RECHAZADA")),
                pendientes=Count("id", filter=Q(estado="PENDIENTE")),
            )
            .order_by("-total")
        )

        data = []
        for r in qs:
            total = r["total"] or 0
            r["tasa_aprobacion"] = (r["aprobadas"] / total) if total else 0
            r["tasa_rechazo"] = (r["rechazadas"] / total) if total else 0
            data.append(r)

        serializer = SolicitudesPorTutorSerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="seguimientos-cumplimiento")
    def seguimientos_cumplimiento(self, request):
        deny = self._only_admin(request)
        if deny:
            return deny

        freq_days = {
            "DIARIO": 1,
            "SEMANAL": 7,
            "QUINCENAL": 15,
            "MENSUAL": 30,
            "TRIMESTRAL": 90,
        }

        configs = (
            SeguimientoConfig.objects
            .select_related(
                "solicitud",
                "solicitud__mascota",
                "solicitud__perfil_adoptante__user",
                "solicitud__mascota__perfil_tutor__user",
            )
            .filter(activo=True, inicio__isnull=False, solicitud__estado="APROBADA")
        )

        hoy = timezone.now().date()

        al_dia = 0
        atrasados = 0
        sin_frecuencia = 0
        detalle = []

        for cfg in configs:
            frec = (cfg.frecuencia or "").upper()
            if frec not in freq_days:
                sin_frecuencia += 1
                continue

            dias = freq_days[frec]
            limite = hoy - timedelta(days=dias)

            last_ev = (
                SeguimientoSolicitud.objects
                .filter(solicitud_id=cfg.solicitud_id)
                .order_by("-fecha")
                .values_list("fecha", flat=True)
                .first()
            )

            ok = bool(last_ev and last_ev >= limite)

            if ok:
                al_dia += 1
            else:
                atrasados += 1

            detalle.append({
                "solicitud_id": cfg.solicitud_id,
                "mascota": cfg.solicitud.mascota.nombre,
                "tutor": f"{cfg.solicitud.mascota.perfil_tutor.user.nombres} {cfg.solicitud.mascota.perfil_tutor.user.apellidos}",
                "adoptante": f"{cfg.solicitud.perfil_adoptante.user.nombres} {cfg.solicitud.perfil_adoptante.user.apellidos}",
                "frecuencia": cfg.frecuencia,
                "ultimo_envio": str(last_ev) if last_ev else None,
                "estado": "AL_DIA" if ok else "ATRASADO",
            })

        response_data = {
            "resumen": {"al_dia": al_dia, "atrasados": atrasados, "sin_frecuencia": sin_frecuencia},
            "detalle": detalle,
        }

        serializer = SeguimientoCumplimientoResponseSerializer(response_data)
        return Response(serializer.data)
    

    from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

class SolicitudAdopcionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, SolicitudAdopcionPermission]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", None)

        qs = SolicitudAdopcion.objects.select_related(
            "mascota",
            "mascota__perfil_tutor",
            "mascota__perfil_tutor__user",
            "perfil_adoptante",
            "perfil_adoptante__user",
        ).order_by("-created_at")

        if rol == "ADOPTANTE":
            try:
                perfil = user.perfil_adoptante
            except Exception:
                return SolicitudAdopcion.objects.none()
            return qs.filter(perfil_adoptante=perfil)

        if rol == "TUTOR":
            try:
                perfil_tutor = user.perfil_tutor
            except Exception:
                return SolicitudAdopcion.objects.none()
            return qs.filter(mascota__perfil_tutor=perfil_tutor)

        if rol == "ADMIN":
            return qs

        return SolicitudAdopcion.objects.none()

    def get_serializer_class(self):
        if self.action in ["update", "partial_update"] and getattr(self.request.user, "rol", None) == "TUTOR":
            return SolicitudTutorEstadoSerializer
        return SolicitudAdopcionSerializer

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "rol", None) != "ADOPTANTE":
            raise PermissionDenied("Solo un adoptante puede crear solicitudes.")
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "rol", None) != "ADOPTANTE":
            raise PermissionDenied("Solo un adoptante puede eliminar solicitudes.")

        instance = self.get_object()

        if instance.perfil_adoptante.user_id != request.user.id:
            raise PermissionDenied("Solo puedes eliminar tu propia solicitud.")

        if instance.estado != "PENDIENTE":
            raise PermissionDenied("Solo puedes eliminar solicitudes en estado PENDIENTE.")

        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        rol = getattr(request.user, "rol", None)
        instance = self.get_object()

        if rol == "TUTOR":
            if instance.mascota.perfil_tutor.user_id != request.user.id:
                raise PermissionDenied("No puedes modificar solicitudes de mascotas que no son tuyas.")
            return super().update(request, *args, **kwargs)

        if rol == "ADOPTANTE":
            raise PermissionDenied("El adoptante no puede modificar la solicitud.")

        if rol == "ADMIN":
            # 🔒 Admin solo lectura -> lo bloqueará el Permission, pero por si acaso:
            raise PermissionDenied("ADMIN solo lectura.")

        raise PermissionDenied("No autorizado.")
    

class TutorSolicitudSeguimientoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SolicitudAdopcionSerializer
    permission_classes = [permissions.IsAuthenticated, IsTutorOrAdminReadOnly]

    def get_queryset(self):
        qs = (
            SolicitudAdopcion.objects.select_related(
                "mascota",
                "perfil_adoptante__user",
                "mascota__perfil_tutor__user",
            )
            .filter(estado="APROBADA")
            .order_by("-updated_at")
        )

        if is_admin(self.request.user):
            return qs

        perfil_tutor = self.request.user.perfil_tutor
        return qs.filter(mascota__perfil_tutor=perfil_tutor)
    



class SeguimientoConfigViewSet(viewsets.ModelViewSet):
    serializer_class = SeguimientoConfigSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsTutorOrAdminReadOnly,
    ]

    # ============================================================
    # CONSULTAR CONFIGURACIONES DE SEGUIMIENTO
    # ADMIN: consulta todas
    # TUTOR: consulta solamente las de sus mascotas
    # ============================================================
    def get_queryset(self):
        qs = (
            SeguimientoConfig.objects.select_related(
                "solicitud",
                "solicitud__mascota",
                "solicitud__perfil_adoptante__user",
                "solicitud__mascota__perfil_tutor__user",
            )
            .filter(solicitud__estado="APROBADA")
            .order_by("-actualizado_en")
        )

        if is_admin(self.request.user):
            return qs

        if is_tutor(self.request.user):
            return qs.filter(
                solicitud__mascota__perfil_tutor=(
                    self.request.user.perfil_tutor
                )
            )

        return qs.none()

    # ============================================================
    # BLOQUEAR EDICIÓN DE CONFIGURACIONES
    # ============================================================
    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "PUT",
            detail="No se puede modificar una configuración existente."
        )

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed(
            "PATCH",
            detail="No se puede modificar una configuración existente."
        )

    # ============================================================
    # CREAR CONFIGURACIÓN DE SEGUIMIENTO
    # SOLO TUTOR DE LA MASCOTA
    # ============================================================
    def create(self, request, *args, **kwargs):

        if not is_tutor(request.user):
            raise PermissionDenied(
                "Solo un tutor puede configurar seguimientos."
            )

        solicitud_id = request.data.get("solicitud")

        if not solicitud_id:
            return Response(
                {"detail": "El campo solicitud es obligatorio."},
                status=400
            )

        try:
            sol = SolicitudAdopcion.objects.select_related(
                "mascota__perfil_tutor"
            ).get(id=solicitud_id)

        except SolicitudAdopcion.DoesNotExist:
            return Response(
                {"detail": "Solicitud no encontrada."},
                status=404
            )

        if sol.estado != "APROBADA":
            return Response(
                {
                    "detail": (
                        "Solo se puede configurar seguimiento "
                        "para solicitudes aprobadas."
                    )
                },
                status=400
            )

        if sol.mascota.perfil_tutor_id != request.user.perfil_tutor.id:
            raise PermissionDenied(
                "No puedes configurar el seguimiento "
                "de una mascota que no te pertenece."
            )

        if SeguimientoConfig.objects.filter(solicitud=sol).exists():
            return Response(
                {
                    "detail": (
                        "Ya existe una configuración "
                        "para esta solicitud."
                    )
                },
                status=400
            )

        return super().create(request, *args, **kwargs)

    # ============================================================
    # INICIAR SEGUIMIENTO
    # SOLO TUTOR
    # ============================================================
    @action(detail=True, methods=["post"], url_path="iniciar")
    def iniciar(self, request, pk=None):

        import logging
        logger = logging.getLogger(__name__)

        if not is_tutor(request.user):
            raise PermissionDenied(
                "Solo un tutor puede iniciar seguimientos."
            )

        cfg = self.get_object()
        sol = cfg.solicitud

        if sol.estado != "APROBADA":
            return Response(
                {
                    "detail": (
                        "Solo se puede iniciar seguimiento "
                        "para solicitudes aprobadas."
                    )
                },
                status=400
            )

        hoy = timezone.now().date()

        cfg.activo = True
        cfg.inicio = hoy

        if (cfg.modo or "").upper() == "AUTO":
            cfg.proximo_envio = hoy
        else:
            cfg.proximo_envio = None

        cfg.save()

        # --------------------------------------------------------
        # REGISTRAR NOTIFICACIÓN INTERNA
        # --------------------------------------------------------
        try:
            Notificacion.objects.create(
                solicitud=sol,
                perfil_tutor=request.user.perfil_tutor,
                tipo="SEGUIMIENTO_INICIADO",
                titulo=(
                    f"Seguimiento iniciado ({sol.mascota.nombre})"
                ),
                cuerpo=f"Se inició seguimiento el {hoy}.",
            )

        except Exception:
            logger.exception(
                "No se pudo registrar la notificación "
                "del seguimiento %s",
                cfg.pk
            )

        # --------------------------------------------------------
        # NOTIFICAR AL ADOPTANTE POR GMAIL
        # El seguimiento permanece iniciado aunque falle Gmail.
        # Pero NO se anuncia que el correo fue enviado.
        # --------------------------------------------------------
        correo_enviado = False

        try:
            correo_enviado = (
                send_email_adoptante_recordatorio(
                    cfg,
                    titulo_extra="Seguimiento iniciado"
                ) is True
            )

            if not correo_enviado:
                logger.error(
                    "Gmail no confirmó el correo de inicio "
                    "del seguimiento %s",
                    cfg.pk
                )

        except Exception:
            logger.exception(
                "Error enviando correo de inicio "
                "del seguimiento %s",
                cfg.pk
            )

        return Response(
            {
                "detail": (
                    "Seguimiento iniciado y Gmail aceptó "
                    "la notificación."
                    if correo_enviado
                    else
                    "Seguimiento iniciado correctamente, "
                    "pero no se pudo confirmar el envío "
                    "del correo al adoptante."
                ),
                "correo_enviado": correo_enviado,
                "config": SeguimientoConfigSerializer(
                    cfg,
                    context={"request": request}
                ).data,
            },
            status=200
        )

    # ============================================================
    # SOLICITAR EVIDENCIAS AL ADOPTANTE
    # SOLO TUTOR
    # ============================================================
    @action(
        detail=True,
        methods=["post"],
        url_path="recordatorio-manual"
    )
    def recordatorio_manual(self, request, pk=None):

        import logging
        logger = logging.getLogger(__name__)

        if not is_tutor(request.user):
            raise PermissionDenied(
                "Solo un tutor puede solicitar evidencias."
            )

        # Comprueba que el seguimiento corresponde
        # a una mascota del tutor autenticado.
        cfg = self.get_object()

        if cfg.solicitud.estado != "APROBADA":
            return Response(
                {
                    "detail": (
                        "No se pueden solicitar evidencias "
                        "de una adopción no aprobada."
                    )
                },
                status=400
            )

        if not cfg.activo:
            return Response(
                {
                    "detail": "El seguimiento está inactivo."
                },
                status=400
            )

        if not cfg.inicio:
            return Response(
                {
                    "detail": (
                        "Debes iniciar el seguimiento "
                        "antes de solicitar evidencias."
                    )
                },
                status=400
            )

        # --------------------------------------------------------
        # VERIFICAR DESTINATARIO
        # --------------------------------------------------------
        adoptante = cfg.solicitud.perfil_adoptante.user

        adoptante_email = (
            adoptante.email or ""
        ).strip()

        if not adoptante_email:
            return Response(
                {
                    "detail": (
                        "No se puede enviar el recordatorio: "
                        "el adoptante no tiene correo registrado."
                    )
                },
                status=400
            )

        # --------------------------------------------------------
        # ENVIAR CORREO REAL POR GMAIL API
        # --------------------------------------------------------
        try:
            resultado = send_email_adoptante_recordatorio(
                cfg,
                titulo_extra="Solicitud de evidencias"
            )

            # gmail_sender.py devuelve True solamente
            # cuando Gmail acepta el envío.
            if resultado is not True:

                logger.error(
                    "Gmail no confirmó la solicitud "
                    "de evidencias. Seguimiento ID: %s",
                    cfg.pk
                )

                return Response(
                    {
                        "detail": (
                            "No se pudo confirmar el envío "
                            "del correo al adoptante."
                        ),
                        "correo_enviado": False,
                    },
                    status=502
                )

            logger.info(
                "Gmail aceptó la solicitud de evidencias "
                "del seguimiento %s",
                cfg.pk
            )

            return Response(
                {
                    "detail": (
                        "Gmail aceptó el correo de solicitud "
                        "de evidencias para el adoptante."
                    ),
                    "correo_enviado": True,
                },
                status=200
            )

        except Exception:

            logger.exception(
                "Error enviando solicitud de evidencias "
                "del seguimiento %s",
                cfg.pk
            )

            return Response(
                {
                    "detail": (
                        "No se pudo enviar el correo al adoptante. "
                        "Revisa los registros del backend en Render."
                    ),
                    "correo_enviado": False,
                },
                status=502
            )

class AdoptanteSeguimientosViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SeguimientoConfigSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdoptanteOrAdminReadOnly]

    def get_queryset(self):
        qs = (
            SeguimientoConfig.objects.select_related(
                "solicitud",
                "solicitud__mascota",
                "solicitud__perfil_adoptante__user",
                "solicitud__mascota__perfil_tutor__user",
            )
            .filter(
                solicitud__estado="APROBADA",
                activo=True,
                inicio__isnull=False,
            )
            .order_by("-inicio")
        )

        if is_admin(self.request.user):
            return qs

        perfil_adoptante = self.request.user.perfil_adoptante
        return qs.filter(
            solicitud__perfil_adoptante=perfil_adoptante,
        )
    

class EvidenciasViewSet(viewsets.ModelViewSet):

    serializer_class = SeguimientoSolicitudSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            SeguimientoSolicitud.objects.select_related(
                "solicitud",
                "solicitud__mascota",
                "solicitud__mascota__perfil_tutor__user",
                "solicitud__perfil_adoptante__user",
            )
            .order_by("-fecha")
        )

        user = self.request.user

        if is_admin(user):
            return qs

        if is_tutor(user):
            return qs.filter(
                solicitud__mascota__perfil_tutor=user.perfil_tutor
            )

        if is_adoptante(user):
            return qs.filter(
                solicitud__perfil_adoptante=user.perfil_adoptante
            )

        return qs.none()

    def create(self, request, *args, **kwargs):
        if not is_adoptante(request.user):
            raise PermissionDenied(
                "Solo el adoptante puede subir evidencias."
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not is_adoptante(request.user):
            raise PermissionDenied(
                "Solo el adoptante puede modificar evidencias."
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not is_adoptante(request.user):
            raise PermissionDenied(
                "Solo el adoptante puede modificar evidencias."
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_adoptante(request.user):
            raise PermissionDenied(
                "Solo el adoptante puede eliminar evidencias."
            )
        return super().destroy(request, *args, **kwargs)
