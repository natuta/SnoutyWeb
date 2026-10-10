import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import {

  AbstractControl,

  FormBuilder,

  FormGroup,

  FormsModule,

  ReactiveFormsModule,

  ValidationErrors,

  Validators,

} from '@angular/forms';



import { TableModule } from 'primeng/table';

import { ButtonModule } from 'primeng/button';

import { InputTextModule } from 'primeng/inputtext';

import { DialogModule } from 'primeng/dialog';

import { SelectModule } from 'primeng/select';

import { StepsModule } from 'primeng/steps';

import { ToastModule } from 'primeng/toast';

import { MessageService } from 'primeng/api';



import { Vacuna, CartillaMedica } from '../snouty.models';



type StepKey = 0 | 1;



@Component({

  selector: 'app-snouty-vacunas',

  standalone: true,

  imports: [

    CommonModule,

    ReactiveFormsModule,

    FormsModule,

    TableModule,

    ButtonModule,

    InputTextModule,

    DialogModule,

    SelectModule,

    StepsModule,

    ToastModule,

  ],

  providers: [MessageService],

  templateUrl: './vacunas.html',

  styles: [

    `

      .snouty-bg {

        min-height: calc(100vh - 2rem);

        padding: 2.25rem 1rem;

        background: #f6f8fb !important;

        background-image: none !important;

        position: relative;

      }

      .snouty-bg::before,

      .snouty-bg::after {

        content: none !important;

      }



      .snouty-wrap {

        position: relative;

        max-width: 1200px;

        margin: 0 auto;

      }



      .glass {

        background: #ffffff !important;

        border: 1px solid #eef2f7 !important;

        border-radius: 18px !important;

        box-shadow: 0 14px 40px rgba(16, 24, 40, 0.1) !important;

        backdrop-filter: none !important;

        -webkit-backdrop-filter: none !important;

        overflow: hidden;

      }



      .glass-header {

        padding: 1.25rem 1.25rem 0.75rem 1.25rem;

      }



      .glass-body {

        padding: 0 1.25rem 1.25rem 1.25rem;

      }



      .title {

        margin: 0;

        font-weight: 800;

        letter-spacing: 0.2px;

        color: #111827 !important;

      }



      .subtitle {

        margin: 0.35rem 0 0 0;

        color: #6b7280 !important;

        font-size: 0.95rem;

      }



      .toolbar {

        display: flex;

        gap: 0.75rem;

        align-items: center;

        justify-content: space-between;

        flex-wrap: wrap;

        margin-top: 0.85rem;

      }



      .searchbox {

        display: flex;

        gap: 0.5rem;

        align-items: center;

        width: 100%;

        max-width: 520px;

      }



      .field {

        display: flex;

        flex-direction: column;

        gap: 0.35rem;

      }



      .field label {

        font-weight: 700;

        color: #374151 !important;

      }



      .help {

        color: #6b7280 !important;

        font-size: 0.85rem;

      }



      .p-error {

        font-size: 0.85rem;

      }



      .form-grid {

        display: grid;

        grid-template-columns: 1fr;

        gap: 1rem;

      }



      @media (min-width: 900px) {

        .form-grid {

          grid-template-columns: 1fr 1fr;

        }

      }



      .dialog-content {

        display: flex;

        flex-direction: column;

        gap: 1rem;

      }



      .step-actions {

        display: flex;

        gap: 0.5rem;

        justify-content: space-between;

        align-items: center;

        margin-top: 0.25rem;

      }



      .step-actions-right {

        display: flex;

        gap: 0.5rem;

        justify-content: flex-end;

        width: 100%;

      }



      .danger-icon {

        font-size: 2rem;

      }



      :host ::ng-deep .p-datatable,

      :host ::ng-deep .p-datatable-wrapper,

      :host ::ng-deep .p-datatable-table,

      :host ::ng-deep .p-datatable-header,

      :host ::ng-deep .p-datatable-footer,

      :host ::ng-deep .p-datatable-thead > tr > th,

      :host ::ng-deep .p-datatable-tbody > tr,

      :host ::ng-deep .p-datatable-tbody > tr > td,

      :host ::ng-deep .p-paginator {

        background: #ffffff !important;

        background-image: none !important;

        backdrop-filter: none !important;

        -webkit-backdrop-filter: none !important;

        opacity: 1 !important;

        color: #111827 !important;

      }



      :host ::ng-deep .p-datatable-thead > tr > th {

        border: 0 !important;

        border-bottom: 1px solid #eef2f7 !important;

        font-weight: 800 !important;

      }



      :host ::ng-deep .p-datatable-tbody > tr > td {

        border: 0 !important;

        border-bottom: 1px solid #f1f5f9 !important;

      }



      :host ::ng-deep .p-datatable-tbody > tr:hover,

      :host ::ng-deep .p-datatable-tbody > tr:hover > td {

        background: #fafafa !important;

      }



      :host ::ng-deep .p-paginator {

        border: 0 !important;

        padding-top: 1rem !important;

        justify-content: center !important;

      }

    `,

  ],

})

