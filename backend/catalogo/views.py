
from rest_framework import viewsets, filters
from .models import Especie, Raza, Mascota
from .serializers import EspecieSerializer, RazaSerializer, MascotaSerializer

class EspecieViewSet(viewsets.ModelViewSet):
    queryset = Especie.objects.all()
    serializer_class = EspecieSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nombre"]
    ordering_fields = ["nombre", "id"]

class RazaViewSet(viewsets.ModelViewSet):
    queryset = Raza.objects.select_related("especie").all()
    serializer_class = RazaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nombre", "especie__nombre"]
    ordering_fields = ["nombre", "id", "especie__nombre"]

class MascotaViewSet(viewsets.ModelViewSet):
    queryset = Mascota.objects.select_related("especie","raza").all()
    serializer_class = MascotaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nombre","color","descripcion","especie__nombre","raza__nombre"]
    ordering_fields = ["fecha_registro","nombre","edad"]
