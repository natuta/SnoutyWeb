
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
  Validators
} from '@angular/forms';

import { finalize } from 'rxjs';

// ============================================================
// PRIMENG
// ============================================================

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';

// ============================================================
// MODELOS
// ============================================================

import {
  Mascota,
  Especie,
  Raza,
  EdadUnidad,
  SexoMascota,
  EstadoMascota
} from '../snouty.models';

import {
  AuthService,
  AuthUser,
  UserRole
} from '../../auth/services/auth.service';

// ============================================================
// TIPOS AUXILIARES
// ============================================================

type StepItem = {
  label: string;
};

type TutorOption = {
  id: number;
  label: string;
};

// ============================================================
// COMPONENTE
// ============================================================

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
    AutoCompleteModule
  ],

  providers: [MessageService],

  templateUrl: './mascotas.html'
})
export class SnoutyMascotasPage implements OnInit {

  // ==========================================================
  // LISTAS
  // ==========================================================

  mascotas: Mascota[] = [];
  especies: Especie[] = [];
  razas: Raza[] = [];
  razasFiltradasPorEspecie: Raza[] = [];

  // ==========================================================
  // TUTORES
  // ==========================================================

  tutores: TutorOption[] = [];
  tutoresFiltrados: TutorOption[] = [];
  tutorSeleccionado: TutorOption | null = null;

  // ==========================================================
  // FORMULARIO
  // ==========================================================

  form: FormGroup;

  dialogVisible = false;

  // ID de la mascota seleccionada para editar
  editingId: number | null = null;

  // ==========================================================
  // ELIMINACIÓN
  // ==========================================================

  confirmVisible = false;
  mascotaToDelete: Mascota | null = null;
  deleteError = '';

  // ==========================================================
  // ESTADO
  // ==========================================================

  saving = false;

  // ==========================================================
  // PASOS
  // ==========================================================

  stepItems: StepItem[] = [
    { label: 'Datos básicos' },
    { label: 'Características' },
    { label: 'Ubicación' },
    { label: 'Confirmar' }
  ];

  activeStepIndex = 0;

  // ==========================================================
  // ENDPOINTS DJANGO - RENDER
  // ==========================================================

  private readonly baseMascotas =
    'https://snoutyweb.onrender.com/api/mascotas/';

  private readonly baseEspecies =
    'https://snoutyweb.onrender.com/api/especies/';

  private readonly baseRazas =
    'https://snoutyweb.onrender.com/api/razas/';

  private readonly basePerfilesTutor =
    'https://snoutyweb.onrender.com/api/perfiles-tutor/';

  // ==========================================================
  // OPCIONES
  // ==========================================================

  sexoOptions: {
    label: string;
    value: SexoMascota;
  }[] = [
    { label: 'Macho', value: 'M' as SexoMascota },
    { label: 'Hembra', value: 'F' as SexoMascota }
  ];

  estadoOptions: {
    label: string;
    value: EstadoMascota;
  }[] = [
    {
      label: 'Disponible',
      value: 'DISPONIBLE' as EstadoMascota
    },
    {
      label: 'Reservado',
      value: 'RESERVADO' as EstadoMascota
    },
    {
      label: 'Inactivo',
      value: 'INACTIVO' as EstadoMascota
    }
  ];

  edadUnidadOptions: {
    label: string;
    value: EdadUnidad;
  }[] = [
    {
      label: 'Meses',
      value: 'MESES' as EdadUnidad
    },
    {
      label: 'Años',
      value: 'ANIOS' as EdadUnidad
    }
  ];

  // ==========================================================
  // AUTENTICACIÓN Y PERMISOS
  // ==========================================================

  currentUser: AuthUser | null = null;
  rolUsuario: UserRole = null;

  get isAdminUser(): boolean {
    return this.rolUsuario === 'ADMIN';
  }

