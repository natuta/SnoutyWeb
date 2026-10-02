# catalog/permissions.py
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import permissions


# ============================================================
# HELPERS DE ROL
# (✅ OneToOne: usar try/except para verificar que exista el registro)
# ============================================================
def role(user) -> str:
    if not user or not getattr(user, "is_authenticated", False):
        return ""
    return (getattr(user, "rol", "") or "").upper().strip()


def is_admin(user) -> bool:
    return bool(user and getattr(user, "is_authenticated", False) and role(user) == "ADMIN")


def is_tutor(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False) or role(user) != "TUTOR":
        return False
    try:
        _ = user.perfil_tutor
        return True
    except ObjectDoesNotExist:
        return False


def is_adoptante(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False) or role(user) != "ADOPTANTE":
        return False
    try:
        _ = user.perfil_adoptante
        return True
    except ObjectDoesNotExist:
        return False


# ============================================================
# PERMISOS SIMPLES POR ROL (usados por varias vistas)
# ============================================================
class IsTutor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_tutor(request.user))


class IsAdoptante(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_adoptante(request.user))


# ============================================================
# NUEVOS: Tutor/Adoptante permitidos, Admin SOLO LECTURA
# ============================================================
class IsTutorOrAdminReadOnly(permissions.BasePermission):
    """
    - TUTOR: permitido
    - ADMIN: solo lectura (SAFE_METHODS)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if is_tutor(user):
            return True
        if is_admin(user):
            return request.method in permissions.SAFE_METHODS
        return False


class IsAdoptanteOrAdminReadOnly(permissions.BasePermission):
    """
    - ADOPTANTE: permitido
    - ADMIN: solo lectura (SAFE_METHODS)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if is_adoptante(user):
            return True
        if is_admin(user):
            return request.method in permissions.SAFE_METHODS
        return False


# ============================================================
# MASCOTAS
# REGLA FINAL:
# - ADMIN: CRUD + listar/ver todo
# - TUTOR: SOLO lectura de sus mascotas
# - ADOPTANTE: SOLO lectura (queryset filtra DISPONIBLE + activo + con cartilla)
# ============================================================
class MascotaPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_tutor(user) or is_adoptante(user):
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if is_admin(user):
            return True

        if request.method not in permissions.SAFE_METHODS:
            return False

        if is_tutor(user):
            try:
                return obj.perfil_tutor_id == user.perfil_tutor.id
            except ObjectDoesNotExist:
                return False

        if is_adoptante(user):
            return obj.estado == "DISPONIBLE"

        return False


# ============================================================
# FOTOS MASCOTA
# REGLA FINAL:
# - SOLO TUTOR puede crear/editar/eliminar
# - ADMIN: solo lectura
# - ADOPTANTE: solo lectura
# ============================================================
class FotoMascotaPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_tutor(user):
            return True

        if is_admin(user) or is_adoptante(user):
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if request.method not in permissions.SAFE_METHODS:
            if not is_tutor(user):
                return False
            try:
                return obj.mascota.perfil_tutor_id == user.perfil_tutor.id
            except ObjectDoesNotExist:
                return False

        if is_tutor(user):
            try:
                return obj.mascota.perfil_tutor_id == user.perfil_tutor.id
            except ObjectDoesNotExist:
                return False

        if is_admin(user) or is_adoptante(user):
            return True

        return False


# ============================================================
# HISTORIAL MÉDICO
# REGLA FINAL:
# - ADMIN: CRUD
# - TUTOR: SOLO lectura de lo suyo (queryset debe filtrar)
# - ADOPTANTE: nada
# ============================================================
class HistorialMedicoPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_tutor(user):
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if is_admin(user):
            return True

        if request.method not in permissions.SAFE_METHODS:
            return False

        if is_tutor(user):
            mascota = getattr(obj, "mascota", None)
            if mascota is not None:
                try:
                    return mascota.perfil_tutor_id == user.perfil_tutor.id
                except ObjectDoesNotExist:
                    return False
            return True

        return False


# ============================================================
# CARTILLAS
# REGLA FINAL:
# - ADMIN: CRUD
# - TUTOR: SOLO lectura de las de sus mascotas
# ============================================================
class CartillaMedicaPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_tutor(user):
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if is_admin(user):
            return True

        if request.method not in permissions.SAFE_METHODS:
            return False

        if is_tutor(user):
            try:
                return obj.mascota.perfil_tutor_id == user.perfil_tutor.id
            except ObjectDoesNotExist:
                return False

        return False


# ============================================================
# VACUNAS
# REGLA FINAL:
# - ADMIN: CRUD
# - TUTOR: SOLO lectura de vacunas de sus mascotas
# ============================================================
class VacunaPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_tutor(user):
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if is_admin(user):
            return True

        if request.method not in permissions.SAFE_METHODS:
            return False

        if is_tutor(user):
            try:
                return obj.cartilla_medica.mascota.perfil_tutor_id == user.perfil_tutor.id
            except ObjectDoesNotExist:
                return False

        return False


# ============================================================
# SOLICITUDES DE ADOPCIÓN
# REGLA FINAL (según tu pedido):
# - ADMIN: SOLO LECTURA (list/retrieve)
# - ADOPTANTE: list/retrieve/create/delete (no update/patch)
# - TUTOR: list/retrieve + update/patch (no create/delete)
# ============================================================
class SolicitudAdopcionPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # ✅ ADMIN solo lectura
        if is_admin(user):
            return request.method in permissions.SAFE_METHODS

        if is_adoptante(user):
            if request.method in ("PUT", "PATCH"):
                return False
            return True

        if is_tutor(user):
            if request.method in ("POST", "DELETE"):
                return False
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        # ✅ ADMIN solo lectura
        if is_admin(user):
            return request.method in permissions.SAFE_METHODS

        if is_adoptante(user):
            return getattr(obj.perfil_adoptante, "user_id", None) == user.id

        if is_tutor(user):
            return getattr(obj.mascota.perfil_tutor, "user_id", None) == user.id

        return False


# ============================================================
# NOTIFICACIONES (ReadOnly)
# - ADMIN: ve todo
# - TUTOR: ve solo sus notificaciones
# ============================================================
class NotificacionPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method not in permissions.SAFE_METHODS:
            return False

        return is_admin(user) or is_tutor(user)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_admin(user):
            return True
        if is_tutor(user):
            return getattr(obj.perfil_tutor, "user_id", None) == user.id
        return False


# ============================================================
# VALORACIONES
# - ADMIN: solo lectura
# - TUTOR/ADOPTANTE: permitido
# ============================================================
class ValoracionPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if is_admin(user):
            return request.method in permissions.SAFE_METHODS

        if is_tutor(user) or is_adoptante(user):
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_admin(user):
            return True
        if is_tutor(user) or is_adoptante(user):
            return True
        return False