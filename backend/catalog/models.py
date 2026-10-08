# catalog/models.py
from __future__ import annotations

import os
import uuid
import json
from decimal import Decimal
from datetime import timedelta

import boto3

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin


# ============================================================
# S3 HELPERS
# ============================================================
def s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def upload_to_s3_public_safe(*, file_obj, key: str, content_type: str) -> str:
    """
    Sube a S3 intentando ACL public-read; si el bucket tiene ACLs deshabilitadas,
    reintenta sin ACL.
    Retorna URL pública basada en AWS_S3_CUSTOM_DOMAIN.
    """
    if not getattr(settings, "AWS_STORAGE_BUCKET_NAME", None):
        raise ValueError("AWS_STORAGE_BUCKET_NAME no está configurado.")
    if not getattr(settings, "AWS_S3_CUSTOM_DOMAIN", None):
        raise ValueError("AWS_S3_CUSTOM_DOMAIN no está configurado.")

    s3 = s3_client()
    bucket = settings.AWS_STORAGE_BUCKET_NAME

    try:
        s3.upload_fileobj(
            file_obj,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type, "ACL": "public-read"},
        )
    except Exception:
        s3.upload_fileobj(
            file_obj,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )

    domain = settings.AWS_S3_CUSTOM_DOMAIN
    return f"https://{domain}/{key}"


# ============================================================
# MANAGER
# ============================================================
class UsuarioManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("rol", "ADMIN")

        extra_fields.setdefault("nombres", "Admin")
        extra_fields.setdefault("apellidos", "Snouty")
        extra_fields.setdefault("telefono", "00000000")
        extra_fields.setdefault("foto_perfil_s3", "https://example.com/default.png")

        return self.create_user(email, password, **extra_fields)


