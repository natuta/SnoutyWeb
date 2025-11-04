
# Backend Snouty (Django + DRF) — Puerto 8000, BD bdsnouty

## Instalar
```
python -m venv venv
.env\Scriptsctivate
pip install -r requirements.txt
```

Crea BD y permisos si hace falta:
```sql
CREATE DATABASE IF NOT EXISTS bdsnouty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'snouty'@'localhost' IDENTIFIED BY 'snouty123';
GRANT ALL PRIVILEGES ON bdsnouty.* TO 'snouty'@'localhost';
FLUSH PRIVILEGES;
```

## Migrar y correr
```
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

## Endpoints
- http://localhost:8000/api/especies/
- http://localhost:8000/api/razas/
- http://localhost:8000/api/mascotas/