  get canCreate(): boolean {
    return this.isAdminUser;
  }

  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) {

    this.form = this.fb.group(
      {
        nombre: [
          '',
          [
            Validators.required,
            Validators.maxLength(100)
          ]
        ],

        sexo: [
          'M',
          Validators.required
        ],

        estado: [
          'DISPONIBLE',
          Validators.required
        ],

        fecha_registro: [
          this.getTodayLocalISO(),
          Validators.required
        ],

        edad_valor: [
          null,
          [Validators.min(0)]
        ],

        edad_unidad: [
          'MESES' as EdadUnidad
        ],

        especie_id: [
          null,
          Validators.required
        ],

        raza_id: [null],

        perfil_tutor_assign_id: [
          null,
          Validators.required
        ],

        ubicacion: [
          '',
          [Validators.maxLength(180)]
        ],

        color: [
          '',
          [Validators.maxLength(50)]
        ],

        tamano_cm: [
          null,
          [
            Validators.min(0),
            Validators.max(300)
          ]
        ],

        descripcion: [
          '',
          [Validators.maxLength(500)]
        ]
      },
      {
        validators: [
          this.edadConsistenteValidator()
        ]
      }
    );

    // Actualizar las razas al cambiar la especie
    this.form.get('especie_id')?.valueChanges.subscribe(
      (id: number | null) => {

        this.filtrarRazasPorEspecie(id);

        const razaId = this.form.get('raza_id')?.value;

        if (razaId != null) {

          const raza = this.razas.find(
            r => r.id === Number(razaId)
          );

          if (
            !raza ||
            raza.especie_id !== Number(id)
          ) {
            this.form.patchValue(
              { raza_id: null },
              { emitEvent: false }
            );
          }
        }
      }
    );
  }

  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  ngOnInit(): void {

    this.currentUser =
      this.authService.getCurrentUser();

    this.rolUsuario =
      this.currentUser?.rol || null;

    this.loadEspecies();
    this.loadRazas();
    this.loadMascotas();

    if (this.isAdminUser) {
      this.loadTutores();
    }
  }

  // ==========================================================
  // CARGAR MASCOTAS
  // ==========================================================

  loadMascotas(): void {

    this.http.get<Mascota[]>(this.baseMascotas).subscribe({

      next: (data: Mascota[]) => {

        this.mascotas = data || [];

        console.log(
          'Mascotas cargadas:',
          this.mascotas
        );

      },

      error: (err) => {

        console.error(
          'Error cargando mascotas:',
          err
        );

        this.toastError(
          'Error',
          'No se pudo cargar la lista de mascotas.'
        );
      }
    });
  }

  // ==========================================================
  // CARGAR ESPECIES
  // ==========================================================

  loadEspecies(): void {

    this.http.get<Especie[]>(this.baseEspecies).subscribe({

      next: (data: Especie[]) => {
        this.especies = data || [];
      },

      error: (err) => {
        console.error('Error cargando especies:', err);
      }
    });
  }

  // ==========================================================
  // CARGAR RAZAS
  // ==========================================================

  loadRazas(): void {

    this.http.get<Raza[]>(this.baseRazas).subscribe({

      next: (data: Raza[]) => {

        this.razas = data || [];

        this.razasFiltradasPorEspecie = [
          ...this.razas
        ];

        const especieId =
          this.form.get('especie_id')?.value ?? null;

        this.filtrarRazasPorEspecie(especieId);
      },

      error: (err) => {
        console.error('Error cargando razas:', err);
      }
    });
  }

  // ==========================================================
  // CARGAR TUTORES
  // ==========================================================

  loadTutores(): void {

    this.http.get<any[]>(this.basePerfilesTutor).subscribe({

      next: (data: any[]) => {

        const lista: TutorOption[] = (data || []).map(
          (p: any) => {

            const nombres =
              p?.user?.perfil_usuario?.nombres || '';

            const apellidos =
              p?.user?.perfil_usuario?.apellidos || '';

            const email =
              p?.user?.email || '';

            const label =
              `${nombres} ${apellidos}`.trim() ||
              email ||
              `Tutor ${p?.id}`;

            return {
              id: Number(p.id),
              label: label
            };
          }
        );

        this.tutores = lista;
        this.tutoresFiltrados = [...lista];
      },

      error: (err) => {
        console.error('Error cargando tutores:', err);
      }
    });
  }

  // ==========================================================
  // FILTRAR RAZAS POR ESPECIE
  // ==========================================================

  filtrarRazasPorEspecie(
    especieId: number | null
  ): void {

    if (especieId == null) {
      this.razasFiltradasPorEspecie = [...this.razas];
      return;
    }

    this.razasFiltradasPorEspecie = this.razas.filter(
      r => r.especie_id === Number(especieId)
    );
  }

  // ==========================================================
  // AUTOCOMPLETE DE TUTORES
  // ==========================================================

  onTutorComplete(event: any): void {

    const query = String(
      event?.query ?? ''
    ).trim().toLowerCase();

    if (!query) {
      this.tutoresFiltrados = [...this.tutores];
      return;
    }

    this.tutoresFiltrados = this.tutores.filter(
      tutor =>
        tutor.label.toLowerCase().includes(query)
    );
  }

  onTutorSelect(event: any): void {

    const tutor: TutorOption | null =
      event?.value ?? null;

    this.tutorSeleccionado = tutor;

    this.form.patchValue({
      perfil_tutor_assign_id: tutor?.id ?? null
    });
  }

  clearTutor(): void {

    this.tutorSeleccionado = null;

    this.form.patchValue({
      perfil_tutor_assign_id: null
    });
  }

  getTutorSeleccionadoLabel(): string {

    const id =
      this.form.get('perfil_tutor_assign_id')?.value;

    if (id == null) {
      return '-';
    }

    return this.tutores.find(
      tutor => tutor.id === Number(id)
    )?.label || '-';
  }

  // ==========================================================
  // NOMBRE DE ESPECIE
  // ==========================================================

  nombreEspecie(
    id: number | null | undefined
  ): string {

    if (id == null) {
      return '';
    }

    return this.especies.find(
      especie => especie.id === Number(id)
    )?.nombre || '';
  }

  // ==========================================================
  // NOMBRE DE RAZA
  // ==========================================================

  nombreRaza(
    id: number | null | undefined
  ): string {

    if (id == null) {
      return '';
    }

    return this.razas.find(
      raza => raza.id === Number(id)
    )?.nombre || '';
  }

  // ==========================================================
  // NOMBRE DEL TUTOR
  // ==========================================================

  tutorLabel(m: Mascota): string {

    const mascota: any = m;

    const nombre =
      `${mascota.tutor_nombres || ''} ${mascota.tutor_apellidos || ''}`.trim();

    return nombre || mascota.tutor_email || '-';
  }

  // ==========================================================
  // MOSTRAR EDAD
  // ==========================================================

  edadLabel(m: Mascota): string {

    if (m.edad_meses == null) {
      return '-';
    }

    if (m.edad_meses >= 12) {
      return `${Math.round(m.edad_meses / 12)} año(s)`;
    }

    return `${m.edad_meses} mes(es)`;
  }

  edadUIValue(): string {

    const raw = this.form.getRawValue();

    const valor = raw.edad_valor;
    const unidad = raw.edad_unidad;

    if (valor == null || valor === '') {
      return '-';
    }

    return `${valor} ${
      unidad === 'ANIOS' ? 'año(s)' : 'mes(es)'
    }`;
  }

  // ==========================================================
  // FECHA LOCAL
  // ==========================================================

  private getTodayLocalISO(): string {

    const now = new Date();

    const tzOffsetMs =
      now.getTimezoneOffset() * 60000;

    const local = new Date(
      now.getTime() - tzOffsetMs
    );

    return local.toISOString().slice(0, 10);
  }

  // ==========================================================
  // PERMISOS
  // ==========================================================

  canEdit(_row: Mascota): boolean {
    return this.isAdminUser;
  }

  canDelete(_row: Mascota): boolean {
    return this.isAdminUser;
  }

  // ==========================================================
  // NAVEGACIÓN DEL FORMULARIO
  // ==========================================================

  goStep(index: number): void {
    this.activeStepIndex = index;
  }

  prevStep(): void {

    if (this.activeStepIndex > 0) {
      this.activeStepIndex--;
    }
  }

  nextStep(): void {

    if (
      this.activeStepIndex <
      this.stepItems.length - 1
    ) {
      this.activeStepIndex++;
    }
  }

  // ==========================================================
  // REGISTRAR NUEVA MASCOTA
  // ==========================================================

  openNew(): void {

    if (!this.canCreate) {
      return;
    }

    // Nueva mascota: todavía no existe ID
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
      descripcion: ''
    });

    this.dialogVisible = true;
  }

  // ==========================================================
  // EDITAR MASCOTA
  // ==========================================================

  edit(row: Mascota): void {

    if (!this.canEdit(row)) {
      return;
    }

    // Validar identificador
    if (
      row.id == null ||
      !Number.isInteger(Number(row.id)) ||
      Number(row.id) <= 0
    ) {
      this.toastError(
        'Error',
        'La mascota no tiene un ID válido.'
      );
      return;
    }

    // Guardar ID real
    this.editingId = Number(row.id);

    this.activeStepIndex = 0;
    this.saving = false;

    const mascota: any = row;

    let edad_valor: number | null = null;
    let edad_unidad: EdadUnidad = 'MESES' as EdadUnidad;

    if (row.edad_meses != null) {

      if (row.edad_meses >= 12) {

        edad_unidad = 'ANIOS' as EdadUnidad;

        edad_valor = Math.round(
          row.edad_meses / 12
        );

      } else {

        edad_unidad = 'MESES' as EdadUnidad;
        edad_valor = row.edad_meses;
      }
    }

    const tutorId =
      mascota.perfil_tutor_id ??
      mascota.perfil_tutor_assign_id ??
      null;

    this.form.patchValue({
      nombre: row.nombre,
      sexo: row.sexo,
      estado: row.estado,
      fecha_registro: row.fecha_registro,
      edad_valor: edad_valor,
      edad_unidad: edad_unidad,
      especie_id: mascota.especie_id ?? null,
      raza_id: mascota.raza_id ?? null,
      perfil_tutor_assign_id: tutorId,
      ubicacion: row.ubicacion || '',
      color: row.color || '',
      tamano_cm: row.tamano_cm ?? null,
      descripcion: row.descripcion || ''
    });

    this.tutorSeleccionado =
      tutorId != null
        ? this.tutores.find(
            tutor => tutor.id === Number(tutorId)
          ) || null
        : null;

    this.dialogVisible = true;
  }

  // ==========================================================
  // CERRAR FORMULARIO
  // ==========================================================

  closeDialog(): void {

    if (this.saving) {
      return;
    }

    this.dialogVisible = false;
  }

  // ==========================================================
  // GUARDAR / ACTUALIZAR MASCOTA
  // ==========================================================

  save(): void {

    if (!this.isAdminUser || this.saving) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toastWarn('Revisa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();

    let edad_meses: number | null = null;

    if (
      raw.edad_valor != null &&
      raw.edad_valor !== ''
    ) {

      const valor = Number(raw.edad_valor);

      edad_meses =
        raw.edad_unidad === 'ANIOS'
          ? Math.round(valor * 12)
          : Math.round(valor);
    }

    const payload: any = {
      nombre: raw.nombre,
      sexo: raw.sexo,
      estado: raw.estado,
      fecha_registro: raw.fecha_registro,
      especie_id: raw.especie_id,
      raza_id: raw.raza_id,
      edad_meses: edad_meses,
      perfil_tutor_assign_id:
        raw.perfil_tutor_assign_id,

      ubicacion: raw.ubicacion?.trim()
        ? raw.ubicacion.trim()
        : null,

      color: raw.color?.trim()
        ? raw.color.trim()
        : null,

      tamano_cm:
        raw.tamano_cm != null &&
        raw.tamano_cm !== ''
          ? Number(raw.tamano_cm)
          : null,

      descripcion: raw.descripcion?.trim()
        ? raw.descripcion.trim()
        : null
    };

    this.saving = true;

    // ========================================================
    // EDITAR REGISTRO EXISTENTE
    // ========================================================

    if (this.editingId !== null) {

      const id = this.editingId;

      this.http.patch(
        `${this.baseMascotas}${id}/`,
        payload
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({

        next: () => {

          this.dialogVisible = false;

          this.loadMascotas();

          this.toastSuccess(
            'Actualizada',
            `Mascota ID ${id} actualizada correctamente.`
          );
        },

        error: (err) => {

          console.error(
            'Error actualizando mascota:',
            err
          );

          this.toastError(
            'Error',
            'No se pudo actualizar la mascota.'
          );
        }
      });

    } else {

      // ======================================================
      // CREAR NUEVA MASCOTA
      // ======================================================

      this.http.post<Mascota>(
        this.baseMascotas,
        payload
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({

        next: (mascotaCreada: Mascota) => {

          this.dialogVisible = false;

          this.loadMascotas();

          const id = mascotaCreada.id;

          this.toastSuccess(
            'Registrada',
            id != null
              ? `Mascota registrada con ID ${id}.`
              : 'Mascota registrada correctamente.'
          );
        },

        error: (err) => {

          console.error(
            'Error registrando mascota:',
            err
          );

          this.toastError(
            'Error',
            'No se pudo registrar la mascota.'
          );
        }
      });
    }
  }

  // ==========================================================
  // ABRIR CONFIRMACIÓN DE ELIMINACIÓN
  // ==========================================================

  openDeleteConfirm(row: Mascota): void {

    if (!this.canDelete(row)) {
      return;
    }

    if (
      row.id == null ||
      !Number.isInteger(Number(row.id)) ||
      Number(row.id) <= 0
    ) {
      this.toastError(
        'Error',
        'No se encontró el ID de la mascota.'
      );
      return;
    }

    this.mascotaToDelete = row;

    this.deleteError = '';

    this.confirmVisible = true;
  }

  // ==========================================================
  // CANCELAR ELIMINACIÓN
  // ==========================================================

  cancelDelete(): void {

    if (this.saving) {
      return;
    }

    this.confirmVisible = false;
    this.mascotaToDelete = null;
    this.deleteError = '';
  }

  // ==========================================================
  // CONFIRMAR ELIMINACIÓN
  // ==========================================================

  confirmDelete(): void {

    if (this.saving) {
      return;
    }

    const id = this.mascotaToDelete?.id;

    if (id == null) {
      return;
    }

    const nombre =
      this.mascotaToDelete?.nombre || 'Mascota';

    this.saving = true;

    this.http.delete(
      `${this.baseMascotas}${id}/`
    )
    .pipe(
      finalize(() => {
        this.saving = false;
      })
    )
    .subscribe({

      next: () => {

        this.confirmVisible = false;
        this.mascotaToDelete = null;
        this.deleteError = '';

        this.loadMascotas();

        this.toastSuccess(
          'Eliminada',
          `"${nombre}" (ID ${id}) fue eliminada.`
        );
      },

      error: (err) => {

        console.error(
          'Error eliminando mascota:',
          err
        );

        this.deleteError =
          'No se pudo eliminar. Verifica permisos o backend.';

        this.toastError(
          'Error',
          this.deleteError
        );
      }
    });
  }

  // ==========================================================
  // VALIDACIÓN DE CAMPOS
  // ==========================================================

  isInvalid(name: string): boolean {

    const control = this.form.get(name);

    return !!control &&
      control.invalid &&
      (control.touched || control.dirty);
  }

  errorText(name: string): string {

    const control = this.form.get(name);

    if (!control) {
      return '';
    }

    if (control.errors?.['required']) {
      return 'Campo obligatorio.';
    }

    return 'Campo inválido.';
  }

  // ==========================================================
  // VALIDACIÓN DE EDAD - CORREGIDA
  // ==========================================================

  private edadConsistenteValidator(): ValidatorFn {

    return (
      group: AbstractControl
    ): ValidationErrors | null => {

      const edadValor =
        group.get('edad_valor')?.value;

      const edadUnidad: EdadUnidad | null =
        group.get('edad_unidad')?.value ?? null;

      if (
        edadValor == null ||
        edadValor === ''
      ) {
        return null;
      }

      const valor = Number(edadValor);

      if (
        !Number.isFinite(valor) ||
        valor < 0 ||
        !edadUnidad
      ) {
        return {
          edadInconsistente: true
        };
      }

      return null;
    };
  }

  // ==========================================================
  // MENSAJES
  // ==========================================================

  private toastSuccess(
    summary: string,
    detail: string
  ): void {

    this.messageService.add({
      severity: 'success',
      summary: summary,
      detail: detail,
      life: 3000
    });
  }

  private toastWarn(detail: string): void {

    this.messageService.add({
      severity: 'warn',
      summary: 'Atención',
      detail: detail,
      life: 3500
    });
  }

  private toastError(
    summary: string,
    detail: string
  ): void {

    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: detail,
      life: 4500
    });
  }
}
