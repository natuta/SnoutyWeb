import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth/services/auth.service';

import {

  AbstractControl,

  FormBuilder,

  FormGroup,

  ReactiveFormsModule,

  ValidationErrors,

  Validators,

} from '@angular/forms';

// PrimeNG

import { TableModule } from 'primeng/table';

import { ButtonModule } from 'primeng/button';

import { InputTextModule } from 'primeng/inputtext';

import { DialogModule } from 'primeng/dialog';

import { SelectModule } from 'primeng/select';

import { CheckboxModule } from 'primeng/checkbox';

import { AutoCompleteModule } from 'primeng/autocomplete';

import { StepsModule } from 'primeng/steps';

import { ToastModule } from 'primeng/toast';

import { MessageService } from 'primeng/api';

import {

  CartillaMedica,

  Mascota,

  ActitudClinica,

  CondicionCorporal,

  EstadoDeshidratacion,

} from '../snouty.models';

type Option<T extends string> = { label: string; value: T };

type MucosaOption = { label: string; value: string };

@Component({

  selector: 'app-snouty-cartillas',

  standalone: true,

  imports: [

    CommonModule,

    ReactiveFormsModule,

    TableModule,

    ButtonModule,

    InputTextModule,

    DialogModule,

    SelectModule,

    CheckboxModule,

    AutoCompleteModule,

    StepsModule,

    ToastModule,

  ],

  providers: [MessageService],

  templateUrl: './cartillas.html',

  styles: [

    `

      /* ====== LOOK & FEEL (estilo como tu login: glass + limpio) ====== */

      .page-wrap {

        padding: 1rem;

      }

      .page-header {

        display: flex;

        justify-content: space-between;

        align-items: center;

        gap: 1rem;

        margin-bottom: 1rem;

      }

      .title {

        display: flex;

        flex-direction: column;

        gap: 0.15rem;

      }

      .title h5 {

        margin: 0;

      }

      .title small {

        opacity: 0.8;

      }

      /* Dialog contenido “glass” */

      .glass {

        background: rgba(255, 255, 255, 0.10);

        border: 1px solid rgba(255, 255, 255, 0.18);

        border-radius: 16px;

        backdrop-filter: blur(12px);

        -webkit-backdrop-filter: blur(12px);

        padding: 1rem;

      }

      /* Form grid bonito */

      .form-grid {

        display: grid;

        grid-template-columns: 1fr 1fr;

        gap: 1rem;

      }

      .field {

        display: flex;

        flex-direction: column;

        gap: 0.35rem;

      }

      .field label {

        font-weight: 600;

      }

      .hint {

        font-size: 0.78rem;

        opacity: 0.85;

      }

      .err {

        font-size: 0.78rem;

      }

      .section-title {

        display: flex;

        align-items: center;

        justify-content: space-between;

        margin: 0.25rem 0 0.5rem;

      }

      .section-title h6 {

        margin: 0;

        font-size: 0.95rem;

      }

      /* Mucosas en grid */

      .mucosa-grid {

        display: grid;

        grid-template-columns: repeat(2, 1fr);

        gap: 0.75rem;

      }

      .step-actions {

        display: flex;

        justify-content: space-between;

        gap: 0.5rem;

        margin-top: 1rem;

      }

      .step-actions.right {

        justify-content: flex-end;

      }

      @media (max-width: 900px) {

        .form-grid {

          grid-template-columns: 1fr;

        }

        .mucosa-grid {

          grid-template-columns: 1fr;

        }

      }

    `,

  ],

})

export class SnoutyCartillasPage implements OnInit {

  get isAdmin(): boolean {
    return this.auth.hasRole(['ADMIN']);
  }

  readOnlyMode = false;

  cartillas: CartillaMedica[] = [];

  mascotas: Mascota[] = [];

  mascotaSuggestions: Mascota[] = [];

  // ID real seleccionado para POST/PUT

  selectedMascotaId: number | null = null;

  form: FormGroup;

  dialogVisible = false;

  editingId: number | null = null;

  confirmVisible = false;

  cartillaToDelete: CartillaMedica | null = null;

  deleteError = '';

  saving = false;

  stepIndex = 0;

  steps = [

    { label: 'Datos básicos' },

    { label: 'Estado clínico' },

    { label: 'Mucosas y notas' },

  ];

private baseCartillas = 'https://snoutyweb.onrender.com/api/cartillas-medicas/';

private baseMascotas = 'https://snoutyweb.onrender.com/api/mascotas/';

  actitudOptions: Option<ActitudClinica>[] = [

    { label: 'Asténico', value: 'ASTENICO' as ActitudClinica },

    { label: 'Apoplético', value: 'APOPLETICO' as ActitudClinica },

    { label: 'Linfático', value: 'LINFATICO' as ActitudClinica },

  ];

