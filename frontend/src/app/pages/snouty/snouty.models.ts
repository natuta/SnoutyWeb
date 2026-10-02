// src/app/pages/snouty/snouty.models.ts

// ======================================================
// TIPOS AUXILIARES
// ======================================================

// Nota: Si tu backend usa "MACHO/HEMBRA" en vez de M/F, cambia aquí.
export type SexoMascota = 'M' | 'F';

// Ajusta si tu backend tiene más estados (ej. ADOPTADO)
export type EstadoMascota = 'DISPONIBLE' | 'RESERVADO' | 'INACTIVO' | 'ADOPTADO';

export type EdadUnidad = 'MESES' | 'ANIOS';

export type ActitudClinica = 'ASTENICO' | 'APOPLETICO' | 'LINFATICO';
export type CondicionCorporal = 'OBESO' | 'NORMAL' | 'DELGADO' | 'CAQUECTICO';
export type EstadoDeshidratacion = 'NORMAL' | '5' | '6-7' | '8-9' | '10+';

export type UserRole = 'TUTOR' | 'ADOPTANTE' | 'ADMIN';

// ISO helpers
export type ISODate = string;      // 'YYYY-MM-DD'
export type ISODateTime = string;  // '2026-01-04T01:59:33.134Z' etc.

// ======================================================
// ESPECIE / RAZA
// ======================================================

export interface Especie {
  id?: number;
  nombre: string;
}

export interface Raza {
  id?: number;
  especie_id: number;
  nombre: string;
}

// ======================================================
// USUARIO (base)
// ======================================================
export interface Usuario {
  id: number;
  email: string;
  rol: UserRole;

  nombres: string;
  apellidos: string;
  telefono?: string | null;

  foto_perfil_s3?: string | null;

  // OJO: si tu API NO manda estos, déjalos opcionales para que no rompa.
  is_active?: boolean;
  is_staff?: boolean;

  date_joined?: ISODateTime;

  // Compatibilidad si el API devuelve datos del perfil (flat)
  nit?: string | null; // TUTOR
  ci?: string | null;  // ADOPTANTE
  tiene_patio?: boolean | null;

  // ✅ YA NO ES FACTURA: es recibo de luz
  foto_recibo_luz_s3?: string | null;

  // ✅ otros documentos del adoptante (según tu serializer)
  foto_ci_s3?: string | null;
  foto_garante_s3?: string | null;
  foto_fachada_s3?: string | null;
  foto_domicilio_s3?: string | null;
  foto_croquis_s3?: string | null;

  // ✅ datos nuevos del adoptante
  ocupacion?: string | null;
  direccion?: string | null;
  edad?: number | null;
  sexo?: 'M' | 'F' | 'O' | null;
}

// ======================================================
// PERFILES POR ROL
// ======================================================

export interface PerfilTutor {
  id?: number;
  user: number;
  nit: string;
}
export interface PerfilAdoptante {
  id?: number;
  user: number;
  ci: string;
  tiene_patio: boolean;

  foto_recibo_luz_s3?: string | null;   // ✅
  foto_ci_s3?: string | null;
  foto_garante_s3?: string | null;
  foto_fachada_s3?: string | null;
  foto_domicilio_s3?: string | null;
  foto_croquis_s3?: string | null;
}

// Nota: en backend NO existe un perfil admin separado,
// el admin es Usuario con rol "ADMIN".
// Deja esto solo si lo usas para UI.
export interface Administrador {
  id?: number;
  user: number;
  tipo?: string | null;
}

// ======================================================
// VIEWMODEL (UI): Usuario + Perfil según rol
// ======================================================

export interface UsuarioCompleto extends Usuario {
  perfilTutor?: PerfilTutor | null;
  perfilAdoptante?: PerfilAdoptante | null;
  perfilAdmin?: Administrador | null;
}

export interface Mascota {
  id: number;

  nombre: string;
  sexo: SexoMascota;

  edad_meses?: number | null;

  // solo UI
  edad_valor?: number | null;
  edad_unidad?: EdadUnidad;

  estado: EstadoMascota;
  fecha_registro: ISODate;

  color?: string | null;
  tamano_cm?: string | number | null;
  descripcion?: string | null;

  // ✅ ubicación como texto
  ubicacion?: string | null;

  especie_id: number;
  raza_id?: number | null;

  // read-only
  perfil_tutor_id?: number;

  created_at?: ISODateTime;
  updated_at?: ISODateTime;

  // relaciones de solo lectura
  fotos?: FotoMascota[];

  tutor_nombres?: string;
  tutor_apellidos?: string;
  tutor_telefono?: string;
  tutor_email?: string;

  especie_nombre?: string;
  raza_nombre?: string;
}

// ======================================================
// FOTO MASCOTA
// ======================================================

export interface FotoMascota {
  id?: number;
  mascota_id: number;

