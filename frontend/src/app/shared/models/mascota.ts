export interface Mascota {
  id?: number;
  nombre: string;
  color?: string;
  sexo: 'M'|'F';
  edad?: number;
  descripcion?: string;
  especie: number;
  raza?: number | null;
  id_tutor?: number | null;
  id_cartilla?: number | null;
  id_ubicacion?: number | null;
  fecha_registro?: string;
}