# ============================================================
# CUSTOM USER
# ============================================================
class Usuario(AbstractBaseUser, PermissionsMixin):
    ROL_CHOICES = (
        ("TUTOR", "Tutor"),
        ("ADOPTANTE", "Adoptante"),
        ("ADMIN", "Administrador"),
    )

    email = models.EmailField(unique=True)
    rol = models.CharField(max_length=15, choices=ROL_CHOICES)

    nombres = models.CharField(max_length=120)
    apellidos = models.CharField(max_length=120)
    telefono = models.CharField(max_length=20)

    # URL final S3
    foto_perfil_s3 = models.CharField(max_length=2048, default="")
    # archivo temporal
    foto_perfil_file = models.ImageField(upload_to="tmp_perfiles/", null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    # ✅ FIX: no obligues foto_perfil_s3 en createsuperuser (ya lo seteas por default arriba)
    REQUIRED_FIELDS = ["rol", "nombres", "apellidos", "telefono"]

    class Meta:
        db_table = "usuarios"

    def __str__(self):
        return f"{self.email} ({self.rol})"

    @property
    def foto_url(self):
        if self.foto_perfil_s3:
            return self.foto_perfil_s3
        if self.foto_perfil_file and hasattr(self.foto_perfil_file, "url"):
            return self.foto_perfil_file.url
        return None

    def save(self, *args, **kwargs):
        # capturar archivo antes del super
        file_field = self.foto_perfil_file
        super().save(*args, **kwargs)

        if file_field:
            try:
                file_field.file.seek(0)
            except Exception:
                pass

            original_name = os.path.basename(file_field.name)
            ext = os.path.splitext(original_name)[1] or ".jpg"
            key = f"media/perfiles_usuarios/{uuid.uuid4()}{ext}"
            content_type = getattr(file_field, "content_type", None) or "image/jpeg"

            url = upload_to_s3_public_safe(
                file_obj=file_field.file,
                key=key,
                content_type=content_type,
            )

            Usuario.objects.filter(pk=self.pk).update(
                foto_perfil_s3=url,
                foto_perfil_file=None,
            )
            self.foto_perfil_s3 = url
            self.foto_perfil_file = None


# ============================================================
# PERFILES POR ROL
# ============================================================
class PerfilTutor(models.Model):
    user = models.OneToOneField("Usuario", on_delete=models.CASCADE, related_name="perfil_tutor")
    nit = models.CharField(max_length=30, blank=True, default="")

    class Meta:
        db_table = "perfiles_tutor"

    def __str__(self):
        return f"Tutor: {self.user.email} - NIT: {self.nit}"


class PerfilAdoptante(models.Model):
    SEXO_CHOICES = [
        ("M", "Masculino"),
        ("F", "Femenino"),
        ("O", "Otro"),
    ]

    user = models.OneToOneField("Usuario", on_delete=models.CASCADE, related_name="perfil_adoptante")

    # datos
    ci = models.CharField(max_length=25)
    tiene_patio = models.BooleanField(default=False)

    ocupacion = models.CharField(max_length=120, null=True, blank=True)
    direccion = models.CharField(max_length=255, null=True, blank=True)
    edad = models.PositiveIntegerField(null=True, blank=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, null=True, blank=True)

    # 1) CI
    foto_ci_s3 = models.CharField(max_length=2048, default="")
    ci_file = models.FileField(upload_to="tmp_adoptantes/ci/", null=True, blank=True)

    # 2) GARANTE
    foto_garante_s3 = models.CharField(max_length=2048, default="")
    garante_file = models.FileField(upload_to="tmp_adoptantes/garante/", null=True, blank=True)

    # 3) RECIBO DE LUZ
    foto_recibo_luz_s3 = models.CharField(max_length=2048, default="")
    recibo_luz_file = models.FileField(upload_to="tmp_adoptantes/recibo_luz/", null=True, blank=True)

    # 4) FACHADA
    foto_fachada_s3 = models.CharField(max_length=2048, default="")
    fachada_file = models.FileField(upload_to="tmp_adoptantes/fachada/", null=True, blank=True)

    # 5) DOMICILIO
    foto_domicilio_s3 = models.CharField(max_length=2048, default="")
    domicilio_file = models.FileField(upload_to="tmp_adoptantes/domicilio/", null=True, blank=True)

    # 6) CROQUIS
    foto_croquis_s3 = models.CharField(max_length=2048, default="")
    croquis_file = models.FileField(upload_to="tmp_adoptantes/croquis/", null=True, blank=True)

    class Meta:
        db_table = "perfiles_adoptante"

    def __str__(self):
        return f"Adoptante: {self.user.email} - CI: {self.ci}"

    # URLs
    @property
    def ci_url(self):
        return self.foto_ci_s3 or (self.ci_file.url if self.ci_file and hasattr(self.ci_file, "url") else None)

    @property
    def garante_url(self):
        return self.foto_garante_s3 or (self.garante_file.url if self.garante_file and hasattr(self.garante_file, "url") else None)

    @property
    def recibo_luz_url(self):
        return self.foto_recibo_luz_s3 or (self.recibo_luz_file.url if self.recibo_luz_file and hasattr(self.recibo_luz_file, "url") else None)

    @property
    def fachada_url(self):
        return self.foto_fachada_s3 or (self.fachada_file.url if self.fachada_file and hasattr(self.fachada_file, "url") else None)

    @property
    def domicilio_url(self):
        return self.foto_domicilio_s3 or (self.domicilio_file.url if self.domicilio_file and hasattr(self.domicilio_file, "url") else None)

    @property
    def croquis_url(self):
        return self.foto_croquis_s3 or (self.croquis_file.url if self.croquis_file and hasattr(self.croquis_file, "url") else None)

    # ✅ FIX: subidas sin duplicar (antes subías CI dos veces)
    def save(self, *args, **kwargs):
        ci_file_field = self.ci_file
        garante_file_field = self.garante_file
        recibo_luz_file_field = self.recibo_luz_file
        fachada_file_field = self.fachada_file
        domicilio_file_field = self.domicilio_file
        croquis_file_field = self.croquis_file

        super().save(*args, **kwargs)

        def _upload_one(file_field, *, folder: str, default_ext: str, default_ct: str, s3_field: str, file_attr: str):
            if not file_field:
                return

            try:
                file_field.file.seek(0)
            except Exception:
                pass

            ext = os.path.splitext(os.path.basename(file_field.name))[1] or default_ext
            key = f"media/adoptantes/{folder}/{uuid.uuid4()}{ext}"
            content_type = getattr(file_field, "content_type", None) or default_ct

            url = upload_to_s3_public_safe(file_obj=file_field.file, key=key, content_type=content_type)

            PerfilAdoptante.objects.filter(pk=self.pk).update(**{s3_field: url, file_attr: None})
            setattr(self, s3_field, url)
            setattr(self, file_attr, None)

        _upload_one(ci_file_field, folder="ci", default_ext=".jpg", default_ct="image/jpeg", s3_field="foto_ci_s3", file_attr="ci_file")
        _upload_one(garante_file_field, folder="garante", default_ext=".jpg", default_ct="image/jpeg", s3_field="foto_garante_s3", file_attr="garante_file")
        _upload_one(recibo_luz_file_field, folder="recibo_luz", default_ext=".pdf", default_ct="application/pdf", s3_field="foto_recibo_luz_s3", file_attr="recibo_luz_file")
        _upload_one(fachada_file_field, folder="fachada", default_ext=".jpg", default_ct="image/jpeg", s3_field="foto_fachada_s3", file_attr="fachada_file")
        _upload_one(domicilio_file_field, folder="domicilio", default_ext=".jpg", default_ct="image/jpeg", s3_field="foto_domicilio_s3", file_attr="domicilio_file")
        _upload_one(croquis_file_field, folder="croquis", default_ext=".jpg", default_ct="image/jpeg", s3_field="foto_croquis_s3", file_attr="croquis_file")


class Administrador(models.Model):
    user = models.OneToOneField("Usuario", on_delete=models.CASCADE, related_name="perfil_admin")
    tipo = models.CharField(max_length=50)

    class Meta:
        db_table = "administradores"

    def __str__(self):
        return f"Admin: {self.user.email} - Tipo: {self.tipo}"


# ============================================================
# ESPECIE / RAZA
# ============================================================
class Especie(models.Model):
    id = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=80, unique=True)

    class Meta:
        db_table = "especies"

    def __str__(self):
        return self.nombre


