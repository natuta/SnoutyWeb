
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE } from '../api.config';
import { Especie } from '../models/especie';
import { Raza } from '../models/raza';
import { Mascota } from '../models/mascota';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  // Especies
  listEspecies() { return this.http.get<Especie[]>(`${API_BASE}/especies/`); }
  getEspecie(id: number) { return this.http.get<Especie>(`${API_BASE}/especies/${id}/`); }
  createEspecie(data: Especie) { return this.http.post<Especie>(`${API_BASE}/especies/`, data); }
  updateEspecie(id: number, data: Especie) { return this.http.put<Especie>(`${API_BASE}/especies/${id}/`, data); }
  deleteEspecie(id: number) { return this.http.delete<void>(`${API_BASE}/especies/${id}/`); }

  // Razas
  listRazas() { return this.http.get<Raza[]>(`${API_BASE}/razas/`); }
  getRaza(id: number) { return this.http.get<Raza>(`${API_BASE}/razas/${id}/`); }
  createRaza(data: Raza) { return this.http.post<Raza>(`${API_BASE}/razas/`, data); }
  updateRaza(id: number, data: Raza) { return this.http.put<Raza>(`${API_BASE}/razas/${id}/`, data); }
  deleteRaza(id: number) { return this.http.delete<void>(`${API_BASE}/razas/${id}/`); }

  // Mascotas
  listMascotas() { return this.http.get<Mascota[]>(`${API_BASE}/mascotas/`); }
  getMascota(id: number) { return this.http.get<Mascota>(`${API_BASE}/mascotas/${id}/`); }
  createMascota(data: Mascota) { return this.http.post<Mascota>(`${API_BASE}/mascotas/`, data); }
  updateMascota(id: number, data: Mascota) { return this.http.put<Mascota>(`${API_BASE}/mascotas/${id}/`, data); }
  deleteMascota(id: number) { return this.http.delete<void>(`${API_BASE}/mascotas/${id}/`); }
}
