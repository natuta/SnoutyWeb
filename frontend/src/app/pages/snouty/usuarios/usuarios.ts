import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// PrimeNG
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import {
  Usuario,
  PerfilTutor,
  PerfilAdoptante,
  UsuarioCompleto,
} from '../snouty.models';

import { AuthService } from '../../auth/services/auth.service';

type RoleOption = { label: string; value: string };

@Component({
  selector: 'app-snouty-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    DialogModule,
    ToastModule,
    TagModule,
    SelectModule,
  ],
  providers: [MessageService],
  templateUrl: './usuarios.html',
  styles: [
    `
      .page-hero {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        padding: 1.25rem 1.25rem 1.5rem;
        margin-bottom: 1rem;
        background: radial-gradient(
            1200px 400px at 20% 0%,
            rgba(255, 255, 255, 0.18),
            rgba(255, 255, 255, 0)
          ),
          linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.18),
            rgba(59, 130, 246, 0.12)
          );
        border: 1px solid rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(10px);
      }

      .page-hero::before {
        content: '';
        position: absolute;
        inset: -2px;
        background: radial-gradient(
            700px 250px at 15% 25%,
            rgba(34, 197, 94, 0.2),
            rgba(34, 197, 94, 0)
          ),
          radial-gradient(
            700px 250px at 85% 35%,
            rgba(59, 130, 246, 0.18),
            rgba(59, 130, 246, 0)
          );
        pointer-events: none;
      }

      .page-hero > * {
        position: relative;
        z-index: 1;
      }

      .hero-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .hero-title h2 {
        margin: 0;
        font-weight: 800;
        letter-spacing: 0.2px;
      }

      .hero-sub {
        margin: 0.35rem 0 0;
        color: var(--text-color-secondary);
      }

      .glass-card {
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(10px);
        overflow: hidden;
      }

      .card-inner {
        padding: 1rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      @media (max-width: 900px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .field label {
        font-weight: 650;
      }

      .hint {
        color: var(--text-color-secondary);
        font-size: 0.85rem;
      }

      .error-text {
        color: var(--red-500);
        font-size: 0.85rem;
        margin-top: 0.1rem;
      }

      .readonly {
        opacity: 0.95;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1.1rem;
      }

      .table-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
        background: rgba(0, 0, 0, 0.03);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      .searchbox {
        width: min(420px, 100%);
      }

      .muted {
        color: var(--text-color-secondary);
      }

      .center-toast {
        text-align: center;
      }
    `,
  ],
})
export class SnoutyUsuariosPage implements OnInit {
  // ✅ Referencia a la tabla para filtrar correctamente (PrimeNG 20)
  @ViewChild('dt') table!: Table;

  usuarios: UsuarioCompleto[] = [];

  filterForm: FormGroup<{ global: FormControl<string> }>;

  formUser: FormGroup;

  dialogVisible = false;
  confirmVisible = false;

  editingId: number | null = null;
  selectedUser: UsuarioCompleto | null = null;

  usuarioToDelete: UsuarioCompleto | null = null;

  isAdmin = false;

  loading = false;
  error = '';

  submitted = false;

  roleOptions: RoleOption[] = [
    { label: 'ADMIN', value: 'ADMIN' },
    { label: 'TUTOR', value: 'TUTOR' },
    { label: 'ADOPTANTE', value: 'ADOPTANTE' },
  ];

