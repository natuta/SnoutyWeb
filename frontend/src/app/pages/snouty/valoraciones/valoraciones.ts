import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RatingModule } from 'primeng/rating';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { StepsModule } from 'primeng/steps';

import { MessageService } from 'primeng/api';
import { AuthService, UserRole } from '../../auth/services/auth.service';

const API_URL = 'http://localhost:8000/api';

export interface UsuarioCalificable {
  id: number;
  perfilId: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  displayName: string;
  promedio_puntuacion?: number;
  total_valoraciones?: number;
}

export interface Valoracion {
  id: number;
  usuario?: number;
  usuario_id?: number;
  usuario_email?: string;

  autor?: number;
  autor_id?: number;
  autor_email?: string;

  puntuacion: number;
  comentario: string | null;
  creado_en: string;
}

@Component({
  selector: 'app-snouty-valoraciones-page',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    RatingModule,
    AutoCompleteModule,
    ToastModule,
    StepsModule,
  ],
  templateUrl: './valoraciones.html',
  styles: [`
    .snouty-page{
      min-height: calc(100vh - 2rem);
      padding: 2rem 1rem;
      background: #f3f5f8;
      display: flex;
      justify-content: center;
    }

    .snouty-container{
      width: min(1200px, 100%);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .snouty-card{
      background: #ffffff;
      border: 1px solid #eef2f7;
      border-radius: 18px;
      box-shadow: 0 14px 40px rgba(16,24,40,.10);
      padding: 1.25rem;
    }

    .card-head{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: .75rem;
    }

    .title{
      margin: 0;
      font-weight: 900;
      color: #111827;
      font-size: 1.3rem;
    }

    .subtitle{
      margin: .25rem 0 0;
      color: #6b7280;
      font-size: .95rem;
    }

    .toolbar{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      flex-wrap: wrap;
      margin-top: .75rem;
    }

    .search{
      display: flex;
      align-items: center;
      gap: .6rem;
      width: 100%;
      max-width: 560px;
      padding: .6rem .75rem;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .search i{
      color: #6b7280;
      font-size: 1rem;
    }

    :host ::ng-deep .valoraciones-autocomplete{
      width: 100% !important;
      flex: 1 !important;
    }

    :host ::ng-deep .valoraciones-autocomplete .p-autocomplete,
    :host ::ng-deep .valoraciones-autocomplete .p-autocomplete-input{
      width: 100% !important;
    }

    :host ::ng-deep .valoraciones-autocomplete .p-autocomplete-input{
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      padding: 0 !important;
      font-size: .95rem !important;
    }

    .icon-btn{
      width: 44px;
      height: 44px;
      border-radius: 12px !important;
    }

    .table-wrap{
      border-top: 1px solid #eef2f7;
      padding-top: .75rem;
      margin-top: .75rem;
    }

    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th{
      background: #ffffff !important;
      color: #374151 !important;
      font-weight: 900 !important;
      border: 0 !important;
      border-bottom: 1px solid #eef2f7 !important;
      padding: .95rem .9rem !important;
      text-align: left;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td{
      background: #ffffff !important;
      color: #111827 !important;
      border: 0 !important;
      border-bottom: 1px solid #f1f5f9 !important;
      padding: .9rem .9rem !important;
    }

    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover > td{
      background: #fafafa !important;
    }

    :host ::ng-deep .p-paginator{
      background: #ffffff !important;
      border: 0 !important;
      justify-content: center !important;
      padding-top: 1rem !important;
    }

    :host ::ng-deep .p-rating .p-rating-icon{
      font-size: 1.2rem;
    }

    .admin-banner{
      color: #6b7280;
      font-size: .95rem;
    }

    .section-title{
      margin: .25rem 0 1rem;
      font-weight: 900;
      text-align: center;
      color: #111827;
    }

    .form-grid{
      display: grid;
      gap: .75rem;
      max-width: 560px;
      margin: 0 auto;
    }

    .hint{
      font-size: .9rem;
      color: #6b7280;
      text-align: center;
      margin-top: .25rem;
    }

    .error-text{
      font-size: .85rem;
      color: #ef4444;
      margin-top: -0.35rem;
    }

    .textarea{
      width: 100%;
      resize: vertical;
      min-height: 110px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: .75rem .85rem;
      font-family: inherit;
      font-size: .95rem;
      outline: none;
    }

    .textarea:focus{
      border-color: #c7d2fe;
      box-shadow: 0 0 0 3px rgba(99,102,241,.15);
    }

    :host ::ng-deep .p-toast.p-toast-top-center{ top: 22px; }
    :host ::ng-deep .p-toast .p-toast-message{
      border-radius: 14px;
      box-shadow: 0 12px 28px rgba(0,0,0,0.18);
    }
  `],
})
export class SnoutyValoracionesPage implements OnInit {
  tituloLista = 'Valoraciones';
  endpointLista = `${API_URL}/perfiles-adoptante/`;