export class SnoutyVacunasPage implements OnInit {

  vacunas: Vacuna[] = [];

  cartillas: CartillaMedica[] = [];



  form: FormGroup;

  // Modo consulta: los tutores solo visualizan la información.
  readOnlyMode = false;

  // El rol proviene de la misma sesión que guarda AuthService.
  get isAdmin(): boolean {
    try {
      const stored = localStorage.getItem('snouty_current_user') || localStorage.getItem('snouty_user');
      if (!stored) return false;
      return String(JSON.parse(stored)?.rol ?? '').trim().toUpperCase() === 'ADMIN';
    } catch {
      return false;
    }
  }



  loading = false;



  dialogVisible = false;

  confirmVisible = false;



  editingId: number | null = null;

  vacunaToDelete: Vacuna | null = null;



  stepIndex: StepKey = 0;

  steps = [{ label: 'Datos básicos' }, { label: 'Fechas & detalles' }];



  globalFilter = '';



private baseVacunas = 'https\://snoutyweb.onrender.com/api/vacunas/';

private baseCartillas = 'https\://snoutyweb.onrender.com/api/cartillas-medicas/';



  constructor(

    private http: HttpClient,

    private fb: FormBuilder,

    private msg: MessageService

  ) {

    this.form = this.fb.group(

      {

        cartilla_medica_id: [null, [Validators.required]],

        tipo: [

          '',

          [

            Validators.required,

            Validators.minLength(3),

            Validators.maxLength(80),

            Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s\-.,()]+$/),

          ],

        ],

        producto: ['', [Validators.maxLength(120)]],

        fecha_aplicacion: ['', [Validators.required, this.noFutureDateValidator]],

        proxima_dosis: [''],

        veterinaria: ['', [Validators.maxLength(120)]],

      },

