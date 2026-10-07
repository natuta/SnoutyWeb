import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { Mascota, Especie, Raza, EdadUnidad, SexoMascota, EstadoMascota } from '../snouty.models';
import { AuthService, AuthUser, UserRole } from '../../auth/services/auth.service';

type StepItem = { label: string };
type TutorOption = { id: number; label: string };

@Component({
  selector: 'app-snouty-mascotas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    StepsModule,
    ToastModule,
    MessageModule,
    AutoCompleteModule,
  ],
  providers: [MessageService],
  templateUrl: './mascotas.html',
})
export class SnoutyMascotasPage implements OnInit {
  mascotas: Mascota[] = [];
  especies: Especie[] = [];
  razas: Raza[] = [];
  razasFiltradasPorEspecie: Raza[] = [];

  // TUTORES
  tutores: TutorOption[] = [];
  tutoresFiltrados: TutorOption[] = [];
  tutorSeleccionado: TutorOption | null = null;

  form: FormGroup;

  dialogVisible = false;
  editingId: number | null = null;

  // ELIMINAR
  confirmVisible = false;
  mascotaToDelete: Mascota | null = null;
  deleteError = '';

  saving = false;

  stepItems: StepItem[] = [
    { label: 'Datos básicos' },
    { label: 'Características' },
    { label: 'Ubicación' },
    { label: 'Confirmar' },
  ];
  activeStepIndex = 0;

private baseMascotas = 'https://snoutyweb.onrender.com/api/mascotas/';
private baseEspecies = 'https://snoutyweb.onrender.com/api/especies/';
private baseRazas = 'https://snoutyweb.onrender.com/api/razas/';
private basePerfilesTutor = 'https://snoutyweb.onrender.com/api/perfiles-tutor/';

  sexoOptions: { label: string; value: SexoMascota }[] = [
    { label: 'Macho', value: 'M' as SexoMascota },
    { label: 'Hembra', value: 'F' as SexoMascota },
  ];

  estadoOptions: { label: string; value: EstadoMascota }[] = [
    { label: 'Disponible', value: 'DISPONIBLE' as EstadoMascota },
    { label: 'Reservado', value: 'RESERVADO' as EstadoMascota },
    { label: 'Inactivo', value: 'INACTIVO' as EstadoMascota },
  ];

  edadUnidadOptions: { label: string; value: EdadUnidad }[] = [
    { label: 'Meses', value: 'MESES' as EdadUnidad },
    { label: 'Años', value: 'ANIOS' as EdadUnidad },
  ];

  currentUser: AuthUser | null = null;
  rolUsuario: UserRole = null;

  get isAdminUser(): boolean {
    return this.rolUsuario === 'ADMIN';
  }

  get canCreate(): boolean {
    return this.isAdminUser;
  }

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group(
      {
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        sexo: ['M', Validators.required],
        estado: ['DISPONIBLE', Validators.required],
        fecha_registro: [this.getTodayLocalISO(), Validators.required],

        edad_valor: [null, [Validators.min(0)]],
        edad_unidad: ['MESES' as EdadUnidad],

        especie_id: [null, Validators.required],
        raza_id: [null],

        // requerido en create
        perfil_tutor_assign_id: [null, Validators.required],

        ubicacion: ['', [Validators.maxLength(180)]],
        color: ['', [Validators.maxLength(50)]],
        tamano_cm: [null, [Validators.min(0), Validators.max(300)]],
        descripcion: ['', [Validators.maxLength(500)]],
      },
      { validators: [this.edadConsistenteValidator()] }
    );