class Raza(models.Model):
    id = models.BigAutoField(primary_key=True)
    especie = models.ForeignKey(Especie, on_delete=models.RESTRICT, db_column="especie_id")
    nombre = models.CharField(max_length=80)

    class Meta:
        db_table = "razas"
        unique_together = (("especie", "nombre"),)

    def __str__(self):
        return f"{self.nombre} ({self.especie.nombre})"


# ============================================================
# MASCOTA
# ============================================================

class Mascota(models.Model):

    SEXO_CHOICES = (
        ("M", "Macho"),
        ("F", "Hembra"),
    )

    ESTADO_CHOICES = (
        ("DISPONIBLE", "Disponible"),
        ("RESERVADO", "Reservado"),
        ("INACTIVO", "Inactivo"),
    )

    # ==========================================================
    # IDENTIFICADOR
    # ==========================================================

    id = models.BigAutoField(primary_key=True)

    # ==========================================================
    # NOMBRE ÚNICO PARA TODAS LAS MASCOTAS
    # ==========================================================

    nombre = models.CharField(
        max_length=100,
        unique=True,
        error_messages={
            "unique": "Ya existe una mascota registrada con este nombre."
        },
    )

    # ==========================================================
    # DATOS BÁSICOS
    # ==========================================================

    sexo = models.CharField(
        max_length=1,
        choices=SEXO_CHOICES,
    )

    edad_meses = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    estado = models.CharField(
        max_length=15,
        choices=ESTADO_CHOICES,
        default="DISPONIBLE",
    )

    activo = models.BooleanField(default=True)

    fecha_registro = models.DateField()

    # ==========================================================
    # CARACTERÍSTICAS
    # ==========================================================

    color = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )

    tamano_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal("0.00"))
        ],
    )

    descripcion = models.TextField(
        null=True,
        blank=True,
    )

    ubicacion = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    # ==========================================================
    # RELACIONES
    # ==========================================================

    especie = models.ForeignKey(
        Especie,
        on_delete=models.RESTRICT,
        db_column="especie_id",
        related_name="mascotas",
    )

    raza = models.ForeignKey(
        Raza,
        on_delete=models.SET_NULL,
        db_column="raza_id",
        null=True,
        blank=True,
        related_name="mascotas",
    )

    perfil_tutor = models.ForeignKey(
        PerfilTutor,
        on_delete=models.RESTRICT,
        db_column="perfil_tutor_id",
        related_name="mascotas",
    )

    # ==========================================================
    # AUDITORÍA
    # ==========================================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    # ==========================================================
    # CONFIGURACIÓN DE TABLA
    # ==========================================================

    class Meta:
        db_table = "mascotas"

    # ==========================================================
    # REPRESENTACIÓN
    # ==========================================================

    def __str__(self):
        return f"{self.nombre} ({self.estado})"

    # ==========================================================
    # VALIDACIONES
    # ==========================================================

    def clean(self):
        super().clean()

        # Validar fecha de registro
        if (
            self.fecha_registro
            and self.fecha_registro > timezone.now().date()
        ):
            raise ValidationError({
                "fecha_registro":
                    "La fecha de registro no puede ser futura."
            })

        # Validar que la raza corresponda a la especie
        if (
            self.raza_id is not None
            and self.especie_id is not None
        ):
            if self.raza.especie_id != self.especie_id:
                raise ValidationError({
                    "raza":
                        "La raza no corresponde a la especie."
                })

        # Validar que el nombre no esté vacío
        if self.nombre is not None:
            self.nombre = self.nombre.strip()

        if not self.nombre:
            raise ValidationError({
                "nombre":
                    "El nombre de la mascota es obligatorio."
            })

        # Verificar nombre repetido en toda la base de datos
        mascotas_existentes = Mascota.objects.filter(
            nombre__iexact=self.nombre
        ).exclude(pk=self.pk)

        if mascotas_existentes.exists():
            raise ValidationError({
                "nombre":
                    "Ya existe una mascota registrada con este nombre. "
                    "Ingrese un nombre diferente."
            })

