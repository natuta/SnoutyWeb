# catalog/serializers.py
from __future__ import annotations

from urllib.parse import urlparse

import boto3
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

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
    PerfilTutor,
    PerfilAdoptante,
    SeguimientoConfig,
    SeguimientoSolicitud,
)

UserModel = get_user_model()


# ============================================================
# HELPERS DE ROL / AUTH / OWNERSHIP
# ============================================================
def _get_user(request) -> AbstractBaseUser | None:
    return getattr(request, "user", None)


def _get_rol(request) -> str:
    u = _get_user(request)
    if u and getattr(u, "is_authenticated", False):
        return (getattr(u, "rol", "") or "").upper().strip()
    return ""


def _require_auth(request) -> AbstractBaseUser:
    u = _get_user(request)
    if not u or not getattr(u, "is_authenticated", False):
        raise serializers.ValidationError("No autenticado.")
    return u


def _require_tutor_profile(user: AbstractBaseUser) -> PerfilTutor:
    try:
        return user.perfil_tutor
    except Exception:
        raise serializers.ValidationError("El usuario no tiene perfil de tutor.")


def _require_adoptante_profile(user: AbstractBaseUser) -> PerfilAdoptante:
    try:
        return user.perfil_adoptante
    except Exception:
        raise serializers.ValidationError("El usuario no tiene perfil de adoptante.")

def _mascota_is_from_tutor(mascota: Mascota, tutor_user: AbstractBaseUser) -> bool:
    return bool(mascota and mascota.perfil_tutor and mascota.perfil_tutor.user_id == tutor_user.id)


def _cartilla_is_from_tutor(cartilla: CartillaMedica, tutor_user: AbstractBaseUser) -> bool:
    return bool(cartilla and cartilla.mascota and _mascota_is_from_tutor(cartilla.mascota, tutor_user))


def _solicitud_is_from_tutor(solicitud: SolicitudAdopcion, tutor_user: AbstractBaseUser) -> bool:
    return bool(solicitud and solicitud.mascota and _mascota_is_from_tutor(solicitud.mascota, tutor_user))


def _solicitud_is_from_adoptante(solicitud: SolicitudAdopcion, adoptante_user: AbstractBaseUser) -> bool:
    return bool(
        solicitud
        and solicitud.perfil_adoptante
        and solicitud.perfil_adoptante.user_id == adoptante_user.id
    )


