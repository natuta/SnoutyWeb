from datetime import timedelta
import calendar

def next_date(base_date, frecuencia: str):
    """
    Calcula la próxima fecha de envío.
    - DIARIO: +1 día
    - SEMANAL: +7 días
    - QUINCENAL: +15 días
    - MENSUAL: conserva el mismo día del mes siguiente
    - TRIMESTRAL: conserva el mismo día, 3 meses adelante
    - default: 30 días
    """
    freq = (frecuencia or "").upper()

    if freq == "DIARIO":
        return base_date + timedelta(days=1)

    if freq == "SEMANAL":
        return base_date + timedelta(days=7)

    if freq == "QUINCENAL":
        return base_date + timedelta(days=15)

    if freq == "MENSUAL":
        # conservar día del mes en el mes siguiente
        y, m = base_date.year, base_date.month + 1
        if m == 13:
            m = 1
            y += 1
        last_day = calendar.monthrange(y, m)[1]
        d = min(base_date.day, last_day)
        return base_date.replace(year=y, month=m, day=d)

    if freq == "TRIMESTRAL":
        # conservar día, 3 meses adelante
        y, m = base_date.year, base_date.month + 3
        while m > 12:
            m -= 12
            y += 1
        last_day = calendar.monthrange(y, m)[1]
        d = min(base_date.day, last_day)
        return base_date.replace(year=y, month=m, day=d)

    # default seguro
    return base_date + timedelta(days=30)