    this.form.get('especie_id')?.valueChanges.subscribe((id) => {
      this.filtrarRazasPorEspecie(id);

      const razaId = this.form.get('raza_id')?.value;
      if (razaId) {
        const r = this.razas.find((x) => x.id === razaId);
        if (!r || r.especie_id !== id) {
          this.form.patchValue({ raza_id: null }, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.rolUsuario = this.currentUser?.rol || null;

    this.loadEspecies();
    this.loadRazas();
    this.loadMascotas();

    if (this.isAdminUser) this.loadTutores();
  }

  // ================= CARGA =================
  loadMascotas(): void {
    this.http.get<Mascota[]>(this.baseMascotas).subscribe({
      next: (data) => (this.mascotas = data || []),
      error: (err) => console.error('Error cargando mascotas', err),
    });
  }

  loadEspecies(): void {
    this.http.get<Especie[]>(this.baseEspecies).subscribe({
      next: (data) => (this.especies = data || []),
      error: (err) => console.error('Error cargando especies', err),
    });
  }

  loadRazas(): void {
    this.http.get<Raza[]>(this.baseRazas).subscribe({
      next: (data) => {
        this.razas = data || [];
        this.razasFiltradasPorEspecie = [...this.razas];
      },
      error: (err) => console.error('Error cargando razas', err),
    });
  }

  loadTutores(): void {
    this.http.get<any[]>(this.basePerfilesTutor).subscribe({
      next: (data) => {
        const lista: TutorOption[] = (data || []).map((p: any) => {
          const nombres = p?.user?.perfil_usuario?.nombres || '';
          const apellidos = p?.user?.perfil_usuario?.apellidos || '';
          const email = p?.user?.email || '';
          const label = `${nombres} ${apellidos}`.trim() || email || `Tutor ${p?.id}`;
          return { id: Number(p.id), label };
        });

        this.tutores = lista;
        this.tutoresFiltrados = [...lista];
      },
      error: (err) => console.error('Error cargando tutores', err),
    });
  }

  filtrarRazasPorEspecie(especieId: number | null): void {
    if (!especieId) this.razasFiltradasPorEspecie = [...this.razas];
    else this.razasFiltradasPorEspecie = this.razas.filter((r) => r.especie_id === especieId);
  }

  // ================= AUTOCOMPLETE TUTOR (PrimeNG 19) =================
  onTutorComplete(event: any): void {
    const q = (event?.query ?? '').toString().trim().toLowerCase();
    if (!q) {
      this.tutoresFiltrados = [...this.tutores];
      return;
    }
    this.tutoresFiltrados = this.tutores.filter((t) => (t.label || '').toLowerCase().includes(q));
  }

  // PrimeNG 19: onSelect devuelve evento y el objeto está en event.value
  onTutorSelect(event: any): void {
    const t = (event?.value ?? null) as TutorOption | null;
    this.tutorSeleccionado = t;
    this.form.patchValue({ perfil_tutor_assign_id: t?.id ?? null });
  }

  clearTutor(): void {
    this.tutorSeleccionado = null;
    this.form.patchValue({ perfil_tutor_assign_id: null });
  }

  getTutorSeleccionadoLabel(): string {
    const id = this.form.get('perfil_tutor_assign_id')?.value;
    if (!id) return '-';
    return this.tutores.find((x) => x.id === Number(id))?.label || '-';
  }

  // ================= HELPERS =================
  nombreEspecie(id: number | null | undefined): string {
    if (!id) return '';
    return this.especies.find((x) => x.id === id)?.nombre || '';
  }

  nombreRaza(id: number | null | undefined): string {
    if (!id) return '';
    return this.razas.find((x) => x.id === id)?.nombre || '';
  }

  tutorLabel(m: Mascota): string {
    const anyM: any = m;
    const n = `${anyM.tutor_nombres || ''} ${anyM.tutor_apellidos || ''}`.trim();
    return n || anyM.tutor_email || '-';
  }

  edadLabel(m: Mascota): string {
    if (m.edad_meses == null) return '-';
    if (m.edad_meses >= 12) return `${Math.round(m.edad_meses / 12)} año(s)`;
    return `${m.edad_meses} mes(es)`;
  }

  edadUIValue(): string {
    const raw = this.form.getRawValue();
    const v = raw.edad_valor;
    const u = raw.edad_unidad;
    if (v == null || v === '') return '-';
    return `${v} ${u === 'ANIOS' ? 'año(s)' : 'mes(es)'}`;
  }

  private getTodayLocalISO(): string {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - tzOffsetMs);
    return local.toISOString().slice(0, 10);
  }

  // ================= PERMISOS =================
  canEdit(_row: Mascota): boolean {
    return this.isAdminUser;
  }
  canDelete(_row: Mascota): boolean {
    return this.isAdminUser;
  }

  // ================= STEPS =================
  goStep(i: number): void {
    this.activeStepIndex = i;
  }
  prevStep(): void {
    if (this.activeStepIndex > 0) this.activeStepIndex--;
  }
  nextStep(): void {
    if (this.activeStepIndex < this.stepItems.length - 1) this.activeStepIndex++;
  }

  // ================= CRUD =================
  openNew(): void {
    if (!this.canCreate) return;

    this.editingId = null;
    this.activeStepIndex = 0;
    this.saving = false;

    this.tutorSeleccionado = null;
    this.tutoresFiltrados = [...this.tutores];

    this.form.reset({
      nombre: '',
      sexo: 'M',
      estado: 'DISPONIBLE',
      fecha_registro: this.getTodayLocalISO(),
      edad_valor: null,
      edad_unidad: 'MESES',
      especie_id: null,
      raza_id: null,
      perfil_tutor_assign_id: null,
      ubicacion: '',
      color: '',
      tamano_cm: null,
      descripcion: '',
    });

    this.dialogVisible = true;
  }

  edit(row: Mascota): void {
    if (!this.canEdit(row)) return;

    this.editingId = row.id ?? null;
    this.activeStepIndex = 0;
    this.saving = false;

    const anyRow: any = row;

    let edad_valor: number | null = null;
    let edad_unidad: EdadUnidad = 'MESES';
    if (row.edad_meses != null) {
      if (row.edad_meses >= 12) {
        edad_unidad = 'ANIOS';
        edad_valor = Math.round(row.edad_meses / 12);
      } else {
        edad_unidad = 'MESES';
        edad_valor = row.edad_meses;
      }
    }

    const tutorId = anyRow.perfil_tutor_id ?? anyRow.perfil_tutor_assign_id ?? null;

    this.form.patchValue({
      nombre: row.nombre,
      sexo: row.sexo,
      estado: row.estado,
      fecha_registro: row.fecha_registro,
      edad_valor,
      edad_unidad,
      especie_id: anyRow.especie_id ?? null,
      raza_id: anyRow.raza_id ?? null,
      perfil_tutor_assign_id: tutorId,
      ubicacion: row.ubicacion || '',
      color: row.color || '',
      tamano_cm: row.tamano_cm ?? null,
      descripcion: row.descripcion || '',
    });

    this.tutorSeleccionado = tutorId
      ? this.tutores.find((t) => t.id === Number(tutorId)) || null
      : null;

    this.dialogVisible = true;
  }

  closeDialog(): void {
    if (this.saving) return;
    this.dialogVisible = false;
  }

  save(): void {
    if (!this.isAdminUser) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toastWarn('Revisa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();

    let edad_meses: number | null = null;
    if (raw.edad_valor != null && raw.edad_valor !== '') {
      const v = Number(raw.edad_valor);
      edad_meses = raw.edad_unidad === 'ANIOS' ? Math.round(v * 12) : Math.round(v);
    }

    const payload: any = {
      nombre: raw.nombre,
      sexo: raw.sexo,
      estado: raw.estado,
      fecha_registro: raw.fecha_registro,
      especie_id: raw.especie_id,
      raza_id: raw.raza_id,
      edad_meses,
      perfil_tutor_assign_id: raw.perfil_tutor_assign_id,
      ubicacion: raw.ubicacion?.trim() ? raw.ubicacion.trim() : null,
      color: raw.color?.trim() ? raw.color.trim() : null,
      tamano_cm: raw.tamano_cm != null && raw.tamano_cm !== '' ? Number(raw.tamano_cm) : null,
      descripcion: raw.descripcion?.trim() ? raw.descripcion.trim() : null,
    };

    this.saving = true;

    if (this.editingId) {
      this.http.patch(`${this.baseMascotas}${this.editingId}/`, payload).subscribe({
        next: () => {
          this.dialogVisible = false;
          this.loadMascotas();
          this.toastSuccess('Actualizada', 'Cambios guardados.');
        },
        error: (err) => {
          console.error(err);
          this.toastError('Error', 'No se pudo actualizar.');
        },
        complete: () => (this.saving = false),
      });
    } else {
      this.http.post(this.baseMascotas, payload).subscribe({
        next: () => {
          this.dialogVisible = false;
          this.loadMascotas();
          this.toastSuccess('Registrada', 'Mascota guardada.');
        },
        error: (err) => {
          console.error(err);
          this.toastError('Error', 'No se pudo guardar.');
        },
        complete: () => (this.saving = false),
      });
    }
  }

  // ================= ELIMINAR =================
  openDeleteConfirm(row: Mascota): void {
    if (!this.canDelete(row)) return;
    if (!row?.id) {
      this.toastError('Error', 'No se encontró el ID para eliminar.');
      return;
    }
    this.mascotaToDelete = row;
    this.deleteError = '';
    this.confirmVisible = true;
  }

  cancelDelete(): void {
    if (this.saving) return;
    this.confirmVisible = false;
    this.mascotaToDelete = null;
    this.deleteError = '';
  }

  confirmDelete(): void {
    const id = this.mascotaToDelete?.id;
    if (!id) return;

    this.saving = true;
    this.http.delete(`${this.baseMascotas}${id}/`).subscribe({
      next: () => {
        const nombre = this.mascotaToDelete?.nombre || 'Mascota';
        this.confirmVisible = false;
        this.mascotaToDelete = null;
        this.deleteError = '';
        this.loadMascotas();
        this.toastSuccess('Eliminada', `"${nombre}" fue eliminada.`);
      },
      error: (err) => {
        console.error(err);
        this.deleteError = 'No se pudo eliminar. Verifica permisos / backend.';
        this.toastError('Error', this.deleteError);
      },
      complete: () => (this.saving = false),
    });
  }

  // ================= VALIDACIÓN =================
  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  errorText(name: string): string {
    const c = this.form.get(name);
    if (!c) return '';
    if (c.errors?.['required']) return 'Campo obligatorio.';
    return 'Campo inválido.';
  }

  private edadConsistenteValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const edadValor = group.get('edad_valor')?.value;
      const edadUnidad = group.get('edad_unidad')?.value as EdadUnidad | null;
      if (edadValor == null || edadValor === '') return null;
      const v = Number(edadValor);
      if (Number.isNaN(v) || v < 0 || !edadUnidad) return { edadInconsistente: true };
      return null;
    };
  }

  private toastSuccess(summary: string, detail: string): void {
    this.messageService.add({ severity: 'success', summary, detail, life: 3000 });
  }
  private toastWarn(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Atención', detail, life: 3500 });
  }
  private toastError(summary: string, detail: string): void {
    this.messageService.add({ severity: 'error', summary, detail, life: 4500 });
  }
}