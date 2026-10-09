
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

// ============================================================
// API DJANGO - RENDER
// ============================================================

const API = 'https://snoutyweb.onrender.com/api';

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {

  constructor(
    private http: HttpClient
  ) {}

  // ============================================================
  // ADMIN - SOLO LECTURA
  // ============================================================

  /**
   * Obtener solicitudes de adopción.
   */
  getAdminSolicitudes(): Observable<SolicitudAdopcionLite[]> {

    return this.http.get<SolicitudAdopcionLite[]>(
      `${API}/admin/solicitudes-adopcion/`
    );
  }

  /**
   * Obtener configuraciones de seguimiento.
   */
  getAdminConfigs(): Observable<SeguimientoConfig[]> {

    return this.http.get<SeguimientoConfig[]>(
      `${API}/admin/seguimiento-config/`
    );
  }

  /**
   * Obtener evidencias para administración.
   */
  getAdminEvidencias(): Observable<SeguimientoEvidencia[]> {

    return this.http.get<SeguimientoEvidencia[]>(
      `${API}/admin/seguimientos/evidencias/`
    );
  }

  // ============================================================
  // TUTOR
  // ============================================================

  /**
   * Obtener solicitudes aprobadas del tutor.
   */
  getTutorSolicitudesAprobadas(): Observable<SolicitudAdopcionLite[]> {

    return this.http.get<SolicitudAdopcionLite[]>(
      `${API}/tutor/seguimientos/solicitudes/`
    );
  }

  /**
   * Obtener configuraciones del tutor.
   */
  getTutorConfigs(): Observable<SeguimientoConfig[]> {

    return this.http.get<SeguimientoConfig[]>(
      `${API}/seguimiento-config/`
    );
  }

  /**
   * Crear configuración de seguimiento.
   */
  createConfig(
    payload: CreateSeguimientoConfigPayload
  ): Observable<SeguimientoConfig> {

    return this.http.post<SeguimientoConfig>(
      `${API}/seguimiento-config/`,
      payload
    );
  }

  /**
   * Iniciar seguimiento.
   */
  iniciarConfig(
    id: number
  ): Observable<any> {

    return this.http.post<any>(
      `${API}/seguimiento-config/${id}/iniciar/`,
      {}
    );
  }

  /**
   * Enviar recordatorio manual al adoptante.
   */
  enviarRecordatorioManual(
    id: number
  ): Observable<any> {

    return this.http.post<any>(
      `${API}/seguimiento-config/${id}/recordatorio-manual/`,
      {}
    );
  }

  // ============================================================
  // ADOPTANTE
  // ============================================================

  /**
   * Obtener seguimientos iniciados del adoptante.
   */
  getAdoptanteConfigsIniciadas(): Observable<SeguimientoConfig[]> {

    return this.http.get<SeguimientoConfig[]>(
      `${API}/adoptante/seguimientos/configs/`
    );
  }

  // ============================================================
  // EVIDENCIAS - ADOPTANTE
  // ============================================================

  /**
   * Obtener evidencias registradas.
   */
  listEvidencias(): Observable<SeguimientoEvidencia[]> {

    return this.http.get<SeguimientoEvidencia[]>(
      `${API}/seguimientos/evidencias/`
    );
  }

  /**
   * Crear evidencia mediante JSON.
   *
   * Utilizar cuando no se necesita adjuntar
   * una imagen o archivo.
   */
  createEvidenciaJson(
    payload: CreateEvidenciaJsonPayload
  ): Observable<SeguimientoEvidencia> {

    return this.http.post<SeguimientoEvidencia>(
      `${API}/seguimientos/evidencias/`,
      payload
    );
  }

  // ============================================================
  // SUBIR EVIDENCIA CON IMAGEN - CORREGIDO
  // ============================================================

  /**
   * Registrar una evidencia con fotografía.
   *
   * Endpoint correcto:
   * POST /api/seguimientos/evidencias/
   *
   * Campos esperados por Django:
   * - solicitud
   * - imagen
   * - fecha (opcional)
   * - obs (opcional)
   */
  uploadEvidenciaMultipart(params: {
    solicitudId: number;
    file: File;
    fecha?: string;
    obs?: string;
  }): Observable<SeguimientoEvidencia> {

    // ========================================================
    // 1. PREPARAR FORMULARIO MULTIPART
    // ========================================================

    const fd = new FormData();

    // ID de solicitud de adopción.
    fd.append(
      'solicitud',
      String(params.solicitudId)
    );

    // Fotografía o archivo de evidencia.
    fd.append(
      'imagen',
      params.file,
      params.file.name
    );

    // ========================================================
    // 2. FECHA OPCIONAL
    // ========================================================

    if (params.fecha) {

      fd.append(
        'fecha',
        params.fecha
      );
    }

    // ========================================================
    // 3. OBSERVACIÓN OPCIONAL
    // ========================================================

    if (params.obs?.trim()) {

      fd.append(
        'obs',
        params.obs.trim()
      );
    }

    // ========================================================
    // 4. ENVIAR EVIDENCIA AL BACKEND
    // ========================================================

    return this.http.post<SeguimientoEvidencia>(
      `${API}/seguimientos/evidencias/`,
      fd
    );
  }

}