  usuarios: UsuarioCalificable[] = [];
  filteredUsuarios: UsuarioCalificable[] = [];

  searchValue: any = null;
  suggestions: UsuarioCalificable[] = [];

  displayDialog = false;
  selectedUsuario: UsuarioCalificable | null = null;

  valoracionesUsuario: Valoracion[] = [];

  valoracionForm!: FormGroup;
  submitted = false;
  savingValoracion = false;

  isAdmin = false;

  stepIndex = 0;
  steps = [{ label: 'Nueva valoración' }, { label: 'Recibidas' }];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const current = this.auth.getCurrentUser();
    const rol: UserRole = current?.rol ?? null;

    this.isAdmin = rol === 'ADMIN';

    if (rol === 'ADOPTANTE') {
      this.tituloLista = 'Valoraciones de tutores';
      this.endpointLista = `${API_URL}/perfiles-tutor/`;
    } else if (rol === 'TUTOR') {
      this.tituloLista = 'Valoraciones de adoptantes';
      this.endpointLista = `${API_URL}/perfiles-adoptante/`;
    } else {
      this.tituloLista = 'Listado (solo lectura)';
      this.endpointLista = `${API_URL}/perfiles-adoptante/`;
    }

    this.valoracionForm = this.fb.group({
      puntuacion: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comentario: ['', [Validators.maxLength(280)]],
    });