# ============================================================
# FOTO MASCOTA
# ============================================================
class FotoMascota(models.Model):
    id = models.BigAutoField(primary_key=True)

    mascota = models.ForeignKey(
        Mascota,
        on_delete=models.CASCADE,
        db_column="mascota_id",
        related_name="fotos",
    )

    imagen = models.ImageField(upload_to="tmp_fotos_mascotas/", null=True, blank=True)
    s3_url = models.CharField(max_length=2048, null=True, blank=True)

    # ✅ recomendado: que no te obligue siempre (igual tu serializer pone default)
    fecha = models.DateField(default=timezone.now)

    class Meta:
        db_table = "fotos_mascota"

    def __str__(self):
        return f"Foto #{self.id} de {self.mascota.nombre}"

    @property
    def imagen_url(self):
        if self.s3_url:
            return self.s3_url
        if self.imagen and hasattr(self.imagen, "url"):
            return self.imagen.url
        return None

    def save(self, *args, **kwargs):
        file_field = self.imagen
        super().save(*args, **kwargs)

        if file_field and not self.s3_url:
            try:
                file_field.file.seek(0)
            except Exception:
                pass

            ext = os.path.splitext(os.path.basename(file_field.name))[1] or ".jpg"
            key = f"media/fotos_mascotas/{uuid.uuid4()}{ext}"
            content_type = getattr(file_field, "content_type", None) or "image/jpeg"

            url = upload_to_s3_public_safe(
                file_obj=file_field.file,
                key=key,
                content_type=content_type,
            )

            FotoMascota.objects.filter(pk=self.pk).update(s3_url=url, imagen=None)
            self.s3_url = url
            self.imagen = None