  private API = 'http://127.0.0.1:8000/api';
  private usuariosUrl = `${this.API}/usuarios/`;
  private tutoresUrl = `${this.API}/perfiles-tutor/`;
  private adoptantesUrl = `${this.API}/perfiles-adoptante/`;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private msg: MessageService
  ) {
    this.filterForm = this.fb.group({
      global: this.fb.nonNullable.control(''),
    });

    this.formUser = this.fb.group({
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email],
      ],

      rol: [
        '',
        [Validators.required, this.roleAllowedValidator(() => this.roleOptions)],
      ],

      nombres: [
        { value: '', disabled: true },
        [Validators.required, Validators.minLength(2)],
      ],

      apellidos: [
        { value: '', disabled: true },
        [Validators.required, Validators.minLength(2)],
      ],

      telefono: [
        { value: '', disabled: true },
        [Validators.pattern(/^[0-9+\-\s]{7,20}$/)],
      ],

      foto_perfil_s3: [{ value: '', disabled: true }],

      is_active: [true, [Validators.required]],
      is_staff: [false],
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN']);
    this.loadUsuariosCompletos();

    // ✅ Filtro global confiable para PrimeNG 20
    this.filterForm.controls.global.valueChanges.subscribe((value) => {
      const v = (value ?? '').toString();
      if (this.table) {
        this.table.filterGlobal(v, 'contains');
      }
    });
  }

  // ========= Helpers =========
  get f() {
    return this.formUser.controls;
  }

  showErr(ctrlName: string): boolean {
    const c = this.formUser.get(ctrlName);
    return !!c && c.invalid && (c.touched || c.dirty || this.submitted);
  }

  private toastSuccess(summary: string, detail?: string) {
    this.msg.add({
      severity: 'success',
      summary,
      detail,
      life: 2600,
      styleClass: 'center-toast',
    });
  }

  private toastError(summary: string, detail?: string) {
    this.msg.add({
      severity: 'error',
      summary,
      detail,
      life: 3600,
      styleClass: 'center-toast',
    });
  }

  private roleAllowedValidator(getOptions: () => RoleOption[]) {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = String(control.value || '').trim().toUpperCase();
      if (!v) return null;
      const allowed = new Set(getOptions().map((x) => x.value));
      return allowed.has(v) ? null : { roleNotAllowed: true };
    };
  }

  roleSeverity(
    rol: string | null | undefined
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const r = String(rol || '').toUpperCase();
    if (r === 'ADMIN') return 'danger';
    if (r === 'TUTOR') return 'info';
    if (r === 'ADOPTANTE') return 'success';
    return 'secondary';
  }

  statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  // ========= Data =========
  loadUsuariosCompletos() {
    this.error = '';
    this.loading = true;

    forkJoin({
      usuarios: this.http
        .get<Usuario[]>(this.usuariosUrl)
        .pipe(catchError(() => of([] as Usuario[]))),

      tutores: this.http
        .get<PerfilTutor[]>(this.tutoresUrl)
        .pipe(catchError(() => of([] as PerfilTutor[]))),

      adoptantes: this.http
        .get<PerfilAdoptante[]>(this.adoptantesUrl)
        .pipe(catchError(() => of([] as PerfilAdoptante[]))),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ usuarios, tutores, adoptantes }) => {
          const tutorByUser = new Map<number, PerfilTutor>();
          tutores.forEach((t) => tutorByUser.set(t.user, t));

          const adoptByUser = new Map<number, PerfilAdoptante>();
          adoptantes.forEach((a) => adoptByUser.set(a.user, a));

          this.usuarios = (usuarios || []).map((u) => ({
            ...u,
            perfilTutor: tutorByUser.get(u.id) ?? null,
            perfilAdoptante: adoptByUser.get(u.id) ?? null,
            perfilAdmin: null,
          }));
        },
        error: (err) => {
          console.error(err);
          this.error = 'Error cargando usuarios/perfiles.';
          this.toastError(
            'No se pudo cargar',
            'Ocurrió un error al traer usuarios y perfiles.'
          );
        },
      });
  }

  // ========= UI Actions =========
  edit(row: UsuarioCompleto) {
    if (!this.isAdmin) {
      this.toastError('Acceso denegado', 'Solo ADMIN puede editar usuarios.');
      return;
    }

    this.submitted = false;
    this.error = '';
    this.selectedUser = row;
    this.editingId = row.id;

    this.formUser.patchValue(
      {
        email: row.email ?? '',
        rol: String(row.rol ?? '').toUpperCase(),
        nombres: row.nombres ?? '',
        apellidos: row.apellidos ?? '',
        telefono: row.telefono ?? '',
        foto_perfil_s3: row.foto_perfil_s3 ?? '',
        is_active: !!row.is_active,
        is_staff: !!row.is_staff,
      },
      { emitEvent: false }
    );

    this.formUser.markAsPristine();
    this.formUser.markAsUntouched();

    this.dialogVisible = true;
  }

  closeDialog() {
    this.dialogVisible = false;
    this.editingId = null;
    this.selectedUser = null;
    this.submitted = false;
    this.formUser.reset();
  }

  save() {
    if (!this.isAdmin) return;
    if (!this.editingId) return;

    this.submitted = true;
    this.error = '';

    if (this.formUser.invalid) {
      this.formUser.markAllAsTouched();
      this.toastError('Revisa el formulario', 'Hay campos inválidos o faltantes.');
      return;
    }

    this.loading = true;

    const payload = {
      rol: String(this.formUser.get('rol')?.value || '')
        .trim()
        .toUpperCase(),
      is_active: !!this.formUser.get('is_active')?.value,
      is_staff: !!this.formUser.get('is_staff')?.value,
    };

    this.http
      .patch(`${this.usuariosUrl}${this.editingId}/`, payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.closeDialog();
          this.loadUsuariosCompletos();
          this.toastSuccess('Guardado con éxito', 'El usuario fue actualizado correctamente.');
        },
        error: (err) => {
          console.error('Error actualizando usuario', err?.error || err);
          const msg = err?.error?.detail || 'No se pudo actualizar el usuario.';
          this.error = msg;
          this.toastError('No se pudo guardar', msg);
        },
      });
  }

  openDeleteConfirm(row: UsuarioCompleto) {
    if (!this.isAdmin) {
      this.toastError('Acceso denegado', 'Solo ADMIN puede eliminar usuarios.');
      return;
    }
    this.usuarioToDelete = row;
    this.confirmVisible = true;
  }

  cancelDelete() {
    this.confirmVisible = false;
    this.usuarioToDelete = null;
  }

  confirmDelete() {
    if (!this.isAdmin) return;
    if (!this.usuarioToDelete?.id) return;

    this.error = '';
    this.loading = true;

    this.http
      .delete(`${this.usuariosUrl}${this.usuarioToDelete.id}/`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.confirmVisible = false;
          this.usuarioToDelete = null;
          this.loadUsuariosCompletos();
          this.toastSuccess('Eliminado', 'El usuario fue eliminado correctamente.');
        },
        error: (err) => {
          console.error('Error eliminando usuario', err?.error || err);
          const msg = err?.error?.detail || 'No se pudo eliminar el usuario.';
          this.error = msg;
          this.toastError('No se pudo eliminar', msg);
        },
      });
  }
  clearSearch(): void {
  // Limpia el input
  this.filterForm.controls.global.setValue('');

  // Limpia el filtro de la tabla PrimeNG
  if (this.table) {
    this.table.clear();
  }
}

}
