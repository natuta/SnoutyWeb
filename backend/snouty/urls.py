from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from catalog.api_auth import SnoutyTokenObtainPairView

from catalog.views import (
    AdminStatsViewSet,
    AdoptanteSeguimientosViewSet,
    BuscadorViewSet,
    EspecieViewSet,
    EvidenciasViewSet,
    PerfilAdoptanteViewSet,
    PerfilTutorViewSet,
    RazaViewSet,
    RegistroUsuarioViewSet,
    MascotaViewSet,
    FotoMascotaViewSet,
    FotoMascotaUploadView,
    HistorialMedicoViewSet,
    CartillaMedicaViewSet,
    TutorSolicitudSeguimientoViewSet,
    SeguimientoConfigViewSet,
    VacunaViewSet,
    SolicitudAdopcionViewSet,
    NotificacionViewSet,
    ValoracionViewSet,
    UsuarioViewSet,
)

# ============================================================
# ROUTER PRINCIPAL
# ============================================================

router = DefaultRouter()

router.register(r"registro", RegistroUsuarioViewSet, basename="registro")
router.register(r"usuarios", UsuarioViewSet, basename="usuarios")

router.register(r"especies", EspecieViewSet, basename="especie")
router.register(r"razas", RazaViewSet, basename="raza")

router.register(r"mascotas", MascotaViewSet, basename="mascota")
router.register(r"fotos-mascota", FotoMascotaViewSet, basename="foto_mascota")

router.register(
    r"historiales-medicos",
    HistorialMedicoViewSet,
    basename="historial_medico"
)

router.register(
    r"cartillas-medicas",
    CartillaMedicaViewSet,
    basename="cartilla_medica"
)

router.register(r"vacunas", VacunaViewSet, basename="vacuna")

router.register(r"buscador", BuscadorViewSet, basename="buscador")

router.register(
    r"admin/stats",
    AdminStatsViewSet,
    basename="admin-stats"
)

router.register(
    r"solicitudes-adopcion",
    SolicitudAdopcionViewSet,
    basename="solicitud_adopcion"
)

router.register(
    r"notificaciones",
    NotificacionViewSet,
    basename="notificacion"
)

router.register(
    r"valoraciones",
    ValoracionViewSet,
    basename="valoracion"
)

router.register(
    r"perfiles-tutor",
    PerfilTutorViewSet,
    basename="perfiles-tutor"
)

router.register(
    r"perfiles-adoptante",
    PerfilAdoptanteViewSet,
    basename="perfiles-adoptante"
)

# ============================================================
# SEGUIMIENTO
# ============================================================

router.register(
    r"tutor/seguimientos/solicitudes",
    TutorSolicitudSeguimientoViewSet,
    basename="tutor-solicitudes-seguimiento",
)

router.register(
    r"seguimiento-config",
    SeguimientoConfigViewSet,
    basename="seguimiento-config",
)

router.register(
    r"adoptante/seguimientos/configs",
    AdoptanteSeguimientosViewSet,
    basename="adoptante-configs",
)

router.register(
    r"seguimientos/evidencias",
    EvidenciasViewSet,
    basename="seguimientos-evidencias",
)

# ============================================================
# PAGINA PRINCIPAL PUBLICA
# ============================================================

def home(request):
    return JsonResponse(
        {
            "status": "ok",
            "message": "API de Snouty funcionando correctamente"
        }
    )

# ============================================================
# URLS PRINCIPALES
# ============================================================

urlpatterns = [
    # ADMIN DJANGO
    path("admin/", admin.site.urls),

    # ========================================================
    # LOGIN JWT
    # ========================================================

    path(
        "api/token/",
        SnoutyTokenObtainPairView.as_view(),
        name="token_obtain_pair"
    ),

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh"
    ),

    # ========================================================
    # SUBIDA MULTIPLE DE FOTOS
    # ========================================================

    path(
        "api/fotos-mascota/upload/",
        FotoMascotaUploadView.as_view(),
        name="fotos-mascota-upload",
    ),

    # ========================================================
    # TODAS LAS APIS REST
    # ========================================================

    path(
        "api/",
        include(router.urls)
    ),

    # ========================================================
    # PAGINA PRINCIPAL
    # ========================================================

    path(
        "",
        home,
        name="home"
    ),
]