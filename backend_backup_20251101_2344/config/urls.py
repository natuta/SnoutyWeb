
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from catalogo.views import EspecieViewSet, RazaViewSet, MascotaViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'especies', EspecieViewSet, basename='especie')
router.register(r'razas', RazaViewSet, basename='raza')
router.register(r'mascotas', MascotaViewSet, basename='mascota')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