  // subida (cuando haces multipart)
  imagen?: File | null;

  // read-only
  s3_url?: string | null;
  imagen_url?: string | null;

  fecha: ISODate;
}

// DTO recomendado para upload (si usas endpoint multipart)
export interface FotoMascotaUploadDto {
  mascota_id: number;
  file: File;
  fecha?: ISODate;
}

// ======================================================
// HISTORIAL MÉDICO
// ======================================================

export interface HistorialMedico {
  id?: number;
  aws_s3_file?: string | null;
}

// ======================================================
// CARTILLA MÉDICA
// ======================================================

export interface CartillaMedica {
  id?: number;

  mascota_id: number;
  historial_medico_id?: number | null;

  esterilizado: boolean;
  enfermedades_anteriores?: string | null;

  actitud?: ActitudClinica | null;
  alergias?: string | null;
  condicion_corporal?: CondicionCorporal | null;

  peso_kg?: string | number | null;
  estado_deshidratacion?: EstadoDeshidratacion | null;

  mucosa_oral_conjuntival?: string | null;
  mucosa_intima?: string | null;
  mucosa_rectal?: string | null;
  mucosa_ojos?: string | null;
  mucosa_nodulos?: string | null;
  mucosa_piel?: string | null;

  locomocion?: string | null;

  temperatura_c?: string | number | null;
  frec_cardiaca_lpm?: number | null;
  frec_respiratoria_rpm?: number | null;

  fecha: ISODate;
}

// ======================================================
// VACUNA
// ======================================================

export interface Vacuna {
  id?: number;
  cartilla_medica_id: number;

  tipo: string;
  producto?: string | null;
  fecha_aplicacion: ISODate;
  proxima_dosis?: ISODate | null;
  veterinaria?: string | null;
}

// ======================================================
// SOLICITUD DE ADOPCIÓN
// ======================================================

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudAdopcion {
  id?: number;

  // DRF usa "mascota"
  mascota: number;

  // read-only backend
  perfil_adoptante?: number;

  estado?: EstadoSolicitud;
  motivacion?: string | null;

  created_at?: ISODateTime;
  updated_at?: ISODateTime;

  mascota_nombre?: string;
  adoptante_email?: string;
  tutor_email?: string;
}

// ======================================================
// NOTIFICACIONES
// ======================================================

export interface Notificacion {
  id?: number;

  solicitud: number;
  perfil_tutor: number;

  tipo: string;
  titulo: string;
  cuerpo?: string | null;

  creada_en?: ISODateTime;
  leida: boolean;
}

// ======================================================
// VALORACIÓN
// ======================================================

export interface Valoracion {
  id?: number;

  // read-only
  usuario_id?: number;
  usuario_email?: string;

  puntuacion: number;
  comentario?: string | null;
  creado_en?: ISODateTime;
}

// ======================================================
// SEGUIMIENTO (CONFIG)
// ======================================================

export type SeguimientoModo = 'MANUAL' | 'AUTO';
export type SeguimientoFrecuencia =
  | 'DIARIO'
  | 'SEMANAL'
  | 'QUINCENAL'
  | 'MENSUAL'
  | 'TRIMESTRAL';

export interface SeguimientoConfig {
  id: number;
  solicitud: number;

  activo: boolean;
  modo: SeguimientoModo;
  frecuencia: SeguimientoFrecuencia | null;

  inicio: ISODate | null;
  proximo_envio: ISODate | null;

  creado_en: ISODateTime;
  actualizado_en: ISODateTime;

  // extras si tu serializer los manda
  mascota_nombre?: string;
  adoptante_email?: string;
  tutor_email?: string;
  estado_solicitud?: EstadoSolicitud;
}

// ======================================================
// SEGUIMIENTO SOLICITUD (EVIDENCIAS)
// IMPORTANTE: en backend el campo se llama "solicitud" (no solicitud_id)
// ======================================================

export interface SeguimientoSolicitud {
  id?: number;
  solicitud: number;

  fecha: ISODate;
  obs?: string | null;

  // read-only
  s3_url?: string | null;
  imagen_url?: string | null;
}

// DTO para tu endpoint multipart /api/seguimientos/upload/
export interface SeguimientoUploadDto {
  solicitud_id: number;
  file: File;
  fecha?: ISODate;
  obs?: string;
}

export interface SeguimientoUploadResponse {
  id: number;
  fecha: ISODate;
  obs: string;
  imagen_url: string | null;
}

// ======================================================
// AUTH
// ======================================================

export interface AuthUser {
  id: number;
  email: string;
  rol: UserRole;
  nombres: string;
  apellidos: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;

  rol: UserRole;
  nombres: string;
  apellidos: string;
  telefono?: string;

  // archivos
  foto_perfil_file?: File;

  // tutor
  nit?: string;

  // adoptante
  ci?: string;
  tiene_patio?: boolean;
  factura_file?: File;
}