# ============================================================
# REGISTRO (TUTOR / ADOPTANTE)
# ============================================================
class RegistroUsuarioSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)

    rol = serializers.ChoiceField(choices=["TUTOR", "ADOPTANTE"])

    nombres = serializers.CharField()
    apellidos = serializers.CharField()
    telefono = serializers.CharField()

    foto_perfil_file = serializers.ImageField(required=True)

    # tutor
    nit = serializers.CharField(required=False, allow_blank=True)

    # adoptante (datos)
    ci = serializers.CharField(required=False, allow_blank=True)
    tiene_patio = serializers.BooleanField(required=False, default=False)

    ocupacion = serializers.CharField(required=False, allow_blank=True)
    direccion = serializers.CharField(required=False, allow_blank=True)
    edad = serializers.IntegerField(required=False, allow_null=True)
    sexo = serializers.ChoiceField(choices=["M", "F", "O"], required=False, allow_null=True)

    # adoptante (archivos)
    ci_file = serializers.FileField(required=False)
    garante_file = serializers.FileField(required=False)
    recibo_luz_file = serializers.FileField(required=False)  # ✅ recibo luz
    fachada_file = serializers.FileField(required=False)
    domicilio_file = serializers.FileField(required=False)
    croquis_file = serializers.FileField(required=False)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        attrs["email"] = email

        if UserModel.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Ya hay un usuario con este correo."})

        rol = attrs.get("rol")

        if rol == "ADOPTANTE":
            if not attrs.get("ci"):
                raise serializers.ValidationError({"ci": "CI es requerido para adoptantes."})

            if not attrs.get("recibo_luz_file"):
                raise serializers.ValidationError(
                    {"recibo_luz_file": "El recibo de luz es obligatorio para adoptantes."}
                )

            edad = attrs.get("edad", None)
            if edad is not None:
                try:
                    edad_int = int(edad)
                except Exception:
                    raise serializers.ValidationError({"edad": "Edad inválida."})
                if edad_int < 0 or edad_int > 120:
                    raise serializers.ValidationError({"edad": "Edad fuera de rango (0-120)."})
                attrs["edad"] = edad_int

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        rol = validated_data["rol"]

        foto_perfil_file = validated_data.pop("foto_perfil_file")

        # tutor
        nit = validated_data.pop("nit", "")

        # adoptante (datos)
        ci = validated_data.pop("ci", "")
        tiene_patio = validated_data.pop("tiene_patio", False)

        ocupacion = validated_data.pop("ocupacion", "")
        direccion = validated_data.pop("direccion", "")
        edad = validated_data.pop("edad", None)
        sexo = validated_data.pop("sexo", None)

        # adoptante (archivos)
        ci_file = validated_data.pop("ci_file", None)
        garante_file = validated_data.pop("garante_file", None)
        recibo_luz_file = validated_data.pop("recibo_luz_file", None)
        fachada_file = validated_data.pop("fachada_file", None)
        domicilio_file = validated_data.pop("domicilio_file", None)
        croquis_file = validated_data.pop("croquis_file", None)

        user = UserModel.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            rol=rol,
            nombres=validated_data["nombres"],
            apellidos=validated_data["apellidos"],
            telefono=validated_data["telefono"],
            foto_perfil_s3="",
            foto_perfil_file=foto_perfil_file,
            is_active=True,
        )
        user.save()

        if rol == "TUTOR":
            PerfilTutor.objects.create(user=user, nit=nit)
        else:
            pa = PerfilAdoptante(
                user=user,
                ci=ci,
                tiene_patio=bool(tiene_patio),
                ocupacion=ocupacion or "",
                direccion=direccion or "",
                edad=edad,
                sexo=sexo,
                foto_ci_s3="",
                foto_garante_s3="",
                foto_recibo_luz_s3="",
                foto_fachada_s3="",
                foto_domicilio_s3="",
                foto_croquis_s3="",
                ci_file=ci_file,
                garante_file=garante_file,
                recibo_luz_file=recibo_luz_file,
                fachada_file=fachada_file,
                domicilio_file=domicilio_file,
                croquis_file=croquis_file,
            )
            pa.save()

        return user

    def to_representation(self, instance):
        data = {
            "id": instance.id,
            "email": instance.email,
            "rol": instance.rol,
            "nombres": instance.nombres,
            "apellidos": instance.apellidos,
            "telefono": instance.telefono,
            "foto_perfil_s3": instance.foto_perfil_s3,
            "is_active": instance.is_active,
        }

        if hasattr(instance, "perfil_tutor") and instance.perfil_tutor:
            data["perfil_tutor"] = {"id": instance.perfil_tutor.id, "nit": instance.perfil_tutor.nit}

        if hasattr(instance, "perfil_adoptante") and instance.perfil_adoptante:
            pa = instance.perfil_adoptante
            data["perfil_adoptante"] = {
                "id": pa.id,
                "ci": pa.ci,
                "tiene_patio": pa.tiene_patio,
                "ocupacion": pa.ocupacion,
                "direccion": pa.direccion,
                "edad": pa.edad,
                "sexo": pa.sexo,
                "foto_ci_s3": pa.foto_ci_s3,
                "foto_garante_s3": pa.foto_garante_s3,
                "foto_recibo_luz_s3": getattr(pa, "foto_recibo_luz_s3", ""),
                "foto_fachada_s3": pa.foto_fachada_s3,
                "foto_domicilio_s3": pa.foto_domicilio_s3,
                "foto_croquis_s3": pa.foto_croquis_s3,
                "ci_url": getattr(pa, "ci_url", None),
                "garante_url": getattr(pa, "garante_url", None),
                "recibo_luz_url": getattr(pa, "recibo_luz_url", None),
                "fachada_url": getattr(pa, "fachada_url", None),
                "domicilio_url": getattr(pa, "domicilio_url", None),
                "croquis_url": getattr(pa, "croquis_url", None),
            }

        return data


