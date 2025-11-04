
from rest_framework import serializers
from .models import Especie, Raza, Mascota

class EspecieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especie
        fields = ["id", "nombre"]

class RazaSerializer(serializers.ModelSerializer):
    especie = serializers.PrimaryKeyRelatedField(queryset=Especie.objects.all())
    especie_nombre = serializers.CharField(source="especie.nombre", read_only=True)
    class Meta:
        model = Raza
        fields = ["id","nombre","especie","especie_nombre"]
    def validate_nombre(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre de la raza es obligatorio.")
        return value

class MascotaSerializer(serializers.ModelSerializer):
    especie = serializers.PrimaryKeyRelatedField(queryset=Especie.objects.all())
    raza = serializers.PrimaryKeyRelatedField(queryset=Raza.objects.all(), allow_null=True, required=False)
    especie_nombre = serializers.CharField(source="especie.nombre", read_only=True)
    raza_nombre = serializers.CharField(source="raza.nombre", read_only=True)
    class Meta:
        model = Mascota
        fields = [
            "id","nombre","sexo","edad","fecha_registro","color","descripcion",
            "id_tutor","id_cartilla","id_ubicacion",
            "especie","especie_nombre","raza","raza_nombre"
        ]
    def validate_nombre(self, value):
        v = (value or "").strip()
        if len(v) < 2:
            raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres.")
        return v
    def validate(self, attrs):
        especie = attrs.get("especie") or getattr(self.instance, "especie", None)
        raza = attrs.get("raza") if "raza" in attrs else getattr(self.instance, "raza", None)
        if raza and especie and raza.especie_id != especie.id:
            raise serializers.ValidationError({"raza":"La raza seleccionada no pertenece a la especie indicada."})
        for k in ["id_tutor","id_cartilla","id_ubicacion"]:
            v = attrs.get(k, None)
            if v is not None and v < 0:
                raise serializers.ValidationError({k: "Debe ser un número positivo."})
        return attrs