      { validators: [this.dateOrderValidator] }

    );

  }



  ngOnInit(): void {

    this.loadCartillas();

    this.loadVacunas();

  }



  private getAuthHeaders(): HttpHeaders {

  const token = localStorage.getItem('snouty_access_token');

    return new HttpHeaders({

      Authorization: `Bearer ${token}`

    });

  }



  loadCartillas() {

    this.http.get<CartillaMedica[]>(this.baseCartillas, {

      headers: this.getAuthHeaders()

    }).subscribe({

      next: (data) => (this.cartillas = data || []),

      error: (err) => {

        console.error('Error cargando cartillas médicas', err);

        this.toastError('No se pudo cargar cartillas médicas.');

      },

    });

  }



  loadVacunas() {

    this.loading = true;

    this.http.get<Vacuna[]>(this.baseVacunas, {

      headers: this.getAuthHeaders()

    }).subscribe({

      next: (data) => (this.vacunas = data || []),

      error: (err) => {

        console.error('Error cargando vacunas', err);

        this.toastError('No se pudo cargar vacunas.');

      },

      complete: () => (this.loading = false),

    });

  }



  cartillaLabel(id: number): string {

    const c = this.cartillas.find((x) => x.id === id);

    return c ? `Cartilla #${c.id}` : `#${id}`;

  }



  c(name: string): AbstractControl {

    return this.form.get(name)!;

  }



  private touchControls(names: string[]) {

    names.forEach((n) => this.c(n).markAsTouched());

  }



  private touchAll() {

    Object.keys(this.form.controls).forEach((k) => this.c(k).markAsTouched());

    this.form.updateValueAndValidity();

  }



  private noFutureDateValidator(control: AbstractControl): ValidationErrors | null {

    const v = control.value;

    if (!v) return null;



    const input = new Date(v);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    input.setHours(0, 0, 0, 0);



    return input > today ? { futureDate: true } : null;

  }



  private dateOrderValidator(group: AbstractControl): ValidationErrors | null {

    const fecha = group.get('fecha_aplicacion')?.value;

    const proxima = group.get('proxima_dosis')?.value;



    if (!fecha || !proxima) return null;



    const f = new Date(fecha);

    const p = new Date(proxima);

    f.setHours(0, 0, 0, 0);

    p.setHours(0, 0, 0, 0);



    return p < f ? { dateOrder: true } : null;

  }



  clearSearch(dt: any) {

    this.globalFilter = '';

    dt.clear();

  }



  openNew() {
    if (!this.isAdmin) return;
    this.readOnlyMode = false;
    this.form.enable();

    this.editingId = null;

    this.stepIndex = 0;



    this.form.reset({

      cartilla_medica_id: null,

      tipo: '',

      producto: '',

      fecha_aplicacion: '',

      proxima_dosis: '',

      veterinaria: '',

    });



    this.form.markAsPristine();

    this.form.markAsUntouched();

    this.dialogVisible = true;

  }



  // Cargar los datos una sola vez para editar o consultar.
  private fillForm(row: Vacuna): void {
    this.editingId = row.id ?? null;
    this.stepIndex = 0;
    this.form.reset({
      cartilla_medica_id: row.cartilla_medica_id ?? null,
      tipo: row.tipo ?? '',
      producto: row.producto ?? '',
      fecha_aplicacion: row.fecha_aplicacion ?? '',
      proxima_dosis: row.proxima_dosis ?? '',
      veterinaria: row.veterinaria ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  view(row: Vacuna): void {
    this.readOnlyMode = true;
    this.fillForm(row);
    this.form.disable();
    this.dialogVisible = true;
  }

  edit(row: Vacuna): void {
    if (!this.isAdmin) return;
    this.readOnlyMode = false;
    this.fillForm(row);
    this.form.enable();
    this.dialogVisible = true;
  }

  closeDialog() {

    this.dialogVisible = false;

  }



  nextStep() {
    if (this.readOnlyMode) {
      this.stepIndex = 1;
      return;
    }

    if (this.stepIndex === 0) {

      this.touchControls(['cartilla_medica_id', 'tipo', 'producto']);



      if (this.c('cartilla_medica_id').invalid || this.c('tipo').invalid || this.c('producto').invalid) {

        this.toastWarn('Revisa los campos del paso 1.');

        return;

      }



      this.stepIndex = 1;

    }

  }



  prevStep() {

    if (this.stepIndex === 1) this.stepIndex = 0;

  }



  save() {
    if (!this.isAdmin || this.readOnlyMode) return;

    this.touchAll();



    if (this.form.invalid) {

      this.toastWarn('Corrige los campos marcados antes de guardar.');

      return;

    }



    const payload: Vacuna = {

      cartilla_medica_id: this.form.value['cartilla_medica_id'],

      tipo: (this.form.value['tipo'] || '').trim(),

      producto: (this.form.value['producto'] || '').trim() || null,

      fecha_aplicacion: this.form.value['fecha_aplicacion'],

      proxima_dosis: (this.form.value['proxima_dosis'] || '').trim() || null,

      veterinaria: (this.form.value['veterinaria'] || '').trim() || null,

    };



    const options = {

      headers: this.getAuthHeaders()

    };



    if (this.editingId) {

      this.http.put<Vacuna>(`${this.baseVacunas}${this.editingId}/`, payload, options).subscribe({

        next: () => {

          this.dialogVisible = false;

          this.loadVacunas();

          this.toastSuccess('Vacuna actualizada correctamente.');

        },

        error: (err) => {

          console.error('Error actualizando vacuna', err);

          this.toastError('No se pudo actualizar la vacuna.');

        },

      });

    } else {

      this.http.post<Vacuna>(this.baseVacunas, payload, options).subscribe({

        next: () => {

          this.dialogVisible = false;

          this.loadVacunas();

          this.toastSuccess('Vacuna registrada correctamente.');

        },

        error: (err) => {

          console.error('Error creando vacuna', err);

          this.toastError('No se pudo registrar la vacuna.');

        },

      });

    }

  }



  openDeleteConfirm(row: Vacuna) {
    if (!this.isAdmin) return;

    if (!row?.id) return;

    this.vacunaToDelete = row;

    this.confirmVisible = true;

  }



  cancelDelete() {

    this.confirmVisible = false;

    this.vacunaToDelete = null;

  }



  confirmDelete() {
    if (!this.isAdmin) return;

    if (!this.vacunaToDelete?.id) return;



    this.http.delete(`${this.baseVacunas}${this.vacunaToDelete.id}/`, {

      headers: this.getAuthHeaders()

    }).subscribe({

      next: () => {

        this.confirmVisible = false;

        this.vacunaToDelete = null;

        this.loadVacunas();

        this.toastSuccess('Vacuna eliminada correctamente.');

      },

      error: (err) => {

        console.error('Error eliminando vacuna', err);

        this.toastError('No se pudo eliminar la vacuna.');

      },

    });

  }



  private toastSuccess(detail: string) {

    this.msg.add({ severity: 'success', summary: '¡Éxito!', detail, life: 2800 });

  }



  private toastWarn(detail: string) {

    this.msg.add({ severity: 'warn', summary: 'Atención', detail, life: 3200 });

  }



  private toastError(detail: string) {

    this.msg.add({ severity: 'error', summary: 'Error', detail, life: 3800 });

  }

}