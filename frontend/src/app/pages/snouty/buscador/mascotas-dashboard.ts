import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';

import { MascotaCard, MascotaService } from '../mascotas/mascota.service';

@Component({
  selector: 'app-mascotas-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    AutoCompleteModule,
    DialogModule,
    RippleModule,
  ],
  templateUrl: './mascotas-dashboard.html',
  styles: [`
/* ================= CONTENEDOR ================= */
.mascotas-container{
  max-width: 1180px;
  margin: 1.5rem auto;
  display:flex;
  flex-direction:column;
  gap: 1.5rem;
  padding: 0 1rem;
}

/* ================= CABECERA/FILTROS (GLASS) ================= */
.search-card{
  border-radius: 22px;
  padding: 24px;
  background: rgba(255,255,255,.88);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 34px rgba(0,0,0,.14);
}

.title{
  text-align:center;
  font-weight: 900;
  font-size: 1.6rem;
  margin: 0;
}
.subtitle{
  text-align:center;
  opacity:.75;
  margin-top: 6px;
}

.filters{
  margin-top: 1.6rem;
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.2rem;
  align-items: end;
}
@media (max-width: 900px){
  .filters{ grid-template-columns: 1fr; }
}

.filter-item{ display:flex; flex-direction:column; }
.field-label{
  font-size:.85rem;
  font-weight: 800;
  margin-bottom: .45rem;
  display:flex;
  gap: .45rem;
  align-items:center;
  color:#495057;
}

/* ================= AUTOCOMPLETE ================= */
:host ::ng-deep .p-autocomplete,
:host ::ng-deep .p-autocomplete-input{ width:100% !important; }
:host ::ng-deep .p-autocomplete-input{
  height: 46px !important;
  border-radius: 12px !important;
  font-size: .95rem !important;
}

/* ================= SEXO CHIPS ================= */
.sexo-chips{
  display:flex;
  gap: .6rem;
  margin-top: .35rem;
  flex-wrap: wrap;
}
.chip{
  padding: .48rem .95rem;
  border-radius: 999px;
  background: #f1f3f5;
  cursor:pointer;
  font-size: .85rem;
  font-weight: 800;
  transition: all .25s ease;
  user-select:none;
}
.chip:hover{ background: #d1fae5; }
.chip.active{
  background: #10b981;
  color: #fff;
}

/* ================= GRID ================= */
.grid-card{
  border-radius: 22px;
  padding: 20px;
  background:#fff;
  box-shadow: 0 12px 34px rgba(0,0,0,.14);
}

.grid-header{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 10px;
  flex-wrap: wrap;
}
.total{
  font-weight: 900;
  opacity: .85;
}

/* ================= CARDS ================= */
.pets-grid{
  margin-top: 1rem;
  display:grid;
  grid-template-columns: repeat(3, minmax(240px, 1fr));
  gap: 16px;
}
@media (max-width: 992px){ .pets-grid{ grid-template-columns: repeat(2,1fr); } }
@media (max-width: 768px){ .pets-grid{ grid-template-columns: 1fr; } }

.pet-card{
  border-radius: 18px;
  overflow:hidden;
  background:#fff;
  box-shadow: 0 10px 24px rgba(0,0,0,.15);
  display:flex;
  flex-direction:column;
  height: 380px;
  cursor:pointer;
  transition: transform .25s ease, box-shadow .25s ease;
}
.pet-card:hover{
  transform: translateY(-5px);
  box-shadow: 0 16px 38px rgba(0,0,0,.22);
}

.img-wrap{ position:relative; height: 230px; background:#f1f3f5; }
.pet-img{ width:100%; height:100%; object-fit:cover; display:block; }

.placeholder{
  width:100%; height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap: 8px;
  font-weight: 900;
  color:#495057;
}

.badge-row{
  position:absolute;
  left: 10px;
  bottom: 10px;
  display:flex;
  gap: 8px;
  flex-wrap:wrap;
}

.badge{
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0,0,0,.55);
  color:#fff;
  font-size:.78rem;
  backdrop-filter: blur(8px);
}

.pet-body{
  padding: 12px;
  display:flex;
  flex-direction:column;
  justify-content: space-between;
  flex:1;
  text-align:center;
  gap: 10px;
}
.pet-name{
  font-weight: 900;
  font-size: 1.15rem;
  color:#212529;
}
.pet-sub{
  font-size:.9rem;
  opacity:.75;
}
.pet-sub i{ color:#10b981; }

/* ================= MODAL ================= */
.dlg-body{
  display:grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  padding-top: 6px;
}
@media (max-width: 860px){ .dlg-body{ grid-template-columns: 1fr; } }

.dlg-img{
  width:100%;
  height: 280px;
  border-radius: 14px;
  object-fit: cover;
  background:#f1f3f5;
  display:block;
}

.info-grid{
  display:grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
}
@media (max-width: 560px){ .info-grid{ grid-template-columns: 1fr; } }

.info-item{
  background:#f8f9fa;
  border-radius: 12px;
  padding: 10px 12px;
}
.k{ font-weight: 900; font-size: .85rem; opacity:.85; }
.v{ margin-top: 4px; font-size: .98rem; }

.desc-box{
  margin-top: 12px;
  background:#f8f9fa;
  border-radius: 12px;
  padding: 10px 12px;
}
.desc{ margin-top: 6px; line-height: 1.35; opacity:.9; }

.empty{
  text-align:center;
  padding: 22px;
  opacity:.8;
}
  `],
})
export class MascotasDashboard implements OnInit {

  mascotas: MascotaCard[] = [];
  mascotasFiltradas: MascotaCard[] = [];