  condicionOptions: Option<CondicionCorporal>[] = [

    { label: 'Obeso', value: 'OBESO' as CondicionCorporal },

    { label: 'Normal', value: 'NORMAL' as CondicionCorporal },

    { label: 'Delgado', value: 'DELGADO' as CondicionCorporal },

    { label: 'Caquéctico', value: 'CAQUECTICO' as CondicionCorporal },

  ];

  deshidratacionOptions: Option<EstadoDeshidratacion>[] = [

    { label: 'Normal', value: 'NORMAL' as EstadoDeshidratacion },

    { label: 'Al 5%', value: '5' as EstadoDeshidratacion },

    { label: 'Al 6-7%', value: '6-7' as EstadoDeshidratacion },

    { label: 'Al 8-9%', value: '8-9' as EstadoDeshidratacion },

    { label: 'Más del 10%', value: '10+' as EstadoDeshidratacion },

  ];

  mucosaEstadoOptions: MucosaOption[] = [

    { label: 'Normal', value: 'Normal' },

    { label: 'Anormal', value: 'Anormal' },

  ];

  constructor(

    private http: HttpClient,

    private fb: FormBuilder,

    private messageService: MessageService,
    private auth: AuthService

  ) {

    this.form = this.fb.group({

      // UI

      mascota_nombre: ['', [Validators.required, Validators.minLength(2)]],

      // Datos base

      fecha: ['', [Validators.required]],

      peso_kg: [null, [this.numberRangeValidator(0, 120)]],

      esterilizado: [false],

      // Estado clínico

      actitud: [null],

      condicion_corporal: [null],

      estado_deshidratacion: [null],

      temperatura_c: [null, [this.numberRangeValidator(30, 45)]],

      frec_cardiaca_lpm: [null, [this.numberRangeValidator(0, 400)]],

      frec_respiratoria_rpm: [null, [this.numberRangeValidator(0, 200)]],

      // Historia

      enfermedades_anteriores: ['', [Validators.maxLength(200)]],

      alergias: ['', [Validators.maxLength(200)]],

      // Mucosas

      mucosa_oral_conjuntival: [null],

      mucosa_piel: [null],

      mucosa_intima: [null],

      mucosa_rectal: [null],

      mucosa_ojos: [null],

      mucosa_nodulos: [null],

      // Observación

      locomocion: ['', [Validators.maxLength(120)]],

    });

  }

  ngOnInit(): void {

    this.loadMascotas();

    this.loadCartillas();

  }

  // ====== VALIDACIONES HELPERS ======

  private numberRangeValidator(min: number, max: number) {

    return (control: AbstractControl): ValidationErrors | null => {

      const v = control.value;

      if (v === null || v === undefined || v === '') return null; // opcional

      const n = Number(v);

      if (Number.isNaN(n)) return { number: true };

      if (n < min || n > max) return { range: { min, max } };

      return null;

    };

  }

  isInvalid(name: string): boolean {

    const c = this.form.get(name);

    return !!c && c.invalid && (c.dirty || c.touched);

  }

  errMsg(name: string): string {

    const c = this.form.get(name);

    if (!c || !c.errors) return '';

    if (c.errors['required']) return 'Este campo es obligatorio.';

    if (c.errors['minlength']) return `Mínimo ${c.errors['minlength'].requiredLength} caracteres.`;

    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres.`;

    if (c.errors['number']) return 'Debe ser un número válido.';

    if (c.errors['range'])

      return `Debe estar entre ${c.errors['range'].min} y ${c.errors['range'].max}.`;

    return 'Campo inválido.';

  }

  private toNullableNumber(value: any): number | null {

    return value === null || value === undefined || value === '' ? null : Number(value);

  }

  private getTodayISO(): string {

    const today = new Date();

    const y = today.getFullYear();

    const m = String(today.getMonth() + 1).padStart(2, '0');

    const d = String(today.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;

  }

  // ====== DATA ======

  loadMascotas() {

    this.http.get<Mascota[]>(this.baseMascotas).subscribe({

      next: (data) => {

        this.mascotas = data || [];

        this.mascotaSuggestions = [...this.mascotas];

      },

      error: (err) => console.error('Error cargando mascotas', err),

    });

  }

  loadCartillas() {

    this.http.get<CartillaMedica[]>(this.baseCartillas).subscribe({

      next: (data) => (this.cartillas = data || []),

      error: (err) => console.error('Error cargando cartillas', err),

    });

  }

  nombreMascota(id: number): string {

    const m = this.mascotas.find((x) => x.id === id);

    return m ? m.nombre : `Mascota #${id}`;

  }

  // ====== AUTOCOMPLETE ======