# ============================================================
# HISTORIAL MÉDICO (APPEND-ONLY EN S3)
# ============================================================
class HistorialMedico(models.Model):
    id = models.BigAutoField(primary_key=True)
    aws_s3_file = models.CharField(max_length=2048, null=True, blank=True)

    class Meta:
        db_table = "historiales_medicos"

    def _key_for_historial(self, mascota_id: int) -> str:
        return f"media/historiales_medicos/mascota_{mascota_id}/historial_{self.id}.json"

    def _read_existing_json(self, s3, bucket: str, key: str) -> dict:
        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
            raw = obj["Body"].read().decode("utf-8")
            data = json.loads(raw) if raw else {}
        except Exception:
            data = {}

        if not isinstance(data, dict):
            data = {}

        data.setdefault("historial_medico_id", self.id)
        data.setdefault("mascota_id", None)
        data.setdefault("created_at", timezone.now().isoformat())
        data.setdefault("eventos", [])
        return data

    def append_cartilla_event_to_s3(self, *, mascota_id: int, cartilla_data: dict, action: str):
        if not getattr(settings, "AWS_STORAGE_BUCKET_NAME", None):
            return

        s3 = s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        key = self._key_for_historial(mascota_id)

        historial_json = self._read_existing_json(s3, bucket, key)
        historial_json["mascota_id"] = mascota_id

        historial_json["eventos"].append({
            "action": action,
            "timestamp": timezone.now().isoformat(),
            "cartilla": cartilla_data,
        })

        body = json.dumps(historial_json, ensure_ascii=False, indent=2).encode("utf-8")

        try:
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=body,
                ContentType="application/json; charset=utf-8",
                ACL="public-read",
            )
        except Exception:
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=body,
                ContentType="application/json; charset=utf-8",
            )

        domain = settings.AWS_S3_CUSTOM_DOMAIN
        url = f"https://{domain}/{key}"

        # ✅ evita save() innecesario (más limpio y sin sorpresas)
        HistorialMedico.objects.filter(pk=self.pk).update(aws_s3_file=url)
        self.aws_s3_file = url


# ============================================================
# CARTILLA MÉDICA
# ============================================================
class CartillaMedica(models.Model):
    ACTITUD_CHOICES = [
        ("ASTENICO", "Asténico"),
        ("APOPLETICO", "Apoplético"),
        ("LINFATICO", "Linfático"),
    ]

    CONDICION_CHOICES = [
        ("OBESO", "Obeso"),
        ("NORMAL", "Normal"),
        ("DELGADO", "Delgado"),
        ("CAQUECTICO", "Caquéctico"),
    ]

    DESHIDRATACION_CHOICES = [
        ("NORMAL", "Normal"),
        ("5", "Al 5%"),
        ("6-7", "Al 6-7%"),
        ("8-9", "Al 8-9%"),
        ("10+", "Más de 10%"),
    ]

    id = models.BigAutoField(primary_key=True)

    mascota = models.ForeignKey(
        Mascota,
        on_delete=models.CASCADE,
        db_column="mascota_id",
        related_name="cartillas",
    )

    historial_medico = models.ForeignKey(
        HistorialMedico,
        on_delete=models.SET_NULL,
        db_column="historial_medico_id",
        null=True,
        blank=True,
        related_name="cartillas",
    )

    esterilizado = models.BooleanField(default=False)
    enfermedades_anteriores = models.TextField(null=True, blank=True)

    actitud = models.CharField(max_length=50, choices=ACTITUD_CHOICES, null=True, blank=True)
    alergias = models.TextField(null=True, blank=True)
    condicion_corporal = models.CharField(max_length=50, choices=CONDICION_CHOICES, null=True, blank=True)

    peso_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    estado_deshidratacion = models.CharField(max_length=50, choices=DESHIDRATACION_CHOICES, null=True, blank=True)

    mucosa_oral_conjuntival = models.CharField(max_length=50, null=True, blank=True)
    mucosa_intima = models.CharField(max_length=50, null=True, blank=True)
    mucosa_rectal = models.CharField(max_length=50, null=True, blank=True)
    mucosa_ojos = models.CharField(max_length=50, null=True, blank=True)
    mucosa_nodulos = models.CharField(max_length=50, null=True, blank=True)
    mucosa_piel = models.CharField(max_length=50, null=True, blank=True)

    locomocion = models.CharField(max_length=50, null=True, blank=True)

    temperatura_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    frec_cardiaca_lpm = models.PositiveSmallIntegerField(null=True, blank=True)
    frec_respiratoria_rpm = models.PositiveSmallIntegerField(null=True, blank=True)

    fecha = models.DateField()

    class Meta:
        db_table = "cartillas_medicas"
        ordering = ["fecha", "id"]

    def clean(self):
        if self.fecha and self.fecha > timezone.now().date():
            raise ValidationError({"fecha": "La fecha de la cartilla no puede ser futura."})

    def _snapshot(self) -> dict:
        return {
            "cartilla_id": self.id,
            "fecha": str(self.fecha),
            "esterilizado": self.esterilizado,
            "enfermedades_anteriores": self.enfermedades_anteriores,
            "actitud": self.actitud,
            "alergias": self.alergias,
            "condicion_corporal": self.condicion_corporal,
            "peso_kg": str(self.peso_kg) if self.peso_kg is not None else None,
            "estado_deshidratacion": self.estado_deshidratacion,
            "mucosa_oral_conjuntival": self.mucosa_oral_conjuntival,
            "mucosa_intima": self.mucosa_intima,
            "mucosa_rectal": self.mucosa_rectal,
            "mucosa_ojos": self.mucosa_ojos,
            "mucosa_nodulos": self.mucosa_nodulos,
            "mucosa_piel": self.mucosa_piel,
            "locomocion": self.locomocion,
            "temperatura_c": str(self.temperatura_c) if self.temperatura_c is not None else None,
            "frec_cardiaca_lpm": self.frec_cardiaca_lpm,
            "frec_respiratoria_rpm": self.frec_respiratoria_rpm,
        }

    def save(self, *args, **kwargs):
        creating = self._state.adding

        if not self.historial_medico_id:
            historial = (
                HistorialMedico.objects
                .filter(cartillas__mascota_id=self.mascota_id)
                .order_by("id")
                .first()
            )
            self.historial_medico = historial or HistorialMedico.objects.create()

        super().save(*args, **kwargs)

        try:
            self.historial_medico.append_cartilla_event_to_s3(
                mascota_id=self.mascota_id,
                cartilla_data=self._snapshot(),
                action="CREATED" if creating else "UPDATED",
            )
        except Exception:
            pass


