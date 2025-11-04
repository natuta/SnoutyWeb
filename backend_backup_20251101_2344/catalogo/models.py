
from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import Q, CheckConstraint

class Especie(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    class Meta:
        ordering = ["nombre"]
    def __str__(self):
        return self.nombre

class Raza(models.Model):
    nombre = models.CharField(max_length=80)
    especie = models.ForeignKey(Especie, on_delete=models.CASCADE, related_name="razas")
    class Meta:
        unique_together = ("nombre", "especie")
        ordering = ["nombre"]
    def __str__(self):
        return f"{self.nombre} ({self.especie.nombre})"

class Mascota(models.Model):
    SEXO = [("M","Macho"), ("F","Hembra")]
    nombre = models.CharField(max_length=80)
    sexo = models.CharField(max_length=1, choices=SEXO)
    edad = models.PositiveIntegerField(validators=[MinValueValidator(0)], help_text="Edad en meses")
    fecha_registro = models.DateField(auto_now_add=True)
    color = models.CharField(max_length=50, blank=True)
    descripcion = models.TextField(blank=True)
    especie = models.ForeignKey(Especie, on_delete=models.PROTECT, related_name="mascotas")
    raza = models.ForeignKey(Raza, on_delete=models.PROTECT, related_name="mascotas", null=True, blank=True)
    id_tutor = models.BigIntegerField(null=True, blank=True)
    id_cartilla = models.BigIntegerField(null=True, blank=True)
    id_ubicacion = models.BigIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha_registro", "nombre"]
        constraints = [
            CheckConstraint(check=Q(edad__gte=0), name="mascota_edad_gte_0"),
            CheckConstraint(check=Q(sexo__in=['M','F']), name="mascota_sexo_mf"),
        ]
    def __str__(self):
        return f"{self.nombre} ({self.especie.nombre})"
