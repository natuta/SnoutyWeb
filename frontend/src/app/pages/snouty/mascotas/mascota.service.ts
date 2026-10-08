
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// ============================================================
// INTERFAZ DE FOTOGRAFÍAS DE MASCOTAS
// ============================================================

export interface FotoMascotaApi {
  id?: number;
  mascota_id: number;
  s3_url?: string | null;
  imagen_url?: string | null;
  fecha?: string | null;
}

// ============================================================
// INTERFAZ PRINCIPAL DE MASCOTAS
// ============================================================

export interface MascotaApi {

  // ID original de la mascota en MySQL
  id: number;

  // Datos básicos
  nombre: string;
  sexo: 'M' | 'F' | string;
  edad_meses?: number | null;
  estado?: string | null;
  fecha_registro?: string | null;

  // Características
  color?: string | null;
  tamano_cm?: number | string | null;
  descripcion?: string | null;
  ubicacion?: string | null;

  // Relaciones
  especie_id?: number | null;
  raza_id?: number | null;

  // Nombres enviados por el serializer
  especie_nombre?: string | null;
  raza_nombre?: string | null;

  // Fotografías
  foto_url?: string | null;
  fotos?: FotoMascotaApi[];
}

// ============================================================
// TIPOS DE TAMAÑO
// ============================================================

export type TamanoCategoria =
  | 'PEQUENO'
  | 'MEDIANO'
  | 'GRANDE'
  | 'SIN_DATO';

// ============================================================
// INTERFAZ PARA TARJETAS DE MASCOTAS
// ============================================================

export interface MascotaCard extends MascotaApi {
  fotoUrl: string;
  tamanoCategoria: TamanoCategoria;
}

// ============================================================
// SERVICIO DE MASCOTAS
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class MascotaService {

  // Backend Django alojado en Render
  private readonly baseBuscador =
    'https://snoutyweb.onrender.com/api/buscador/';

  constructor(
    private http: HttpClient
  ) {}

  // ==========================================================
  // OBTENER TODAS LAS MASCOTAS DISPONIBLES
  // ==========================================================

  getMascotasDisponibles(): Observable<MascotaCard[]> {

    return this.http
      .get<MascotaApi[]>(this.baseBuscador)
      .pipe(
        map((lista: MascotaApi[]) => {

          return (lista || []).map((mascota) => {
            return this.toCard(mascota);
          });

        })
      );
  }

  // ==========================================================
  // BUSCAR MASCOTAS POR TEXTO
  // ==========================================================

  buscar(q: string): Observable<MascotaCard[]> {

    const query = (q || '').trim();

    // Si el texto está vacío, obtener todas las disponibles
    if (!query) {
      return this.getMascotasDisponibles();
    }

    const params = new HttpParams().set('q', query);

    return this.http
      .get<MascotaApi[]>(this.baseBuscador, { params })
      .pipe(
        map((lista: MascotaApi[]) => {

          return (lista || []).map((mascota) => {
            return this.toCard(mascota);
          });

        })
      );
  }

  // ==========================================================
  // CONVERTIR MASCOTA DE LA API A TARJETA
  // ==========================================================

  private toCard(m: MascotaApi): MascotaCard {

    // Obtener fotografía principal
    const fotoUrl = this.extraerPrimeraFoto(m);

    // Normalizar tamaño recibido de Django
    const tam = this.toNumberOrNull(m.tamano_cm);

    return {

      // Conservar todos los datos originales,
      // incluido el ID de la mascota
      ...m,

      // Fotografía para mostrar en Angular
      fotoUrl: fotoUrl,

      // Categoría calculada según tamaño
      tamanoCategoria: this.calcularTamanoCategoria(tam)

    };
  }

  // ==========================================================
  // OBTENER PRIMERA FOTOGRAFÍA DISPONIBLE
  // ==========================================================

  private extraerPrimeraFoto(m: MascotaApi): string {

    // Prioridad 1:
    // Fotografía principal enviada por Django
    const primary = String(
      m?.foto_url || ''
    ).trim();

    if (primary) {
      return primary;
    }

    // Prioridad 2:
    // Primera fotografía válida del arreglo de fotos
    if (Array.isArray(m?.fotos) && m.fotos.length > 0) {

      for (const foto of m.fotos) {

        const url = String(
          foto?.imagen_url ||
          foto?.s3_url ||
          ''
        ).trim();

        if (url) {
          return url;
        }

      }

    }

    // Si no existe fotografía
    return '';
  }

  // ==========================================================
  // CONVERTIR TAMAÑO A NÚMERO
  // ==========================================================

  private toNumberOrNull(
    valor: number | string | null | undefined
  ): number | null {

    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return null;
    }

    const numero =
      typeof valor === 'number'
        ? valor
        : Number(valor);

    // Evitar NaN e Infinity
    if (!Number.isFinite(numero)) {
      return null;
    }

    return numero;
  }

  // ==========================================================
  // CALCULAR CATEGORÍA DE TAMAÑO
  // ==========================================================

  private calcularTamanoCategoria(
    tam: number | null
  ): TamanoCategoria {

    // Sin información
    if (tam === null) {
      return 'SIN_DATO';
    }

    // Menos de 30 cm
    if (tam < 30) {
      return 'PEQUENO';
    }

    // Entre 30 y menos de 60 cm
    if (tam < 60) {
      return 'MEDIANO';
    }

    // 60 cm o más
    return 'GRANDE';
  }

}