# ============================================================
# VACUNA
# ============================================================
class Vacuna(models.Model):
    id = models.BigAutoField(primary_key=True)

    cartilla_medica = models.ForeignKey(
        CartillaMedica,
        on_delete=models.CASCADE,
        db_column="cartilla_medica_id",
        related_name="vacunas",
    )

    tipo = models.CharField(max_length=80)
    producto = models.CharField(max_length=120, null=True, blank=True)
    fecha_aplicacion = models.DateField()
    proxima_dosis = models.DateField(null=True, blank=True)
    veterinaria = models.CharField(max_length=120, null=True, blank=True)

    class Meta:
        db_table = "vacunas"


# ============================================================
# SOLICITUD DE ADOPCIÓN
# ============================================================
class SolicitudAdopcion(models.Model):
    ESTADO_CHOICES = [
        ("PENDIENTE", "Pendiente"),
        ("APROBADA", "Aprobada"),
        ("RECHAZADA", "Rechazada"),
    ]

    id = models.BigAutoField(primary_key=True)
    mascota = models.ForeignKey(
        Mascota, on_delete=models.RESTRICT, db_column="mascota_id", related_name="solicitudes"
    )
    perfil_adoptante = models.ForeignKey(
        PerfilAdoptante, on_delete=models.RESTRICT, db_column="perfil_adoptante_id", related_name="solicitudes"
    )

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE")
    motivacion = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "solicitudes_adopcion"


# ============================================================
# NOTIFICACIONES
# ============================================================
class Notificacion(models.Model):
    id = models.BigAutoField(primary_key=True)

    solicitud = models.ForeignKey(
        SolicitudAdopcion,
        on_delete=models.CASCADE,
        db_column="solicitud_id",
        related_name="notificaciones",
    )

    perfil_tutor = models.ForeignKey(
        PerfilTutor,
        on_delete=models.RESTRICT,
        db_column="perfil_tutor_id",
        related_name="notificaciones",
    )

    tipo = models.CharField(max_length=50)
    titulo = models.CharField(max_length=140)
    cuerpo = models.TextField(null=True, blank=True)

    creada_en = models.DateTimeField(auto_now_add=True)
    leida = models.BooleanField(default=False)

    class Meta:
        db_table = "notificaciones"


