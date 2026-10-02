# catalog/admin.py
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    Administrador,
    Especie,
    PerfilAdoptante,
    PerfilTutor,
    Raza,
    
    Mascota,
    FotoMascota,
    HistorialMedico,
    CartillaMedica,
    Vacuna,
    SolicitudAdopcion,
    Notificacion,
    Valoracion,
    SeguimientoSolicitud,
    SeguimientoConfig,
)

User = get_user_model()


@admin.register(User)
class UsuarioAdmin(DjangoUserAdmin):
    # como tu USERNAME_FIELD es email:
    ordering = ("id",)
    list_display = ("id", "email", "rol", "nombres", "apellidos", "telefono", "is_active", "is_staff")
    list_filter = ("rol", "is_active", "is_staff", "is_superuser")
    search_fields = ("email", "nombres", "apellidos", "telefono")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {"fields": ("rol", "nombres", "apellidos", "telefono", "foto_perfil_s3", "foto_perfil_file")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "rol", "nombres", "apellidos", "telefono", "password1", "password2", "is_active", "is_staff"),
        }),
    )

    # tu modelo NO tiene username:
    username_field = "email"


@admin.register(PerfilTutor)
class PerfilTutorAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "nit")
    search_fields = ("user__email", "user__nombres", "user__apellidos", "nit")


@admin.register(PerfilAdoptante)
class PerfilAdoptanteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "ci", "tiene_patio")
    search_fields = ("user__email", "user__nombres", "user__apellidos", "ci")


@admin.register(Administrador)
class AdministradorAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "tipo")
    search_fields = ("user__email", "tipo")


@admin.register(Especie)
class EspecieAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre")
    search_fields = ("nombre",)


@admin.register(Raza)
class RazaAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "especie")
    search_fields = ("nombre", "especie__nombre")
    list_filter = ("especie",)




@admin.register(Mascota)
class MascotaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nombre",
        "estado",
        "sexo",
        "especie",
        "raza",
        "ubicacion",      # ✅ ahora es texto
        "perfil_tutor",
        "fecha_registro",
    )

    search_fields = (
        "nombre",
        "descripcion",
        "ubicacion",      # ✅ búsqueda por texto
        "especie__nombre",
        "raza__nombre",
        "perfil_tutor__user__email",
    )

    list_filter = (
        "estado",
        "sexo",
        "especie",
    )


@admin.register(FotoMascota)
class FotoMascotaAdmin(admin.ModelAdmin):
    list_display = ("id", "mascota", "fecha", "s3_url")
    search_fields = ("mascota__nombre", "mascota__perfil_tutor__user__email")


@admin.register(HistorialMedico)
class HistorialMedicoAdmin(admin.ModelAdmin):
    list_display = ("id", "aws_s3_file")
    search_fields = ("aws_s3_file",)


@admin.register(CartillaMedica)
class CartillaMedicaAdmin(admin.ModelAdmin):
    list_display = ("id", "mascota", "fecha", "esterilizado")
    search_fields = ("mascota__nombre", "mascota__perfil_tutor__user__email")
    list_filter = ("fecha", "esterilizado")


@admin.register(Vacuna)
class VacunaAdmin(admin.ModelAdmin):
    list_display = ("id", "cartilla_medica", "tipo", "fecha_aplicacion", "proxima_dosis")
    search_fields = ("tipo", "cartilla_medica__mascota__nombre")
    list_filter = ("tipo", "fecha_aplicacion")


@admin.register(SolicitudAdopcion)
class SolicitudAdopcionAdmin(admin.ModelAdmin):
    list_display = ("id", "mascota", "perfil_adoptante", "estado", "created_at")
    search_fields = ("mascota__nombre", "perfil_adoptante__user__email")
    list_filter = ("estado", "created_at")


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("id", "perfil_tutor", "tipo", "titulo", "leida", "creada_en")
    search_fields = ("titulo", "perfil_tutor__user__email")
    list_filter = ("leida", "tipo")


@admin.register(Valoracion)
class ValoracionAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "puntuacion", "creado_en")
    search_fields = ("usuario__email", "usuario__nombres", "usuario__apellidos")
    list_filter = ("puntuacion", "creado_en")



@admin.register(SeguimientoSolicitud)
class SeguimientoSolicitudAdmin(admin.ModelAdmin):
    list_display = ("id", "solicitud", "fecha", "s3_url")
    search_fields = ("solicitud__id", "solicitud__perfil_adoptante__user__email", "solicitud__mascota__nombre")
    list_filter = ("fecha",)


@admin.register(SeguimientoConfig)
class SeguimientoConfigAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "solicitud",
        "activo",
        "modo",
        "frecuencia",
        "inicio",
        "proximo_envio",
        "creado_en",
        "actualizado_en",
    )
    list_filter = ("activo", "modo", "frecuencia")
    search_fields = (
        "solicitud__id",
        "solicitud__perfil_adoptante__user__email",
        "solicitud__mascota__nombre",
        "solicitud__mascota__perfil_tutor__user__email",
    )