import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

// PrimeNG 19
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';

import { AuthService, AuthUser } from '../../auth/services/auth.service';

type Rol = 'ADOPTANTE' | 'TUTOR' | 'ADMIN';

export type Mascota = {
  id: number;
  nombre?: string | null;
};

export type SolicitudAdopcion = {
  id?: number;
  mascota?: number | null;
  estado?: string | null;
  motivacion?: string | null;

  // si tu serializer lo manda
  adoptante_email?: string | null;
  tutor_email?: string | null;
};

@Component({
  selector: 'app-snouty-solicitudes-adopcion',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    AutoCompleteModule,
    StepsModule,
    ToastModule,
    SelectModule,
  ],
  templateUrl: './solicitudes.html',
  styles: [
    `
      .page-container { max-width: 1100px; margin: 0 auto; padding: 1rem 1rem 2rem; }
      .muted { opacity: 0.85; }
      .text-center { text-align: center; }
      .dialog-shell { border-radius: 16px; overflow: hidden; }
      .dialog-hero { padding: 1rem 1.25rem; color: #fff; background: linear-gradient(135deg, rgba(20,184,166,.95), rgba(59,130,246,.85)); }
      .dialog-hero h3 { margin: 0; font-weight: 800; }
      .dialog-body { padding: 1.1rem 1.25rem 1.25rem; }
      .hint { font-size: .92rem; opacity: .85; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
      @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
      .field { display:flex; flex-direction:column; gap:.35rem; }
      .field label { font-weight: 700; }
      .w-full { width: 100%; }
      .error { font-size: .82rem; color: #d32f2f; font-weight: 600; }
      .summary-card { border: 1px solid rgba(0,0,0,.08); border-radius: 12px; padding: 1rem; background: rgba(17,24,39,.03); }
      .summary-row { display:flex; justify-content:space-between; gap:1rem; padding:.35rem 0; border-bottom: 1px dashed rgba(0,0,0,.12); }
      .summary-row:last-child { border-bottom: 0; }
      .actions { display:flex; justify-content:space-between; gap:.75rem; margin-top: 1rem; }
      .actions-right { display:flex; gap:.5rem; justify-content:flex-end; flex:1; }
    `,
  ],
})
export class SnoutySolicitudesAdopcionPage implements OnInit, OnDestroy {
  // ======================
  // Data
  // ======================
  solicitudes: SolicitudAdopcion[] = [];
  mascotas: Mascota[] = [];

  mascotaBuscada: Mascota | null = null;
  mascotasSugerencias: Mascota[] = [];

  // session
  rolUsuario: Rol | null = null;
  correoUsuario = '';
  correoDisplay = '';

  // dialog
  dialogVisible = false;
  editingId: number | null = null;

  // delete
  confirmVisible = false;
  solicitudToDelete: SolicitudAdopcion | null = null;

  // steps
  activeStep = 0;
  stepsAdoptante = [
    { label: 'Mascota', icon: 'pi pi-paw' },
    { label: 'Motivación', icon: 'pi pi-comment' },
    { label: 'Confirmar', icon: 'pi pi-check-circle' },
  ];
  stepsTutor = [{ label: 'Actualizar estado', icon: 'pi pi-sync' }];

  saving = false;

  // form
  form: FormGroup;

  // endpoints
private API = 'https://snoutyweb.onrender.com/api';
private baseSolicitudes = `${this.API}/solicitudes-adopcion/`;
private baseMascotas = `${this.API}/mascotas/`;

  private subs = new Subscription();