# ============================================================
# VALORACIÓN
# ============================================================
class Valoracion(models.Model):
    id = models.BigAutoField(primary_key=True)

    autor = models.ForeignKey(
        "Usuario",
        on_delete=models.RESTRICT,
        db_column="autor_id",
        related_name="valoraciones_emitidas",
        null=True,
        blank=True,
    )

    usuario = models.ForeignKey(
        "Usuario",
        on_delete=models.RESTRICT,
        db_column="usuario_id",
        related_name="valoraciones_recibidas",
    )

    puntuacion = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comentario = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "valoraciones"
        unique_together = (("autor", "usuario"),)

    def __str__(self):
        return f"Valoración #{self.id} {self.autor_id}->{self.usuario_id} ({self.puntuacion})"


# ============================================================
# SEGUIMIENTO CONFIG
# ============================================================
class SeguimientoConfig(models.Model):
    MODO_CHOICES = [("MANUAL", "Manual"), ("AUTO", "Automático")]
    FRECUENCIA_CHOICES = [
        ("DIARIO", "Diario"),
        ("SEMANAL", "Semanal"),
        ("QUINCENAL", "Quincenal"),
        ("MENSUAL", "Mensual"),
        ("TRIMESTRAL", "Cada 3 meses"),
    ]

    id = models.BigAutoField(primary_key=True)

    solicitud = models.OneToOneField(
        "SolicitudAdopcion",
        on_delete=models.CASCADE,
        related_name="seguimiento_config",
        db_column="solicitud_id",
    )

    activo = models.BooleanField(default=True)
    modo = models.CharField(max_length=10, choices=MODO_CHOICES, default="MANUAL")
    frecuencia = models.CharField(max_length=12, choices=FRECUENCIA_CHOICES, null=True, blank=True)

    inicio = models.DateField(null=True, blank=True)
    proximo_envio = models.DateField(null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "seguimientos_config"

    def __str__(self):
        return f"Config Seguimiento - Solicitud {self.solicitud_id}"

    def save(self, *args, **kwargs):
        if (self.modo or "").upper() == "MANUAL":
            self.frecuencia = None
            self.proximo_envio = None
        super().save(*args, **kwargs)

    def fecha_fin(self):
        if not self.inicio:
            return None
        return self.inicio + timedelta(days=365)

    def vencido(self):
        f = self.fecha_fin()
        return bool(f and timezone.now().date() >= f)


# ============================================================
# SEGUIMIENTO SOLICITUD (EVIDENCIAS)
# ============================================================
class SeguimientoSolicitud(models.Model):
    id = models.BigAutoField(primary_key=True)

    solicitud = models.ForeignKey(
        "SolicitudAdopcion",
        on_delete=models.CASCADE,
        db_column="solicitud_id",
        related_name="seguimientos",
    )

    imagen = models.ImageField(upload_to="tmp_seguimientos/", null=True, blank=True)
    s3_url = models.CharField(max_length=2048, null=True, blank=True)

    fecha = models.DateField(default=timezone.now)
    obs = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "seguimientos_solicitud"

    def __str__(self):
        return f"Seguimiento #{self.id} - Solicitud {self.solicitud_id}"

    @property
    def imagen_url(self):
        if self.s3_url:
            return self.s3_url
        if self.imagen and hasattr(self.imagen, "url"):
            return self.imagen.url
        return None

    def save(self, *args, **kwargs):
        file_field = self.imagen
        super().save(*args, **kwargs)

        if file_field and not self.s3_url:
            try:
                file_field.file.seek(0)
            except Exception:
                pass

            ext = os.path.splitext(os.path.basename(file_field.name))[1] or ".jpg"
            key = f"media/seguimientos/imagenes/{uuid.uuid4()}{ext}"
            content_type = getattr(file_field, "content_type", None) or "image/jpeg"

            url = upload_to_s3_public_safe(file_obj=file_field.file, key=key, content_type=content_type)

            SeguimientoSolicitud.objects.filter(pk=self.pk).update(s3_url=url, imagen=None)
            self.s3_url = url
            self.imagen = None