// src/app/pages/snouty/seguimiento/seguimiento.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SolicitudAdopcionLite,
  SeguimientoConfig,
  SeguimientoEvidencia,
  CreateSeguimientoConfigPayload,
  CreateEvidenciaJsonPayload,
} from './seguimiento.models';

const API = 'https://snoutyweb.onrender.com/api';

@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  constructor(private http: HttpClient) {}

  // =========================================================
  // ADMIN (READ ONLY)
  // =========================================================

  /** GET /api/admin/solicitudes-adopcion/ */
  getAdminSolicitudes(): Observable<SolicitudAdopcionLite[]> {
    return this.http.get<SolicitudAdopcionLite[]>(`${API}/admin/solicitudes-adopcion/`);
  }

  /** GET /api/admin/seguimiento-config/ */
  getAdminConfigs(): Observable<SeguimientoConfig[]> {
    return this.http.get<SeguimientoConfig[]>(`${API}/admin/seguimiento-config/`);
  }

  /** GET /api/admin/seguimientos/evidencias/ */
  getAdminEvidencias(): Observable<SeguimientoEvidencia[]> {
    return this.http.get<SeguimientoEvidencia[]>(`${API}/admin/seguimientos/evidencias/`);
  }

  // =========================================================
  // TUTOR
  // =========================================================

  /** GET /api/tutor/seguimientos/solicitudes/ */
  getTutorSolicitudesAprobadas(): Observable<SolicitudAdopcionLite[]> {
    return this.http.get<SolicitudAdopcionLite[]>(`${API}/tutor/seguimientos/solicitudes/`);
  }

  /** GET /api/seguimiento-config/ (solo las del tutor) */
  getTutorConfigs(): Observable<SeguimientoConfig[]> {
    return this.http.get<SeguimientoConfig[]>(`${API}/seguimiento-config/`);
  }

  /** POST /api/seguimiento-config/ */
  createConfig(payload: CreateSeguimientoConfigPayload): Observable<SeguimientoConfig> {
    return this.http.post<SeguimientoConfig>(`${API}/seguimiento-config/`, payload);
  }

  /** POST /api/seguimiento-config/:id/iniciar/ */
  iniciarConfig(id: number): Observable<any> {
    return this.http.post<any>(`${API}/seguimiento-config/${id}/iniciar/`, {});
  }

  /** POST /api/seguimiento-config/:id/recordatorio-manual/ */
  enviarRecordatorioManual(id: number): Observable<any> {
    return this.http.post<any>(`${API}/seguimiento-config/${id}/recordatorio-manual/`, {});
  }

  // =========================================================
  // ADOPTANTE
  // =========================================================

  /** GET /api/adoptante/seguimientos/configs/ */
  getAdoptanteConfigsIniciadas(): Observable<SeguimientoConfig[]> {
    return this.http.get<SeguimientoConfig[]>(`${API}/adoptante/seguimientos/configs/`);
  }

  // =========================================================
  // EVIDENCIAS (ADOPTANTE)
  // =========================================================

  /** GET /api/seguimientos/evidencias/ (las del adoptante) */
  listEvidencias(): Observable<SeguimientoEvidencia[]> {
    return this.http.get<SeguimientoEvidencia[]>(`${API}/seguimientos/evidencias/`);
  }

  /** POST /api/seguimientos/evidencias/ (JSON, si lo usas) */
  createEvidenciaJson(payload: CreateEvidenciaJsonPayload): Observable<SeguimientoEvidencia> {
    return this.http.post<SeguimientoEvidencia>(`${API}/seguimientos/evidencias/`, payload);
  }

  /** POST /api/seguimientos/evidencias/upload/ (multipart) */
  uploadEvidenciaMultipart(params: {
    solicitudId: number;
    file: File;
    fecha?: string; // YYYY-MM-DD
    obs?: string;
  }): Observable<SeguimientoEvidencia> {
    const fd = new FormData();
    fd.append('solicitud_id', String(params.solicitudId));
    fd.append('file', params.file);

    if (params.fecha) fd.append('fecha', params.fecha);
    if (params.obs) fd.append('obs', params.obs);

    return this.http.post<SeguimientoEvidencia>(`${API}/seguimientos/evidencias/upload/`, fd);
  }
}