
from django.contrib import admin
from .models import Especie, Raza, Mascota

@admin.register(Especie)
class EspecieAdmin(admin.ModelAdmin):
    list_display = ("id","nombre")
    search_fields = ("nombre",)

@admin.register(Raza)
class RazaAdmin(admin.ModelAdmin):
    list_display = ("id","nombre","especie")
    search_fields = ("nombre","especie__nombre")
    list_filter = ("especie",)

@admin.register(Mascota)
class MascotaAdmin(admin.ModelAdmin):
    list_display = ("id","nombre","especie","raza","sexo","edad","fecha_registro")
    search_fields = ("nombre","color","descripcion","especie__nombre","raza__nombre")
    list_filter = ("especie","raza","sexo")
