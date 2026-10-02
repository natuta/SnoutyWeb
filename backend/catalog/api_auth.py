# catalog/api_auth.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

UserModel = get_user_model()


class SnoutyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Permite loguearse usando:
      - username + password (si el campo username existe)
      - email + password

    Además:
      - añade rol, nombres y apellidos al token y a la respuesta.
    """

    email = serializers.EmailField(required=False)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Rol
        if user.is_superuser or user.is_staff or hasattr(user, "perfil_admin"):
            rol = "ADMIN"
        elif hasattr(user, "perfil_tutor"):
            rol = "TUTOR"
        elif hasattr(user, "perfil_adoptante"):
            rol = "ADOPTANTE"
        else:
            rol = "DESCONOCIDO"

        token["rol"] = rol
        token["email"] = getattr(user, "email", "")

        # nombres/apellidos (directo o por perfil_usuario)
        nombres = getattr(user, "nombres", "") or ""
        apellidos = getattr(user, "apellidos", "") or ""

        perfil_base = getattr(user, "perfil_usuario", None)
        if perfil_base:
            nombres = getattr(perfil_base, "nombres", nombres) or nombres
            apellidos = getattr(perfil_base, "apellidos", apellidos) or apellidos

        token["nombres"] = nombres
        token["apellidos"] = apellidos

        return token

    def validate(self, attrs):
        username = (attrs.get("username") or "").strip()
        email = (attrs.get("email") or "").strip()
        password = attrs.get("password")

        if not password or not (username or email):
            raise AuthenticationFailed(
                "Email/usuario y contraseña son obligatorios.",
                code="authorization",
            )

        identificador = (email or username).strip()

        # 1) Por email si parece email
        user = None
        if "@" in identificador:
            user = UserModel.objects.filter(email__iexact=identificador).first()

        # 2) Por username SOLO si el campo existe realmente
        if user is None:
            try:
                UserModel._meta.get_field("username")
                user = UserModel.objects.filter(username__iexact=identificador).first()
            except Exception:
                pass

        if user is None or not user.is_active:
            raise AuthenticationFailed(
                "No active account found with the given credentials",
                code="authorization",
            )

        # 3) Autenticar usando el USERNAME_FIELD real del modelo custom (normalmente 'email')
        login_key = getattr(UserModel, "USERNAME_FIELD", "username")
        login_value = getattr(user, login_key, None)

        if not login_value:
            raise AuthenticationFailed(
                f"El usuario no tiene el campo {login_key} para autenticación.",
                code="authorization",
            )

        data = super().validate(
            {
                login_key: login_value,
                "password": password,
            }
        )

        # 4) Respuesta extra
        user = self.user

        if user.is_superuser or user.is_staff or hasattr(user, "perfil_admin"):
            rol = "ADMIN"
        elif hasattr(user, "perfil_tutor"):
            rol = "TUTOR"
        elif hasattr(user, "perfil_adoptante"):
            rol = "ADOPTANTE"
        else:
            rol = "DESCONOCIDO"

        nombres = getattr(user, "nombres", "") or ""
        apellidos = getattr(user, "apellidos", "") or ""

        perfil_base = getattr(user, "perfil_usuario", None)
        if perfil_base:
            nombres = getattr(perfil_base, "nombres", nombres) or nombres
            apellidos = getattr(perfil_base, "apellidos", apellidos) or apellidos

        data.update(
            {
                "user_id": user.id,
                "email": user.email,
                "rol": rol,
                "nombres": nombres,
                "apellidos": apellidos,
            }
        )

        return data


class SnoutyTokenObtainPairView(TokenObtainPairView):
    serializer_class = SnoutyTokenObtainPairSerializer
