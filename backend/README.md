# Backend (Django 5.1.3 + DRF)

CRUD para **usuarios**, **razas**, **ubicaciones** mapeado a tablas existentes (managed=False) en MySQL.

## Pasos rápidos (Windows)
1) Crear y activar venv:
```powershell
py -m venv .venv
.\.venv\Scripts\activate
```
2) Instalar requisitos:
```powershell
pip install -r requirements.txt
```
3) Editar `.env` con tus credenciales MySQL.
4) Ejecutar:
```powershell
python manage.py runserver
```
API base: `http://localhost:8000/api/`

Fecha de generación: 2025-11-12 01:36:59