  nombreTexto = '';
  nombresSugeridos: string[] = [];

  especieTexto = '';
  especiesSugeridas: string[] = [];

  razaTexto = '';
  razasSugeridas: string[] = [];

  // '' = Todos | 'M' | 'F'
  sexoSeleccionado: 'M' | 'F' | '' = '';

  loading = false;

  selectedMascota: MascotaCard | null = null;
  mostrarModal = false;

  private failedImgIds = new Set<number>();

  constructor(
    private mascotaService: MascotaService,
    private router: Router
  ) {}

  trackByMascotaId = (i: number, m: MascotaCard) => (m?.id ?? i);

  ngOnInit(): void {
    this.cargarMascotas();
  }

  cargarMascotas(): void {
    this.loading = true;
    this.failedImgIds.clear();

    this.mascotaService.getMascotasDisponibles().subscribe({
      next: (cards) => {
        this.mascotas = cards || [];
        this.mascotasFiltradas = [...this.mascotas];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando mascotas', err);
        this.loading = false;
        this.mascotas = [];
        this.mascotasFiltradas = [];
      },
    });
  }

  // ====== AUTOCOMPLETE NOMBRE
  buscarNombres(ev: any): void {
    const q = String(ev?.query || '').toLowerCase().trim();
    const set = new Set<string>();
    (this.mascotas || []).forEach(m => {
      const n = String(m?.nombre || '').trim();
      if (n) set.add(n);
    });
    const all = Array.from(set).sort((a,b)=>a.localeCompare(b));
    this.nombresSugeridos = !q ? all.slice(0,25) : all.filter(x => x.toLowerCase().includes(q)).slice(0,25);
  }

  // ====== AUTOCOMPLETE ESPECIE
  buscarEspecies(ev: any): void {
    const q = String(ev?.query || '').toLowerCase().trim();
    const set = new Set<string>();
    (this.mascotas || []).forEach(m => {
      const e = String(m?.especie_nombre || '').trim();
      if (e) set.add(e);
    });
    const all = Array.from(set).sort((a,b)=>a.localeCompare(b));
    this.especiesSugeridas = !q ? all.slice(0,25) : all.filter(x => x.toLowerCase().includes(q)).slice(0,25);
  }

  // ====== AUTOCOMPLETE RAZA
  buscarRazas(ev: any): void {
    const q = String(ev?.query || '').toLowerCase().trim();
    const set = new Set<string>();
    (this.mascotas || []).forEach(m => {
      const r = String(m?.raza_nombre || '').trim();
      if (r) set.add(r);
    });
    const all = Array.from(set).sort((a,b)=>a.localeCompare(b));
    this.razasSugeridas = !q ? all.slice(0,25) : all.filter(x => x.toLowerCase().includes(q)).slice(0,25);
  }

  aplicarFiltros(): void {
    const nombre = String(this.nombreTexto || '').toLowerCase().trim();
    const especie = String(this.especieTexto || '').toLowerCase().trim();
    const raza = String(this.razaTexto || '').toLowerCase().trim();
    const sexo = this.sexoSeleccionado;

    this.mascotasFiltradas = (this.mascotas || []).filter(m => {
      const okNombre = !nombre || String(m?.nombre || '').toLowerCase().includes(nombre);
      const okEspecie = !especie || String(m?.especie_nombre || '').toLowerCase().includes(especie);
      const okRaza = !raza || String(m?.raza_nombre || '').toLowerCase().includes(raza);
      const okSexo = !sexo || String(m?.sexo || '').toUpperCase() === sexo;
      return okNombre && okEspecie && okRaza && okSexo;
    });
  }

  limpiarFiltros(): void {
    this.nombreTexto = '';
    this.especieTexto = '';
    this.razaTexto = '';
    this.sexoSeleccionado = '';
    this.nombresSugeridos = [];
    this.especiesSugeridas = [];
    this.razasSugeridas = [];
    this.mascotasFiltradas = [...this.mascotas];
  }

  // ====== IMÁGENES
  imgFailed(id: any): boolean {
    const n = Number(id ?? 0);
    return !!n && this.failedImgIds.has(n);
  }

  getFotoMascota(m: MascotaCard | null): string {
    const url = String(m?.fotoUrl || '').trim();
    return url || 'assets/layout/images/mascota-placeholder.png';
  }

  onImgError(mascotaId: any): void {
    const id = Number(mascotaId ?? 0);
    if (id) this.failedImgIds.add(id);
  }

  // ====== LABELS
  getSexoLabel(m: any): string {
    return m?.sexo === 'M' ? 'Macho' : m?.sexo === 'F' ? 'Hembra' : '—';
  }

  getEdadLabel(m: any): string {
    const meses = Number(m?.edad_meses ?? 0);
    if (!meses) return 'Edad: —';
    if (meses < 12) return `${meses} mes(es)`;
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto ? `${anios} año(s) ${resto} mes(es)` : `${anios} año(s)`;
  }

  getEstadoLabel(m: any): string {
    const e = String(m?.estado || '').toUpperCase();
    if (e === 'DISPONIBLE') return 'Disponible';
    if (e === 'RESERVADO') return 'Reservado';
    if (e === 'INACTIVO') return 'Inactivo';
    return e || '—';
  }

  // ====== MODAL
  onClickMascota(m: MascotaCard): void {
    this.selectedMascota = m;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.selectedMascota = null;
  }

  irASolicitudAdopcion(m: MascotaCard): void {
    const id = m?.id;
    if (!id) return;
    this.cerrarModal();
    this.router.navigate(['/snouty/solicitudes-adopcion'], { queryParams: { mascotaId: id } });
  }
}