  filterMascotas(event: any) {

    const q = (event?.query || '').toLowerCase().trim();

    this.mascotaSuggestions = !q

      ? [...this.mascotas]

      : this.mascotas.filter((m) => (m.nombre || '').toLowerCase().includes(q));

  }

  onMascotaSelected(e: any) {

    const m: Mascota | null = e?.value ?? null;

    this.selectedMascotaId = m?.id ?? null;

    this.form.patchValue({ mascota_nombre: m?.nombre ?? '' });

  }

  onMascotaCleared() {

    this.selectedMascotaId = null;

    this.form.patchValue({ mascota_nombre: '' });

  }

  // ====== DIALOG / STEPS ======

  openNew() {
    if (!this.isAdmin) return;
    this.readOnlyMode = false;

    this.editingId = null;

    this.selectedMascotaId = null;

    this.form.enable();

    this.form.reset({

      mascota_nombre: '',

      fecha: this.getTodayISO(),

      peso_kg: null,

      esterilizado: false,

      actitud: null,

      condicion_corporal: null,

      estado_deshidratacion: null,

      temperatura_c: null,

      frec_cardiaca_lpm: null,

      frec_respiratoria_rpm: null,

      enfermedades_anteriores: '',

      alergias: '',

      mucosa_oral_conjuntival: null,

      mucosa_piel: null,

      mucosa_intima: null,

      mucosa_rectal: null,

      mucosa_ojos: null,

      mucosa_nodulos: null,

      locomocion: '',

    });

    this.stepIndex = 0;

    this.dialogVisible = true;

  }

  view(row: CartillaMedica) {
    this.edit(row, true);
  }

  edit(row: CartillaMedica, readOnlyMode = false) {
    if (!readOnlyMode && !this.isAdmin) return;
    this.readOnlyMode = readOnlyMode;
    this.form.enable();

    this.editingId = row.id ?? null;

    const mascotaObj = this.mascotas.find((m) => m.id === row.mascota_id) || null;

    this.selectedMascotaId = row.mascota_id;

    this.form.reset({

      mascota_nombre: mascotaObj?.nombre ?? '',

      fecha: row.fecha,

      peso_kg: row.peso_kg ?? null,

      esterilizado: !!row.esterilizado,

      actitud: row.actitud || null,

      condicion_corporal: row.condicion_corporal || null,

      estado_deshidratacion: row.estado_deshidratacion || null,

      temperatura_c: row.temperatura_c ?? null,

      frec_cardiaca_lpm: row.frec_cardiaca_lpm ?? null,

      frec_respiratoria_rpm: row.frec_respiratoria_rpm ?? null,

      enfermedades_anteriores: row.enfermedades_anteriores || '',

      alergias: row.alergias || '',

      mucosa_oral_conjuntival: row.mucosa_oral_conjuntival || null,

      mucosa_piel: row.mucosa_piel || null,

      mucosa_intima: row.mucosa_intima || null,

      mucosa_rectal: row.mucosa_rectal || null,

      mucosa_ojos: row.mucosa_ojos || null,

      mucosa_nodulos: row.mucosa_nodulos || null,

      locomocion: row.locomocion || '',

    });

    // bloquear mascota al editar

    this.form.get('mascota_nombre')?.disable();
    if (readOnlyMode) this.form.disable();

    this.stepIndex = 0;

    this.dialogVisible = true;

  }

  closeDialog() {

    this.dialogVisible = false;

  }

  goNext() {

    // Validación por paso (simple y clara)

    if (this.stepIndex === 0) {

      this.form.get('mascota_nombre')?.markAsTouched();

      this.form.get('fecha')?.markAsTouched();

      if (this.form.get('mascota_nombre')?.invalid || this.form.get('fecha')?.invalid) {

        this.messageService.add({

          severity: 'warn',

          summary: 'Revisa los datos',

          detail: 'Completa Mascota y Fecha para continuar.',

        });

        return;

      }

      if (!this.editingId && !this.selectedMascotaId) {

        this.messageService.add({

          severity: 'warn',

          summary: 'Mascota inválida',

          detail: 'Selecciona una mascota desde la lista.',

        });

        return;

      }

    }

    if (this.stepIndex === 1) {

      // Validar rangos numéricos si se ingresaron

      const fields = ['temperatura_c', 'frec_cardiaca_lpm', 'frec_respiratoria_rpm'];

      fields.forEach((f) => this.form.get(f)?.markAsTouched());

      const anyInvalid = fields.some((f) => this.form.get(f)?.invalid);

      if (anyInvalid) {

        this.messageService.add({

          severity: 'warn',

          summary: 'Valores inválidos',

          detail: 'Corrige los campos numéricos antes de continuar.',

        });

        return;

      }

    }

    this.stepIndex = Math.min(this.stepIndex + 1, this.steps.length - 1);

  }

