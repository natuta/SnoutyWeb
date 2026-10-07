import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface FotoMascotaApi {
  id?: number;
  mascota_id: number;
  s3_url?: string | null;
  imagen_url?: string | null;
  fecha?: string | null; // ✅ opcional
}

export interface MascotaApi {
  id: number;
  nombre: string;
  sexo: 'M' | 'F' | string;
  edad_meses?: number | null;
  estado?: string | null;
  fecha_registro?: string | null;

  color?: string | null;
  tamano_cm?: number | string | null; // ✅ a veces llega como string desde API
  descripcion?: string | null;
  ubicacion?: string | null;

  especie_id?: number | null;
  raza_id?: number | null;

  especie_nombre?: string | null;
  raza_nombre?: string | null;

  // ✅ del serializer
  foto_url?: string | null;
  fotos?: FotoMascotaApi[];
}

export type TamanoCategoria = 'PEQUENO' | 'MEDIANO' | 'GRANDE' | 'SIN_DATO';

export interface MascotaCard extends MascotaApi {
  fotoUrl: string;
  tamanoCategoria: TamanoCategoria;
}

@Injectable({ providedIn: 'root' })
export class MascotaService {
private baseBuscador = 'https://snoutyweb.onrender.com/api/buscador/';

  constructor(private http: HttpClient) {}

  getMascotasDisponibles(): Observable<MascotaCard[]> {
    return this.http.get<MascotaApi[]>(this.baseBuscador).pipe(
      map((lista) => (lista || []).map((m) => this.toCard(m)))
    );
  }

  buscar(q: string): Observable<MascotaCard[]> {
    const query = (q || '').trim();

    // ✅ si está vacío, devuelve igual que disponibles (evita ?q=)
    if (!query) return this.getMascotasDisponibles();

    const params = new HttpParams().set('q', query);

    return this.http.get<MascotaApi[]>(this.baseBuscador, { params }).pipe(
      map((lista) => (lista || []).map((m) => this.toCard(m)))
    );
  }

  private toCard(m: MascotaApi): MascotaCard {
    const fotoUrl = this.extraerPrimeraFoto(m);

    // ✅ normalizar tamano_cm a number
    const tam = this.toNumberOrNull(m.tamano_cm);

    return {
      ...m,
      fotoUrl,
      tamanoCategoria: this.calcularTamanoCategoria(tam),
    };
  }

  private extraerPrimeraFoto(m: MascotaApi): string {
    // ✅ prioridad 1: foto_url (principal del backend)
    const primary = String(m?.foto_url || '').trim();
    if (primary) return primary;

    // ✅ prioridad 2: buscar en array fotos la primera con url válida
    if (Array.isArray(m?.fotos) && m.fotos.length) {
      for (const f of m.fotos) {
        const url = String(f?.imagen_url || f?.s3_url || '').trim();
        if (url) return url;
      }
    }

    return '';
  }

  private toNumberOrNull(v: number | string | null | undefined): number | null {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private calcularTamanoCategoria(tam: number | null): TamanoCategoria {
    if (tam == null) return 'SIN_DATO';
    if (tam < 30) return 'PEQUENO';
    if (tam < 60) return 'MEDIANO';
    return 'GRANDE';
  }
}