// src/app/pages/snouty/seguimiento/seguimiento.models.ts

export type SeguimientoModo = 'MANUAL' | 'AUTO';
export type SeguimientoFrecuencia = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'TRIMESTRAL';

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | string;

export interface SolicitudAdopcionLite {
  id: number;
  estado: EstadoSolicitud;

  // según tu serializer real, puede que venga más info:
  mascota?: {
    id: number;
    nombre: string;
  } | null;

  // algunos backends mandan campos "aplanados":
  mascota_nombre?: string;
  adoptante_email?: string;

  created_at?: string;
  updated_at?: string;
}

/**
 * Configuración de seguimiento (tabla aparte).
 * Nota: `inicio` y `proximo_envio` son read-only (se setean al iniciar / tareas).
 */
export interface SeguimientoConfig {
  id: number;
  solicitud: number;

  activo: boolean;
  modo: SeguimientoModo;
  frecuencia?: SeguimientoFrecuencia | null;

  inicio?: string | null;        // YYYY-MM-DD
  proximo_envio?: string | null; // YYYY-MM-DD

  creado_en?: string;
  actualizado_en?: string;

  // campos read-only de tu serializer:
  mascota_nombre?: string;
  adoptante_email?: string;
  tutor_email?: string;
  estado_solicitud?: EstadoSolicitud;
}

/**
 * Evidencia/foto de seguimiento.
 * `imagen` es File en upload multipart.
 */
export interface SeguimientoEvidencia {
  id: number;
  solicitud: number;
  fecha: string; // YYYY-MM-DD
  obs?: string | null;

  // backend devuelve URLs
  imagen_url?: string | null;
  s3_url?: string | null;

  // si usas POST JSON (no multipart), podrías mandar esto como string o ignorarlo
  imagen?: any;
}

/**
 * Payloads
 */
export interface CreateSeguimientoConfigPayload {
  solicitud: number;
  activo?: boolean;
  modo: SeguimientoModo;
  frecuencia?: SeguimientoFrecuencia | null;
}

export interface PatchSeguimientoConfigPayload {
  activo?: boolean;
  modo?: SeguimientoModo;
  frecuencia?: SeguimientoFrecuencia | null;
}

export interface CreateEvidenciaJsonPayload {
  solicitud: number;
  fecha?: string; // opcional (si no, backend usa hoy)
  obs?: string;
  // imagen?: ... (si no es multipart, normalmente no mandas file aquí)
}