  goBack() {

    this.stepIndex = Math.max(this.stepIndex - 1, 0);

  }

  // ====== SAVE ======

  save() {
    if (!this.isAdmin || this.readOnlyMode) return;

    // marcar todo por si el usuario intenta guardar sin pasar por pasos

    this.form.markAllAsTouched();

    if (this.form.invalid) {

      this.messageService.add({

        severity: 'warn',

        summary: 'Formulario incompleto',

        detail: 'Revisa los campos marcados en rojo.',

      });

      return;

    }

    const v = this.form.getRawValue();

    if (!this.editingId && !this.selectedMascotaId) {

      this.messageService.add({

        severity: 'warn',

        summary: 'Mascota inválida',

        detail: 'Selecciona una mascota desde la lista.',

      });

      return;

    }

    if (this.editingId && !this.selectedMascotaId) {

      this.messageService.add({

        severity: 'error',

        summary: 'Error',

        detail: 'No se pudo identificar la mascota de esta cartilla.',

      });

      return;

    }

    const payload: any = {

      mascota_id: this.selectedMascotaId,

      fecha: v['fecha'],

      peso_kg: this.toNullableNumber(v['peso_kg']),

      esterilizado: !!v['esterilizado'],

      actitud: v['actitud'] || null,

      condicion_corporal: v['condicion_corporal'] || null,

      estado_deshidratacion: v['estado_deshidratacion'] || null,

      temperatura_c: this.toNullableNumber(v['temperatura_c']),

      frec_cardiaca_lpm: this.toNullableNumber(v['frec_cardiaca_lpm']),

      frec_respiratoria_rpm: this.toNullableNumber(v['frec_respiratoria_rpm']),

      enfermedades_anteriores: v['enfermedades_anteriores']?.trim() || null,

      alergias: v['alergias']?.trim() || null,

      mucosa_oral_conjuntival: v['mucosa_oral_conjuntival'] || null,

      mucosa_piel: v['mucosa_piel'] || null,

      mucosa_intima: v['mucosa_intima'] || null,

      mucosa_rectal: v['mucosa_rectal'] || null,

      mucosa_ojos: v['mucosa_ojos'] || null,

      mucosa_nodulos: v['mucosa_nodulos'] || null,

      locomocion: v['locomocion']?.trim() || null,

    };

    this.saving = true;

    if (this.editingId) {

      this.http.put<CartillaMedica>(`${this.baseCartillas}${this.editingId}/`, payload).subscribe({

        next: () => {

          this.saving = false;

          this.dialogVisible = false;

          this.loadCartillas();

          this.messageService.add({

            severity: 'success',

            summary: 'Éxito',

            detail: 'Cartilla actualizada correctamente.',

          });

        },

        error: (err) => {

          this.saving = false;

          console.error('Error actualizando cartilla', err?.error || err);

          this.messageService.add({

            severity: 'error',

            summary: 'No se pudo guardar',

            detail: 'Verifica los datos e intenta nuevamente.',

          });

        },

      });

    } else {

      this.http.post<CartillaMedica>(this.baseCartillas, payload).subscribe({

        next: () => {

          this.saving = false;

          this.dialogVisible = false;

          this.loadCartillas();

          this.messageService.add({

            severity: 'success',

            summary: 'Éxito',

            detail: 'Cartilla registrada correctamente.',

          });

        },

        error: (err) => {

          this.saving = false;

          console.error('Error creando cartilla', err?.error || err);

          this.messageService.add({

            severity: 'error',

            summary: 'No se pudo guardar',

            detail: 'Verifica los datos e intenta nuevamente.',

          });

        },

      });

    }

  }

  // ====== DELETE ======

  openDeleteConfirm(row: CartillaMedica) {
    if (!this.isAdmin) return;

    if (!row.id) return;

    this.cartillaToDelete = row;

    this.deleteError = '';

    this.confirmVisible = true;

  }

  cancelDelete() {

    this.confirmVisible = false;

    this.cartillaToDelete = null;

    this.deleteError = '';

  }

  confirmDelete() {
    if (!this.isAdmin) return;

    if (!this.cartillaToDelete?.id) return;

    this.http.delete(`${this.baseCartillas}${this.cartillaToDelete.id}/`).subscribe({

      next: () => {

        this.confirmVisible = false;

        this.cartillaToDelete = null;

        this.deleteError = '';

        this.loadCartillas();

        this.messageService.add({

          severity: 'success',

          summary: 'Eliminado',

          detail: 'Cartilla eliminada correctamente.',

        });

      },

      error: (err) => {

        console.error('Error eliminando cartilla', err);

        this.deleteError = 'Ocurrió un error al eliminar la cartilla.';

      },

    });

  }

}