    this.cargarUsuarios();
  }

  get f() {
    return this.valoracionForm.controls;
  }

  private cargarUsuarios(): void {
    this.http.get<any>(this.endpointLista).subscribe({
      next: (resp) => {
        const results = resp?.results ?? resp;

        this.usuarios = (results as any[]).map((item) => {
          const user = item?.user || {};
          const id = Number(user?.id ?? 0);

          const nombres = String(user?.nombres ?? '').trim();
          const apellidos = String(user?.apellidos ?? '').trim();
          const email = String(user?.email ?? '').trim();

          const username = String(user?.username ?? email).trim();
          const displayName = `${nombres} ${apellidos}`.trim() + (email ? ` (${email})` : '');

          const obj: any = {
            id,
            perfilId: Number(item?.id ?? 0),
            username,
            nombres,
            apellidos,
            email,
            displayName,
            promedio_puntuacion: 0,
            total_valoraciones: 0,
          };

          obj.toString = () => displayName;
          return obj as UsuarioCalificable;
        });

        this.cargarRanking();
      },
      error: (err) => console.error(err),
    });
  }

  private cargarRanking(): void {
    this.http.get<any[]>(`${API_URL}/valoraciones/ranking/`).subscribe({
      next: (ranking) => {
        const map = new Map<number, { promedio: number; total: number }>();

        (ranking || []).forEach((r: any) => {
          const key = Number(r.usuario);
          map.set(key, {
            promedio: Number(r.promedio_puntuacion ?? 0),
            total: Number(r.total_valoraciones ?? 0),
          });
        });

        this.usuarios = this.usuarios.map((u) => {
          const stats = map.get(Number(u.id));
          const obj: any = {
            ...u,
            promedio_puntuacion: stats?.promedio ?? 0,
            total_valoraciones: stats?.total ?? 0,
          };
          obj.toString = () => u.displayName;
          return obj;
        });

        this.usuarios.sort((a, b) => (b.promedio_puntuacion || 0) - (a.promedio_puntuacion || 0));

        if (this.searchValue) this.applyFilterFromSearchValue();
        else this.filteredUsuarios = [...this.usuarios];
      },
      error: (err) => console.error(err),
    });
  }

  buscarUsuario(event: any): void {
    const q = String(event?.query ?? '').trim().toLowerCase();
    if (!q) {
      this.suggestions = [];
      this.filteredUsuarios = [...this.usuarios];
      return;
    }
    this.suggestions = this.usuarios.filter((u) => this.matchUsuario(u, q)).slice(0, 10);
    this.filteredUsuarios = this.usuarios.filter((u) => this.matchUsuario(u, q));
  }

  onSelectUsuario(ev: any): void {
    const u: UsuarioCalificable = ev?.value;
    if (!u) return;
    this.filteredUsuarios = [u];
  }

  onClearSearch(): void {
    this.searchValue = null;
    this.suggestions = [];
    this.filteredUsuarios = [...this.usuarios];
  }

  applyFilterFromSearchValue(): void {
    if (!this.searchValue) {
      this.filteredUsuarios = [...this.usuarios];
      return;
    }
    if (typeof this.searchValue === 'object') {
      this.filteredUsuarios = [this.searchValue];
      return;
    }
    const q = String(this.searchValue).trim().toLowerCase();
    this.filteredUsuarios = this.usuarios.filter((u) => this.matchUsuario(u, q));
  }

  private matchUsuario(u: UsuarioCalificable, q: string): boolean {
    return (
      (u.nombres || '').toLowerCase().includes(q) ||
      (u.apellidos || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }

  abrirDetalle(u: UsuarioCalificable): void {
    this.selectedUsuario = u;
    this.displayDialog = true;

    this.stepIndex = this.isAdmin ? 1 : 0;
    this.submitted = false;
    this.savingValoracion = false;
    this.valoracionForm.reset({ puntuacion: 0, comentario: '' });

    this.cargarValoracionesUsuario(u.id);
  }

  private cargarValoracionesUsuario(id: number): void {
    this.http.get<any>(`${API_URL}/valoraciones/?usuario=${id}`).subscribe({
      next: (resp) => {
        this.valoracionesUsuario = resp?.results ?? resp;
      },
      error: (err) => console.error(err),
    });
  }

  irA(step: number): void {
    if (this.isAdmin && step === 0) return;
    this.stepIndex = step;
  }

  guardarValoracion(): void {
    if (this.isAdmin) return;
    if (!this.selectedUsuario) return;

    this.submitted = true;
    if (this.valoracionForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Revisa el formulario',
        detail: 'La puntuación es obligatoria (mínimo 1 estrella).',
      });
      return;
    }

    const payload = {
      usuario: this.selectedUsuario.id,
      puntuacion: Number(this.valoracionForm.value.puntuacion),
      comentario: this.valoracionForm.value.comentario?.trim() || null,
    };

    this.savingValoracion = true;

    this.http.post(`${API_URL}/valoraciones/`, payload, { observe: 'response' }).subscribe({
      next: (res: HttpResponse<any>) => {
        this.savingValoracion = false;

        const actualizado = res.status === 200;

        this.messageService.add({
          severity: 'success',
          summary: actualizado ? 'Actualizado' : 'Éxito',
          detail: actualizado
            ? 'Tu valoración anterior fue actualizada correctamente.'
            : 'Valoración registrada correctamente.',
        });

        this.cargarValoracionesUsuario(this.selectedUsuario!.id);
        this.cargarRanking();

        this.submitted = false;
        this.valoracionForm.reset({ puntuacion: 0, comentario: '' });
        this.stepIndex = 1;
      },
      error: (err: HttpErrorResponse) => {
        this.savingValoracion = false;

        const msg =
          (err?.error && typeof err.error === 'object' && (err.error.detail || err.error.non_field_errors?.[0])) ||
          null;

        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: msg || 'Ocurrió un error al registrar la valoración. Intenta nuevamente.',
        });
      },
    });
  }
}