# ============================================================
# USUARIO
# Foto perfil: SOLO dueño (ni admin cambia foto ajena)
# ============================================================
class UsuarioSerializer(serializers.ModelSerializer):
    foto_perfil_file = serializers.ImageField(required=False, allow_null=True, write_only=True)

    nit = serializers.CharField(source="perfil_tutor.nit", read_only=True)

    ci = serializers.CharField(source="perfil_adoptante.ci", read_only=True)
    tiene_patio = serializers.BooleanField(source="perfil_adoptante.tiene_patio", read_only=True)
    ocupacion = serializers.CharField(source="perfil_adoptante.ocupacion", read_only=True)
    direccion = serializers.CharField(source="perfil_adoptante.direccion", read_only=True)
    edad = serializers.IntegerField(source="perfil_adoptante.edad", read_only=True)
    sexo = serializers.CharField(source="perfil_adoptante.sexo", read_only=True)

    foto_ci_s3 = serializers.CharField(source="perfil_adoptante.foto_ci_s3", read_only=True)
    foto_garante_s3 = serializers.CharField(source="perfil_adoptante.foto_garante_s3", read_only=True)
    foto_recibo_luz_s3 = serializers.CharField(source="perfil_adoptante.foto_recibo_luz_s3", read_only=True)
    foto_fachada_s3 = serializers.CharField(source="perfil_adoptante.foto_fachada_s3", read_only=True)
    foto_domicilio_s3 = serializers.CharField(source="perfil_adoptante.foto_domicilio_s3", read_only=True)
    foto_croquis_s3 = serializers.CharField(source="perfil_adoptante.foto_croquis_s3", read_only=True)

    class Meta:
        model = UserModel
        fields = [
            "id",
            "email",
            "rol",
            "nombres",
            "apellidos",
            "telefono",
            "foto_perfil_s3",
            "foto_perfil_file",
            "is_active",
            "is_staff",
            "date_joined",
            "nit",
            "ci",
            "tiene_patio",
            "ocupacion",
            "direccion",
            "edad",
            "sexo",
            "foto_ci_s3",
            "foto_garante_s3",
            "foto_recibo_luz_s3",
            "foto_fachada_s3",
            "foto_domicilio_s3",
            "foto_croquis_s3",
        ]
        read_only_fields = ["id", "date_joined", "foto_perfil_s3"]

    def validate(self, attrs):
        request = self.context.get("request")
        auth_user = _require_auth(request)
        rol = _get_rol(request)

        # ✅ SOLO el dueño cambia su foto (ni admin)
        if "foto_perfil_file" in attrs:
            if self.instance and self.instance.id != auth_user.id:
                raise serializers.ValidationError(
                    {"foto_perfil_file": "Solo el dueño puede editar su propia foto."}
                )

        # ✅ NO-ADMIN: solo edita su propio usuario + no toca rol/activo/staff
        if rol != "ADMIN":
            if self.instance and self.instance.id != auth_user.id:
                raise serializers.ValidationError("Solo puedes editar tu propio usuario.")
            for f in ("rol", "is_active", "is_staff"):
                if f in attrs:
                    raise serializers.ValidationError({f: "No puedes modificar este campo."})

        return attrs

    def update(self, instance, validated_data):
        foto_file = validated_data.pop("foto_perfil_file", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if foto_file is not None:
            instance.foto_perfil_file = foto_file
        instance.save()
        return instance


# ============================================================
# ESPECIES / RAZAS
# ============================================================
class EspecieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especie
        fields = ["id", "nombre"]

    def validate(self, attrs):
        request = self.context.get("request")
        rol = _get_rol(request)
        if self.instance is None and rol != "ADMIN":
            raise serializers.ValidationError("Solo ADMIN puede registrar especies.")
        return attrs


class RazaSerializer(serializers.ModelSerializer):
    especie_id = serializers.PrimaryKeyRelatedField(source="especie", queryset=Especie.objects.all())

    class Meta:
        model = Raza
        fields = ["id", "especie_id", "nombre"]

    def validate_nombre(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre de la raza es obligatorio.")
        return value.strip()

    def validate(self, attrs):
        request = self.context.get("request")
        rol = _get_rol(request)

        if self.instance is None and rol != "ADMIN":
            raise serializers.ValidationError("Solo ADMIN puede registrar razas.")

        especie = attrs.get("especie")
        nombre = attrs.get("nombre") or getattr(self.instance, "nombre", None)

        if especie and nombre:
            qs = Raza.objects.filter(especie=especie, nombre__iexact=nombre.strip())
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError(
                    {"nombre": "Ya existe una raza con ese nombre para la especie seleccionada."}
                )

        return attrs


# ============================================================
# S3 helpers (si necesitas presign por s3_url)
# ============================================================
def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def _extract_bucket_and_key_from_url(s3_url: str):
    if not s3_url:
        return (None, None)

    p = urlparse(s3_url)
    host = p.netloc or ""
    path = (p.path or "").lstrip("/")

    if host.endswith(".s3.amazonaws.com"):
        bucket = host.replace(".s3.amazonaws.com", "")
        return bucket, path

    if ".s3." in host and host.endswith(".amazonaws.com"):
        bucket = host.split(".s3.")[0]
        return bucket, path

    if host.startswith("s3.") or host == "s3.amazonaws.com":
        if "/" in path:
            bucket, key = path.split("/", 1)
            return bucket, key

    return (None, None)


def _presign(bucket: str, key: str, expires_seconds: int = 3600) -> str:
    if not bucket or not key:
        return ""
    s3 = _s3_client()
    try:
        return s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )
    except Exception:
        return ""


# ============================================================
# FOTOS MASCOTA
# Reglas:
# - ADMIN: NO crea/edita/elimina (solo lectura)
# - TUTOR: gestiona fotos de SUS mascotas
# - ADOPTANTE: solo lectura (filtrado por viewset)
# ============================================================
from django.utils import timezone
from rest_framework import serializers

from .models import FotoMascota, Mascota

# usa tus helpers existentes:
# _require_auth, _get_rol, _mascota_is_from_tutor


class FotoMascotaSerializer(serializers.ModelSerializer):
    mascota_id = serializers.PrimaryKeyRelatedField(
        queryset=Mascota.objects.all(),
        source="mascota",
        required=True,
    )
    imagen_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FotoMascota
        fields = ["id", "mascota_id", "imagen", "s3_url", "imagen_url", "fecha"]
        extra_kwargs = {
            "imagen": {"required": False, "allow_null": True, "write_only": True},
            "s3_url": {"read_only": True},
            "fecha": {"required": False},
        }

    def get_imagen_url(self, obj):
        return getattr(obj, "imagen_url", None) or ""

    def validate(self, attrs):
        request = self.context.get("request")
        user = _require_auth(request)
        rol = _get_rol(request)

        # ✅ lectura: cualquiera autenticado según tus permisos de ViewSet/queryset
        if request and request.method in ("GET", "HEAD", "OPTIONS"):
            return attrs

        # ✅ SOLO TUTOR puede crear/editar/eliminar fotos
        if rol != "TUTOR":
            raise serializers.ValidationError("Solo TUTOR puede gestionar fotos de mascota.")

        # ✅ mascota: en create viene en attrs; en update puede venir o no
        mascota = attrs.get("mascota") or getattr(self.instance, "mascota", None)
        if not mascota:
            raise serializers.ValidationError({"mascota_id": "mascota_id es obligatorio."})

        # ✅ ownership: solo fotos de sus mascotas
        if not _mascota_is_from_tutor(mascota, user):
            raise serializers.ValidationError({"mascota_id": "Esa mascota no te pertenece."})

        # ✅ en create debes mandar imagen
        if self.instance is None and not attrs.get("imagen"):
            raise serializers.ValidationError({"imagen": "Debes enviar una imagen."})

        # ✅ en update: si mandan imagen, ok (si no mandan, también ok)
        return attrs

    def create(self, validated_data):
        # fecha por defecto
        if not validated_data.get("fecha"):
            validated_data["fecha"] = timezone.now().date()

        imagen = validated_data.get("imagen")
        if imagen is not None:
            try:
                imagen.seek(0)
            except Exception:
                pass

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # si actualizas imagen, resetea puntero
        imagen = validated_data.get("imagen")
        if imagen is not None:
            try:
                imagen.seek(0)
            except Exception:
                pass

        return super().update(instance, validated_data)

# ============================================================
# MASCOTAS
# Reglas:
# - ADMIN: CRUD total
# - TUTOR: SOLO lectura (lo controla el ViewSet + Permission)
# - ADOPTANTE: SOLO lectura (filtrado en ViewSet)
#
# ✅ FIX CRÍTICO:
# ADMIN DEBE ENVIAR perfil_tutor_assign_id al crear,
# para no tener IntegrityError perfil_tutor_id NULL
# ============================================================
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

# Asegúrate de tener esto arriba en tu archivo:
# from .models import Mascota, Especie, Raza, PerfilTutor
# from .serializers import FotoMascotaSerializer (si está en el mismo archivo, no lo importes circular)
# y tu helper:
# def _get_rol(request) -> str: ...

class MascotaSerializer(serializers.ModelSerializer):
    especie_id = serializers.PrimaryKeyRelatedField(
        queryset=Especie.objects.all(),
        source="especie",
    )
    raza_id = serializers.PrimaryKeyRelatedField(
        queryset=Raza.objects.all(),
        source="raza",
        allow_null=True,
        required=False,
    )

    # ✅ tu modelo lo tiene
    activo = serializers.BooleanField(required=False)

    # ✅ id tutor actual (read)
    perfil_tutor_id = serializers.IntegerField(source="perfil_tutor.id", read_only=True)

    # ✅ SOLO para ADMIN (write-only) -> asignar tutor en create/update
    perfil_tutor_assign_id = serializers.PrimaryKeyRelatedField(
        source="perfil_tutor",
        queryset=PerfilTutor.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    # ✅ evita warning: min_value debe ser Decimal
    tamano_cm = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal("0.00"),
    )

    # edad UI (opcional): tu modelo guarda edad_meses
    edad_valor = serializers.IntegerField(required=False, allow_null=True, min_value=0, write_only=True)
    edad_unidad = serializers.ChoiceField(
        required=False,
        choices=[("MESES", "Meses"), ("ANIOS", "Años")],
        write_only=True,
    )

    fotos = FotoMascotaSerializer(many=True, read_only=True)  # related_name="fotos"
    foto_url = serializers.SerializerMethodField()

    tutor_nombres = serializers.CharField(source="perfil_tutor.user.nombres", read_only=True)
    tutor_apellidos = serializers.CharField(source="perfil_tutor.user.apellidos", read_only=True)
    tutor_telefono = serializers.CharField(source="perfil_tutor.user.telefono", read_only=True)
    tutor_email = serializers.EmailField(source="perfil_tutor.user.email", read_only=True)

    especie_nombre = serializers.CharField(source="especie.nombre", read_only=True)
    raza_nombre = serializers.CharField(source="raza.nombre", read_only=True)

    class Meta:
        model = Mascota
        fields = [
            "id",
            "nombre",
            "sexo",
            "edad_meses",
            "edad_valor",
            "edad_unidad",
            "estado",
            "activo",
            "fecha_registro",
            "color",
            "tamano_cm",
            "descripcion",
            "ubicacion",

            "especie_id",
            "raza_id",

            "perfil_tutor_id",
            "perfil_tutor_assign_id",

            "foto_url",
            "fotos",

            "tutor_nombres",
            "tutor_apellidos",
            "tutor_telefono",
            "tutor_email",

            "especie_nombre",
            "raza_nombre",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "perfil_tutor_id",
            "foto_url",
            "fotos",
            "tutor_nombres",
            "tutor_apellidos",
            "tutor_telefono",
            "tutor_email",
            "especie_nombre",
            "raza_nombre",
            "created_at",
            "updated_at",
        ]

    def get_foto_url(self, obj: Mascota):
        foto = obj.fotos.order_by("-fecha", "-id").first()
        if not foto:
            return ""
        return getattr(foto, "imagen_url", None) or getattr(foto, "s3_url", "") or ""

    def validate_fecha_registro(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("La fecha de registro no puede ser futura.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")

        # 1) edad_valor/unidad -> edad_meses
        edad_valor = attrs.pop("edad_valor", None)
        edad_unidad = attrs.pop("edad_unidad", None)

        if edad_valor is not None:
            unidad = (edad_unidad or "MESES").upper()
            attrs["edad_meses"] = (int(edad_valor) * 12) if unidad == "ANIOS" else int(edad_valor)

        # 2) raza corresponde a especie
        especie = attrs.get("especie") or getattr(self.instance, "especie", None)
        raza = attrs.get("raza") or getattr(self.instance, "raza", None)
        if raza and especie and raza.especie_id != especie.id:
            raise serializers.ValidationError({"raza_id": "La raza seleccionada no corresponde a la especie elegida."})

        # 3) ✅ CRÍTICO: si es CREATE y rol ADMIN, exigir tutor (perfil_tutor)
        if request and self.instance is None:
            rol = _get_rol(request)

            if rol == "ADMIN":
                # el admin DEBE mandar perfil_tutor_assign_id (que llena attrs["perfil_tutor"])
                if "perfil_tutor" not in attrs or attrs.get("perfil_tutor") is None:
                    raise serializers.ValidationError({
                        "perfil_tutor_assign_id": "ADMIN debe asignar un tutor (perfil_tutor_assign_id) al crear la mascota."
                    })

        # 4) default activo
        if self.instance is None and "activo" not in attrs:
            attrs["activo"] = True

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # reconstruir edad UI (solo para mostrar)
        edad_meses = instance.edad_meses
        if edad_meses is None:
            data["edad_valor"] = None
            data["edad_unidad"] = "MESES"
        else:
            if edad_meses % 12 == 0:
                data["edad_valor"] = edad_meses // 12
                data["edad_unidad"] = "ANIOS"
            else:
                data["edad_valor"] = edad_meses
                data["edad_unidad"] = "MESES"

        return data
# ============================================================
# HISTORIAL MÉDICO
# ADMIN CRUD, TUTOR solo lectura
# ============================================================
class HistorialMedicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialMedico
        fields = ["id", "aws_s3_file"]

    def validate(self, attrs):
        request = self.context.get("request")
        _require_auth(request)
        rol = _get_rol(request)

        if rol == "ADMIN":
            return attrs

        if request and request.method in ("GET", "HEAD", "OPTIONS"):
            return attrs

        raise serializers.ValidationError("No tienes permiso para gestionar historial médico.")


# ============================================================
# CARTILLAS MÉDICAS
# ADMIN CRUD, TUTOR solo lectura
# ============================================================
class CartillaMedicaSerializer(serializers.ModelSerializer):
    mascota_id = serializers.PrimaryKeyRelatedField(queryset=Mascota.objects.all(), source="mascota")
    historial_medico_id = serializers.PrimaryKeyRelatedField(
        queryset=HistorialMedico.objects.all(),
        source="historial_medico",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = CartillaMedica
        fields = [
            "id",
            "mascota_id",
            "historial_medico_id",
            "esterilizado",
            "enfermedades_anteriores",
            "actitud",
            "alergias",
            "condicion_corporal",
            "peso_kg",
            "estado_deshidratacion",
            "mucosa_oral_conjuntival",
            "mucosa_intima",
            "mucosa_rectal",
            "mucosa_ojos",
            "mucosa_nodulos",
            "mucosa_piel",
            "locomocion",
            "temperatura_c",
            "frec_cardiaca_lpm",
            "frec_respiratoria_rpm",
            "fecha",
        ]

    def validate_fecha(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("La fecha de la cartilla no puede ser futura.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        _require_auth(request)
        rol = _get_rol(request)

        if rol == "ADMIN":
            return attrs

        if request and request.method in ("GET", "HEAD", "OPTIONS"):
            return attrs

        raise serializers.ValidationError("No tienes permiso para gestionar cartillas médicas.")


# ============================================================
# VACUNAS
# ADMIN CRUD, TUTOR solo lectura
# ============================================================
class VacunaSerializer(serializers.ModelSerializer):
    cartilla_medica_id = serializers.PrimaryKeyRelatedField(
        queryset=CartillaMedica.objects.all(),
        source="cartilla_medica"
    )

    class Meta:
        model = Vacuna
        fields = ["id", "cartilla_medica_id", "tipo", "producto", "fecha_aplicacion", "proxima_dosis", "veterinaria"]

    def validate_fecha_aplicacion(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("La fecha de aplicación no puede ser futura.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        _require_auth(request)
        rol = _get_rol(request)

        fa = attrs.get("fecha_aplicacion")
        pd = attrs.get("proxima_dosis")
        if fa and pd and pd < fa:
            raise serializers.ValidationError(
                {"proxima_dosis": "La próxima dosis no puede ser anterior a la fecha de aplicación."}
            )

        if rol == "ADMIN":
            return attrs

        if request and request.method in ("GET", "HEAD", "OPTIONS"):
            return attrs

        raise serializers.ValidationError("No tienes permiso para gestionar vacunas.")


# ============================================================
# SOLICITUDES / NOTIFICACIONES
# ============================================================
class SolicitudAdopcionSerializer(serializers.ModelSerializer):
    mascota_nombre = serializers.CharField(source="mascota.nombre", read_only=True)
    tutor_email = serializers.CharField(source="mascota.perfil_tutor.user.email", read_only=True)
    adoptante_email = serializers.CharField(source="perfil_adoptante.user.email", read_only=True)

    class Meta:
        model = SolicitudAdopcion
        fields = [
            "id",
            "mascota",
            "perfil_adoptante",
            "estado",
            "motivacion",
            "created_at",
            "updated_at",
            "mascota_nombre",
            "tutor_email",
            "adoptante_email",
        ]
        read_only_fields = [
            "id",
            "perfil_adoptante",
            "estado",
            "created_at",
            "updated_at",
            "mascota_nombre",
            "tutor_email",
            "adoptante_email",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs

        if request.method == "POST":
            if getattr(request.user, "rol", None) != "ADOPTANTE":
                raise serializers.ValidationError("Solo un adoptante puede crear solicitudes.")

            perfil_adoptante = getattr(request.user, "perfil_adoptante", None)
            if not perfil_adoptante:
                raise serializers.ValidationError("El usuario no tiene perfil de adoptante.")

            mascota = attrs.get("mascota")
            if SolicitudAdopcion.objects.filter(
                mascota=mascota,
                perfil_adoptante=perfil_adoptante,
                estado="PENDIENTE",
            ).exists():
                raise serializers.ValidationError("Ya tienes una solicitud pendiente para esta mascota.")

        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["perfil_adoptante"] = user.perfil_adoptante
        validated_data["estado"] = "PENDIENTE"
        return super().create(validated_data)


class SolicitudTutorEstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudAdopcion
        fields = ["estado"]

    def validate_estado(self, value):
        if value not in ["APROBADA", "RECHAZADA"]:
            raise serializers.ValidationError("El tutor solo puede cambiar a APROBADA o RECHAZADA.")
        return value


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ["id", "solicitud", "perfil_tutor", "tipo", "titulo", "cuerpo", "creada_en", "leida"]
        read_only_fields = ["creada_en"]


# ============================================================
# VALORACIONES
# ============================================================
class ValoracionSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(queryset=UserModel.objects.all(), required=True)

    usuario_id = serializers.IntegerField(source="usuario.id", read_only=True)
    usuario_email = serializers.EmailField(source="usuario.email", read_only=True)

    autor_id = serializers.IntegerField(source="autor.id", read_only=True)
    autor_email = serializers.EmailField(source="autor.email", read_only=True)

    class Meta:
        model = Valoracion
        fields = [
            "id",
            "autor_id",
            "autor_email",
            "usuario",
            "usuario_id",
            "usuario_email",
            "puntuacion",
            "comentario",
            "creado_en",
        ]
        read_only_fields = ["id", "autor_id", "autor_email", "usuario_id", "usuario_email", "creado_en"]

    def validate_puntuacion(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("La puntuación debe estar entre 1 y 5.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = _require_auth(request)
        rol = _get_rol(request)

        if rol == "ADMIN":
            raise serializers.ValidationError("ADMIN solo puede listar valoraciones.")

        if rol not in ("TUTOR", "ADOPTANTE"):
            raise serializers.ValidationError("No autorizado.")

        if self.instance is not None and "usuario" in attrs:
            if attrs["usuario"].id != self.instance.usuario_id:
                raise serializers.ValidationError({"usuario": "No se puede cambiar el usuario calificado."})

        target = attrs.get("usuario") or (self.instance.usuario if self.instance else None)

        if target and target.id == user.id:
            raise serializers.ValidationError({"usuario": "No puedes calificarte a ti mismo."})

        if target:
            target_rol = (getattr(target, "rol", "") or "").upper()
            if rol == "TUTOR" and target_rol != "ADOPTANTE":
                raise serializers.ValidationError({"usuario": "Como TUTOR solo puedes calificar a ADOPTANTES."})
            if rol == "ADOPTANTE" and target_rol != "TUTOR":
                raise serializers.ValidationError({"usuario": "Como ADOPTANTE solo puedes calificar a TUTORES."})

        return attrs


# ============================================================
# SEGUIMIENTO CONFIG / EVIDENCIAS
# ============================================================
class SeguimientoConfigSerializer(serializers.ModelSerializer):
    mascota_nombre = serializers.CharField(source="solicitud.mascota.nombre", read_only=True)
    adoptante_email = serializers.CharField(source="solicitud.perfil_adoptante.user.email", read_only=True)
    tutor_email = serializers.CharField(source="solicitud.mascota.perfil_tutor.user.email", read_only=True)
    estado_solicitud = serializers.CharField(source="solicitud.estado", read_only=True)

    class Meta:
        model = SeguimientoConfig
        fields = [
            "id",
            "solicitud",
            "activo",
            "modo",
            "frecuencia",
            "inicio",
            "proximo_envio",
            "creado_en",
            "actualizado_en",
            "mascota_nombre",
            "adoptante_email",
            "tutor_email",
            "estado_solicitud",
        ]
        read_only_fields = [
            "inicio",
            "proximo_envio",
            "creado_en",
            "actualizado_en",
            "mascota_nombre",
            "adoptante_email",
            "tutor_email",
            "estado_solicitud",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs

        if request.method in ("POST", "PUT", "PATCH"):
            if getattr(request.user, "rol", None) != "TUTOR":
                raise serializers.ValidationError("Solo un TUTOR puede configurar seguimiento.")

        if self.instance and "solicitud" in attrs:
            raise serializers.ValidationError(
                {"solicitud": "No se puede cambiar la solicitud de una configuración existente."}
            )

        modo_final = (attrs.get("modo") or (self.instance.modo if self.instance else "")).upper()
        freq_final = attrs.get("frecuencia", (self.instance.frecuencia if self.instance else None))

        if modo_final == "AUTO" and not freq_final:
            raise serializers.ValidationError({"frecuencia": "Obligatorio si modo es AUTO."})

        if modo_final == "MANUAL":
            attrs["frecuencia"] = None

        solicitud = attrs.get("solicitud") or (self.instance.solicitud if self.instance else None)
        if solicitud:
            if solicitud.estado != "APROBADA":
                raise serializers.ValidationError({"solicitud": "Solo se configura para solicitudes APROBADAS."})

            perfil_tutor = getattr(request.user, "perfil_tutor", None)
            if not perfil_tutor:
                raise serializers.ValidationError("El usuario no tiene perfil de tutor.")

            if solicitud.mascota.perfil_tutor_id != perfil_tutor.id:
                raise serializers.ValidationError({"solicitud": "No puedes configurar seguimiento de esta mascota."})

        return attrs


class SeguimientoSolicitudSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()
    s3_url = serializers.SerializerMethodField()

    class Meta:
        model = SeguimientoSolicitud
        fields = ["id", "solicitud", "fecha", "obs", "imagen", "imagen_url", "s3_url"]
        read_only_fields = ["imagen_url", "s3_url"]

    def get_imagen_url(self, obj):
        if hasattr(obj, "imagen_url") and obj.imagen_url:
            return obj.imagen_url
        try:
            return obj.imagen.url if obj.imagen else None
        except Exception:
            return None

    def get_s3_url(self, obj):
        return getattr(obj, "s3_url", None)

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs

        if getattr(request.user, "rol", None) != "ADOPTANTE":
            raise serializers.ValidationError("Solo un ADOPTANTE puede subir evidencias.")

        perfil_adoptante = getattr(request.user, "perfil_adoptante", None)
        if not perfil_adoptante:
            raise serializers.ValidationError("El usuario no tiene perfil de adoptante.")

        solicitud = attrs.get("solicitud")
        if not solicitud:
            raise serializers.ValidationError({"solicitud": "Requerido."})

        if solicitud.estado != "APROBADA":
            raise serializers.ValidationError({"solicitud": "Solo si la solicitud está APROBADA."})

        if solicitud.perfil_adoptante_id != perfil_adoptante.id:
            raise serializers.ValidationError({"solicitud": "No tienes permiso sobre esta solicitud."})

        cfg = getattr(solicitud, "seguimiento_config", None)
        if not cfg or not cfg.activo or not cfg.inicio:
            raise serializers.ValidationError("El seguimiento no está iniciado o no está activo.")

        if cfg.vencido():
            raise serializers.ValidationError("El seguimiento ya venció (máximo 1 año).")

        fecha = attrs.get("fecha") or timezone.now().date()
        if SeguimientoSolicitud.objects.filter(solicitud=solicitud, fecha=fecha).exists():
            raise serializers.ValidationError({"fecha": "Ya existe una evidencia para esta solicitud en esa fecha."})

        attrs["fecha"] = fecha
        return attrs


# ============================================================
# PERFILES (LISTAS PARA VALORACIONES)
# ============================================================
class PerfilTutorListSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = PerfilTutor
        fields = ["id", "nit", "user"]

    def get_user(self, obj):
        u = obj.user
        username = (u.email or "").split("@")[0]
        return {
            "id": u.id,
            "username": username,
            "email": u.email,
            "perfil_usuario": {"nombres": u.nombres, "apellidos": u.apellidos},
        }


class PerfilAdoptanteListSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    # ✅ compatibilidad: algunos frontends viejos esperan "foto_factura_s3"
    foto_factura_s3 = serializers.SerializerMethodField()

    class Meta:
        model = PerfilAdoptante
        fields = ["id", "ci", "tiene_patio", "foto_factura_s3", "user"]

    def get_foto_factura_s3(self, obj):
        # alias -> recibo luz
        return getattr(obj, "foto_recibo_luz_s3", "") or getattr(obj, "foto_factura_s3", "")

    def get_user(self, obj):
        u = obj.user
        username = (u.email or "").split("@")[0]
        return {
            "id": u.id,
            "username": username,
            "email": u.email,
            "perfil_usuario": {"nombres": u.nombres, "apellidos": u.apellidos},
        }


# ============================================================
# REPORTES (STATS)
# ============================================================
class MascotasTopRazaSerializer(serializers.Serializer):
    especie__nombre = serializers.CharField()
    raza__nombre = serializers.CharField(allow_null=True)
    total = serializers.IntegerField()


class SolicitudesPorTutorSerializer(serializers.Serializer):
    mascota__perfil_tutor_id = serializers.IntegerField()
    mascota__perfil_tutor__user__email = serializers.EmailField()
    mascota__perfil_tutor__user__nombres = serializers.CharField()
    mascota__perfil_tutor__user__apellidos = serializers.CharField()

    total = serializers.IntegerField()
    aprobadas = serializers.IntegerField()
    rechazadas = serializers.IntegerField()
    pendientes = serializers.IntegerField()

    tasa_aprobacion = serializers.FloatField()
    tasa_rechazo = serializers.FloatField()


class SeguimientoCumplimientoResumenSerializer(serializers.Serializer):
    al_dia = serializers.IntegerField()
    atrasados = serializers.IntegerField()
    sin_frecuencia = serializers.IntegerField()


class SeguimientoCumplimientoDetalleSerializer(serializers.Serializer):
    solicitud_id = serializers.IntegerField()
    mascota = serializers.CharField()
    tutor = serializers.CharField()
    adoptante = serializers.CharField()
    frecuencia = serializers.CharField(allow_null=True)
    ultimo_envio = serializers.CharField(allow_null=True)
    estado = serializers.ChoiceField(choices=["AL_DIA", "ATRASADO"])


class SeguimientoCumplimientoResponseSerializer(serializers.Serializer):
    resumen = SeguimientoCumplimientoResumenSerializer()
    detalle = SeguimientoCumplimientoDetalleSerializer(many=True)