  // select options (PrimeNG p-select usa label/value OK)
  private estadoOptionsAdoptante = [{ label: 'Pendiente', value: 'PENDIENTE' }];
  private estadoOptionsTutor = [
    { label: 'Aprobada', value: 'APROBADA' },
    { label: 'Rechazada', value: 'RECHAZADA' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private auth: AuthService,
    private msg: MessageService
  ) {
    this.form = this.fb.group({
      mascota: [null, [Validators.required]],
      estado: ['PENDIENTE', [Validators.required]],
      motivacion: [
        '',
        [Validators.required, Validators.minLength(20), Validators.maxLength(500)],
      ],
    });
  }

  // ======================
  // Getters usados por el HTML
  // ======================
  get canCreate(): boolean {
    return this.rolUsuario === 'ADOPTANTE';
  }

  get estadoOptions() {
    return this.rolUsuario === 'TUTOR' ? this.estadoOptionsTutor : this.estadoOptionsAdoptante;
  }

  get dialogTitle(): string {
    if (this.rolUsuario === 'TUTOR') return 'Actualizar estado de solicitud';
    if (this.rolUsuario === 'ADOPTANTE') return 'Nueva solicitud de adopción';
    return 'Solicitud';
  }

  get mascotaDisabled(): boolean {
    // adoptante: solo al crear; tutor/admin no
    if (this.rolUsuario === 'ADOPTANTE') return !!this.editingId;
    return true;
  }

  get estadoDisabled(): boolean {
    return this.rolUsuario !== 'TUTOR';
  }

  get motivacionDisabled(): boolean {
    // adoptante: solo al crear; tutor/admin no
    if (this.rolUsuario === 'ADOPTANTE') return !!this.editingId;
    return true;
  }

  get mascotaResumen(): string {
    if (this.mascotaBuscada?.nombre) return this.mascotaBuscada.nombre;
    const id = this.form.get('mascota')?.value;
    if (!id) return '-';
    return this.mascotas.find((m) => m.id === id)?.nombre ?? `Mascota #${id}`;
  }

  get motivacionPreview(): string {
    return (this.form.get('motivacion')?.value || '').toString();
  }

  // ======================
  // Lifecycle
  // ======================
  ngOnInit(): void {
    this.subs.add(
      this.auth.currentUser$.subscribe((u: AuthUser | null) => {
        this.rolUsuario = (u?.rol ?? null) as Rol | null;
        this.correoUsuario = u?.email ?? '';
        this.correoDisplay = this.correoUsuario;
      })
    );

    // Cargar data inicial
    this.loadMascotas();
    this.loadSolicitudes();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ======================
  // Loaders
  // ======================
  private loadSolicitudes(): void {
    this.http.get<SolicitudAdopcion[]>(this.baseSolicitudes).subscribe({
      next: (data) => (this.solicitudes = data ?? []),
      error: (err) => console.error('Error cargando solicitudes', err),
    });
  }

  private loadMascotas(): void {
    this.http.get<Mascota[]>(this.baseMascotas).subscribe({
      next: (data) => (this.mascotas = data ?? []),
      error: (err) => console.error('Error cargando mascotas', err),
    });
  }

  // ======================
  // Helpers usados por HTML
  // ======================
  nombreMascota(id: number | null | undefined): string {
    if (id == null) return '-';
    return this.mascotas.find((m) => m.id === id)?.nombre ?? `Mascota #${id}`;
  }

  canEditRow(_row: SolicitudAdopcion): boolean {
    return this.rolUsuario === 'TUTOR';
  }

  canDeleteRow(row: SolicitudAdopcion): boolean {
    const estado = (row.estado || '').toString().trim().toUpperCase();
    return this.rolUsuario === 'ADOPTANTE' && estado === 'PENDIENTE';
  }

  // ======================
  // AutoComplete
  // ======================
  filtrarMascotas(event: any): void {
    const q = (event.query || '').toLowerCase().trim();
    this.mascotasSugerencias = this.mascotas.filter((m) =>
      (m.nombre || '').toLowerCase().includes(q)
    );
  }

  onSelectMascota(event: any): void {
    const mascota = (event?.value ?? null) as Mascota | null;
    this.mascotaBuscada = mascota;
    this.form.patchValue({ mascota: mascota?.id ?? null });
    this.form.get('mascota')?.markAsDirty();
    this.form.get('mascota')?.markAsTouched();
  }

  // ======================
  // Dialog modes
  // ======================
  private setFormMode(mode: 'create_adoptante' | 'edit_tutor' | 'read_admin'): void {
    if (mode === 'create_adoptante') {
      this.form.get('mascota')?.enable();
      this.form.get('motivacion')?.enable();

      this.form.get('estado')?.disable();
      this.form.get('estado')?.setValue('PENDIENTE');
      return;
    }

    if (mode === 'edit_tutor') {
      this.form.get('mascota')?.disable();
      this.form.get('motivacion')?.disable();
      this.form.get('estado')?.enable();
      return;
    }

    // admin read
    this.form.get('mascota')?.disable();
    this.form.get('motivacion')?.disable();
    this.form.get('estado')?.disable();
  }

  // ✅ ESTE MÉTODO TE FALTABA
  openNew(): void {
    if (this.rolUsuario !== 'ADOPTANTE') return;

    this.editingId = null;
    this.mascotaBuscada = null;
    this.activeStep = 0;

    this.form.reset({
      mascota: null,
      estado: 'PENDIENTE',
      motivacion: '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.setFormMode('create_adoptante');
    this.correoDisplay = this.correoUsuario;
    this.dialogVisible = true;
  }

  edit(row: SolicitudAdopcion): void {
    if (this.rolUsuario !== 'TUTOR') return;

    this.editingId = row.id ?? null;

    this.mascotaBuscada = this.mascotas.find((m) => m.id === row.mascota) ?? null;
    this.correoDisplay = row.adoptante_email || '';

    this.form.reset({
      mascota: row.mascota ?? null,
      estado: (row.estado || 'PENDIENTE').toString().toUpperCase(),
      motivacion: row.motivacion || '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.setFormMode('edit_tutor');
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.activeStep = 0;
  }

  // ======================
  // Steps adoptante
  // ======================
  nextStep(): void {
    if (this.rolUsuario !== 'ADOPTANTE') return;

    if (this.activeStep === 0) {
      this.touch('mascota');
      if (this.form.get('mascota')?.invalid) {
        this.toastWarn('Selecciona una mascota', 'Elige una mascota para continuar.');
        return;
      }
      this.activeStep = 1;
      return;
    }

    if (this.activeStep === 1) {
      this.touch('motivacion');
      if (this.form.get('motivacion')?.invalid) {
        this.toastWarn('Revisa tu motivación', 'Mínimo 20 caracteres (máx. 500).');
        return;
      }
      this.activeStep = 2;
    }
  }

  prevStep(): void {
    if (this.rolUsuario !== 'ADOPTANTE') return;
    this.activeStep = Math.max(0, this.activeStep - 1);
  }

  // ======================
  // Validation helpers
  // ======================
  private ctrl(name: string): AbstractControl | null {
    return this.form.get(name);
  }

  private touch(name: string): void {
    const c = this.ctrl(name);
    c?.markAsTouched();
    c?.markAsDirty();
  }

  showError(name: string): boolean {
    const c = this.ctrl(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorMsg(name: string): string {
    const c = this.ctrl(name);
    if (!c || !c.errors) return 'Campo inválido';
    if (c.errors['required']) return 'Este campo es obligatorio.';
    if (c.errors['minlength']) return `Mínimo ${c.errors['minlength'].requiredLength} caracteres.`;
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres.`;
    return 'Verifica este campo.';
  }

  // ======================
  // Save
  // ======================
  save(): void {
    if (!this.rolUsuario) return;

    // ADMIN: no hace nada
    if (this.rolUsuario === 'ADMIN') {
      this.toastWarn('Solo lectura', 'Como administrador solo puedes visualizar.');
      return;
    }

    // ADOPTANTE: create
    if (this.rolUsuario === 'ADOPTANTE') {
      if (this.editingId) return;

      this.form.markAllAsTouched();
      this.touch('mascota');
      this.touch('motivacion');

      if (this.form.invalid) {
        this.toastWarn('Faltan datos', 'Completa correctamente todos los campos.');
        return;
      }

      const raw = this.form.getRawValue();
      const payload = {
        mascota: raw.mascota,
        motivacion: (raw.motivacion || '').toString().trim(),
      };

      this.saving = true;
      this.http.post(this.baseSolicitudes, payload).subscribe({
        next: () => {
          this.saving = false;
          this.dialogVisible = false;
          this.loadSolicitudes();
          this.toastSuccess('¡Solicitud enviada!', 'Quedó en estado PENDIENTE.');
        },
        error: (err) => {
          this.saving = false;
          this.toastError('No se pudo guardar', this.extractError(err));
          console.error('Error creando solicitud', err);
        },
      });
      return;
    }

    // TUTOR: update estado
    if (this.rolUsuario === 'TUTOR') {
      if (!this.editingId) return;

      this.touch('estado');
      if (this.form.get('estado')?.invalid) {
        this.toastWarn('Estado requerido', 'Selecciona un estado válido.');
        return;
      }

      const estado = (this.form.get('estado')?.value ?? '').toString().trim().toUpperCase();
      const allowed = new Set(['APROBADA', 'RECHAZADA']);
      if (!allowed.has(estado)) {
        this.toastWarn('Estado inválido', 'Selecciona Aprobada o Rechazada.');
        return;
      }

      this.saving = true;
      this.http.patch(`${this.baseSolicitudes}${this.editingId}/`, { estado }).subscribe({
        next: () => {
          this.saving = false;
          this.dialogVisible = false;
          this.loadSolicitudes();
          this.toastSuccess('¡Actualizado!', 'El estado se actualizó correctamente.');
        },
        error: (err) => {
          this.saving = false;
          this.toastError('No se pudo actualizar', this.extractError(err));
          console.error('Error actualizando estado', err);
        },
      });
    }
  }

  // ======================
  // Delete
  // ======================
  openDeleteConfirm(row: SolicitudAdopcion): void {
    if (this.rolUsuario !== 'ADOPTANTE') return;
    if (!this.canDeleteRow(row)) return;
    this.solicitudToDelete = row;
    this.confirmVisible = true;
  }

  cancelDelete(): void {
    this.confirmVisible = false;
    this.solicitudToDelete = null;
  }

  confirmDelete(): void {
    if (this.rolUsuario !== 'ADOPTANTE') return;
    if (!this.solicitudToDelete?.id) return;
    if (!this.canDeleteRow(this.solicitudToDelete)) return;

    this.http.delete(`${this.baseSolicitudes}${this.solicitudToDelete.id}/`).subscribe({
      next: () => {
        this.confirmVisible = false;
        this.solicitudToDelete = null;
        this.loadSolicitudes();
        this.toastSuccess('Eliminado', 'La solicitud se eliminó correctamente.');
      },
      error: (err) => {
        this.toastError('No se pudo eliminar', this.extractError(err));
        console.error('Error eliminando solicitud', err);
      },
    });
  }

  // ======================
  // Toast helpers
  // ======================
  private toastSuccess(summary: string, detail: string): void {
    this.msg.add({ severity: 'success', summary, detail, life: 3200 });
  }

  private toastWarn(summary: string, detail: string): void {
    this.msg.add({ severity: 'warn', summary, detail, life: 3200 });
  }

  private toastError(summary: string, detail: string): void {
    this.msg.add({ severity: 'error', summary, detail, life: 4200 });
  }

  private extractError(err: any): string {
    const data = err?.error;
    if (!data) return 'Ocurrió un error inesperado.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;

    const k = Object.keys(data)[0];
    const v = data[k];
    if (Array.isArray(v) && v.length) return v[0];
    if (typeof v === 'string') return v;

    return 'No se pudo completar la operación.';
  }
}