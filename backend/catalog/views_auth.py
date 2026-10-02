# catalog/views_auth.py
from django.contrib.auth import authenticate, get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

UserModel = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    if not email or not password:
        return Response(
            {"detail": "email y password son obligatorios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, **{UserModel.USERNAME_FIELD: email, "password": password})

    if user is None:
        return Response(
            {"detail": "Credenciales inválidas."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"detail": "Usuario deshabilitado."},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh = RefreshToken.for_user(user)

    # ✅ coherente con tu sistema: foto_perfil_s3 / foto_perfil_url
    foto_perfil_s3 = getattr(user, "foto_perfil_s3", None)
    foto_perfil_url = getattr(user, "foto_url", None)  # si tu UserModel tiene @property foto_url

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "rol": getattr(user, "rol", None),
                "nombres": getattr(user, "nombres", ""),
                "apellidos": getattr(user, "apellidos", ""),

                # ✅ elige uno o manda ambos:
                "foto_perfil_s3": foto_perfil_s3,
                "foto_perfil_url": foto_perfil_url or foto_perfil_s3,
            },
        },
        status=status.HTTP_200_OK,
    )
