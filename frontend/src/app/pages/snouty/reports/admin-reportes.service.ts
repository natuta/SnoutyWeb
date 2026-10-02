import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TopRazaRow = {
  especie__nombre: string;
  raza__nombre: string | null;
  total: number;
};

export type SolicitudesTutorRow = {
  mascota__perfil_tutor_id: number;
  mascota__perfil_tutor__user__email: string;
  mascota__perfil_tutor__user__nombres: string;
  mascota__perfil_tutor__user__apellidos: string;
  total: number;
  aprobadas: number;
  rechazadas: number;
  pendientes: number;
  tasa_aprobacion: number;
  tasa_rechazo: number;
};

export type CumplimientoDetalle = {
  solicitud_id: number;
  mascota: string;
  tutor: string;
  adoptante: string;
  frecuencia: string | null;
  ultimo_envio: string | null;
  estado: 'AL_DIA' | 'ATRASADO';
};

export type CumplimientoResp = {
  resumen: { al_dia: number; atrasados: number; sin_frecuencia: number };
  detalle: CumplimientoDetalle[];
};

@Injectable({ providedIn: 'root' })
export class AdminReportesService {
  // ✅ Si tu Angular proxy ya manda a Django, déjalo así:
  private base = '/api/admin/stats';

  // ❗ Si NO usas proxy, comenta arriba y usa:
  // private base = 'http://127.0.0.1:8000/api/admin/stats';

  constructor(private http: HttpClient) {}

  topRazas(top = 10): Observable<TopRazaRow[]> {
    const params = new HttpParams().set('top', String(top));
    return this.http.get<TopRazaRow[]>(`${this.base}/mascotas-disponibles-top-razas/`, { params });
  }

  solicitudesPorTutor(): Observable<SolicitudesTutorRow[]> {
    return this.http.get<SolicitudesTutorRow[]>(`${this.base}/solicitudes-por-tutor/`);
  }

  cumplimientoSeguimientos(): Observable<CumplimientoResp> {
    return this.http.get<CumplimientoResp>(`${this.base}/seguimientos-cumplimiento/`);
  }
}
