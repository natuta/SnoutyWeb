import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RippleModule } from 'primeng/ripple';

import { MessageService } from 'primeng/api';

import { Especie, Raza } from '../snouty.models';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-snouty-razas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    SelectModule,

    ToastModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    RippleModule,
  ],
  providers: [MessageService],
  templateUrl: './razas.html',
  styles: [
    `
      .snouty-bg{
        min-height: calc(100vh - 2rem);
        padding: 2rem 1rem;
        position: relative;
        overflow: hidden;
        background: #f6f7fb;
        border-radius: 18px;
      }

      .snouty-bg::before{
        content:'';
        position:absolute;
        inset:0;
        background-image: url('/assets/layout/images/snouty-bg.jpg');
        background-size: cover;
        background-position: center;
        opacity: .10;
        pointer-events:none;
      }

      .snouty-content{
        position:relative;
        z-index:1;
        display:flex;
        justify-content:center;
      }

      .glass-card{
        width:min(1100px, 100%);
        background:#ffffff !important;
        border:1px solid #eef2f7 !important;
        border-radius:18px !important;
        box-shadow: 0 14px 40px rgba(16,24,40,.10) !important;
        padding: 1.1rem !important;
      }

      .header-row{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:1rem;
        margin-bottom: .75rem;
      }

      .title-block h2{
        margin:0;
        font-weight: 800;
        letter-spacing:.2px;
        color:#111827;
        font-size: 1.25rem;
      }

      .title-block small{
        display:block;
        margin-top:.25rem;
        color:#6b7280;
        font-size:.92rem;
      }

      .search-row{
        display:flex;
        gap:.75rem;
        flex-wrap:wrap;
        align-items:center;
        margin:.5rem 0 1rem;
      }

      .muted{
        color:#6b7280;
      }

      .help-error{
        color:#b42318;
        font-weight:600;
      }

      /* ===== TABLA BLANCA (sin transparencias) ===== */
      :host ::ng-deep .snouty-table .p-datatable,
      :host ::ng-deep .snouty-table .p-datatable-wrapper,
      :host ::ng-deep .snouty-table .p-datatable-table{
        background:#ffffff !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-header{
        background:#ffffff !important;
        border:0 !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-thead > tr > th{
        background:#ffffff !important;
        color:#374151 !important;
        font-weight:800 !important;
        border:0 !important;
        border-bottom:1px solid #eef2f7 !important;
        padding:.95rem .9rem !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-tbody > tr{
        background:#ffffff !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-tbody > tr > td{
        background:#ffffff !important;
        color:#111827 !important;
        border:0 !important;
        border-bottom:1px solid #f1f5f9 !important;
        padding:.9rem .9rem !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-tbody > tr:hover,
      :host ::ng-deep .snouty-table .p-datatable-tbody > tr:hover > td{
        background:#fafafa !important;
      }

      :host ::ng-deep .snouty-table .p-paginator{
        background:#ffffff !important;
        border:0 !important;
        padding-top: 1rem !important;
        justify-content:center !important;
      }

      :host ::ng-deep .snouty-table .p-paginator .p-paginator-page.p-highlight{
        background:#efe7ff !important;
        color:#6d28d9 !important;
        border:0 !important;
        border-radius:999px !important;
      }

      /* ===== DIALOG BLANCO (sin glass) ===== */
      :host ::ng-deep .white-dialog .p-dialog-header,
      :host ::ng-deep .white-dialog .p-dialog-content,
      :host ::ng-deep .white-dialog .p-dialog-footer{
        background:#ffffff !important;
        color:#111827 !important;
        border:0 !important;
      }

      :host ::ng-deep .white-dialog .p-dialog-header{
        border-bottom:1px solid #eef2f7 !important;
      }

      :host ::ng-deep .white-dialog .p-dialog-footer{
        border-top:1px solid #eef2f7 !important;
      }

      :host ::ng-deep input.p-inputtext{
        background:#ffffff !important;
      }

      :host ::ng-deep .snouty-select.p-select{
        width:100%;
        background:#ffffff !important;
        border-radius:12px;
      }

      :host ::ng-deep .snouty-select-panel{
        z-index: 999999 !important;
        min-width: 260px;
      }

      .dialog-grid{
        display:grid;
        gap:1rem;
      }

      .field-col{
        display:flex;
        flex-direction:column;
        gap:.35rem;
      }

      .field-col label{
        font-weight:800;
        color:#111827;
      }

      .center{
        text-align:center;
      }

      .spinner-row{
        display:grid;
        place-items:center;
        padding:1.25rem 0;
      }

      .actions-right{
        display:flex;
        justify-content:flex-end;
        gap:.5rem;
      }
    `,
  ],
})
export class SnoutyRazasPage implements OnInit {
  especies: Especie[] = [];
  razas: Raza[] = [];

  form: FormGroup;

  isAdmin = false;
  dialogVisible = false;
  confirmVisible = false;

  razaToDelete: Raza | null = null;
  deleteError = '';

  loadingEspecies = false;
  loadingRazas = false;
  saving = false;
  deleting = false;

private baseRazas = 'https://snoutyweb.onrender.com/api/razas/';
private baseEspecies = 'https://snoutyweb.onrender.com/api/especies/';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private msg: MessageService
  ) {
    this.form = this.fb.group({
      especie_id: [null, [Validators.required]],
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(80),
          Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'-]+$/),
          this.noSoloEspaciosValidator,
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN']);
    this.loadEspecies();
    this.loadRazas();
  }

  private noSoloEspaciosValidator(control: AbstractControl) {
    const v = String(control.value ?? '');
    if (!v) return null;
    return v.trim().length === 0 ? { onlySpaces: true } : null;
  }

  get f() {
    return this.form.controls;
  }

  nombreEspecie(id: number): string {
    const e = this.especies.find((x) => x.id === id);
    return e ? e.nombre : `#${id}`;
  }

  loadEspecies() {
    this.loadingEspecies = true;
    this.http.get<Especie[]>(this.baseEspecies).subscribe({
      next: (data) => (this.especies = data ?? []),
      error: (err) => {
        console.error('Error cargando especies', err);
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las especies.',
        });
      },
      complete: () => (this.loadingEspecies = false),
    });
  }

  loadRazas() {
    this.loadingRazas = true;
    this.http.get<Raza[]>(this.baseRazas).subscribe({
      next: (data) => (this.razas = data ?? []),
      error: (err) => {
        console.error('Error cargando razas', err);
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las razas.',
        });
      },
      complete: () => (this.loadingRazas = false),
    });
  }

  openNew() {
    if (!this.isAdmin) return;

    this.form.reset({ especie_id: null, nombre: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.dialogVisible = true;
  }

  closeDialog() {
    this.dialogVisible = false;
  }

  save() {
    if (!this.isAdmin) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.add({
        severity: 'warn',
        summary: 'Revisa el formulario',
        detail: 'Completa los campos correctamente antes de guardar.',
      });
      return;
    }

    const especieId = this.form.value['especie_id'];
    const nombre = String(this.form.value['nombre'] ?? '').trim();

    const yaExiste = this.razas.some(
      (r) =>
        Number(r.especie_id) === Number(especieId) &&
        String(r.nombre ?? '').trim().toLowerCase() === nombre.toLowerCase()
    );

    if (yaExiste) {
      this.msg.add({
        severity: 'error',
        summary: 'Duplicado',
        detail: 'Ya existe una raza con ese nombre para la especie seleccionada.',
      });
      return;
    }

    const payload: Raza = { especie_id: especieId, nombre };

    this.saving = true;
    this.http.post<Raza>(this.baseRazas, payload).subscribe({
      next: () => {
        this.dialogVisible = false;
        this.msg.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'La raza se registró correctamente.',
        });
        this.loadRazas();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error creando raza', err);

        let detail = 'Ocurrió un error al guardar la raza.';
        if (err.status === 400) detail = 'Datos inválidos. Verifica los campos.';
        if (err.status === 401 || err.status === 403)
          detail = 'No tienes permisos para realizar esta acción.';

        this.msg.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail,
        });
      },
      complete: () => (this.saving = false),
    });
  }

  openDeleteConfirm(row: Raza) {
    if (!this.isAdmin) return;
    if (!row?.id) return;

    this.razaToDelete = row;
    this.deleteError = '';
    this.confirmVisible = true;
  }

  cancelDelete() {
    this.confirmVisible = false;
    this.razaToDelete = null;
    this.deleteError = '';
  }

  confirmDelete() {
    if (!this.isAdmin) return;
    if (!this.razaToDelete?.id) return;

    this.deleting = true;
    this.http.delete(`${this.baseRazas}${this.razaToDelete.id}/`).subscribe({
      next: () => {
        const nombre = this.razaToDelete?.nombre ?? '';
        this.confirmVisible = false;
        this.razaToDelete = null;
        this.deleteError = '';

        this.msg.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: `Se eliminó la raza "${nombre}".`,
        });

        this.loadRazas();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error eliminando raza', err);

        this.deleteError =
          err.status === 500
            ? 'No se puede eliminar esta raza porque está siendo utilizada en otros registros.'
            : 'Ocurrió un error al eliminar la raza.';

        this.msg.add({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: this.deleteError,
        });
      },
      complete: () => (this.deleting = false),
    });
  }

  especieError(): string {
    const c = this.f['especie_id'];
    if (!c.touched) return '';
    if (c.hasError('required')) return 'La especie es obligatoria.';
    return 'Selecciona una especie válida.';
  }

  nombreError(): string {
    const c = this.f['nombre'];
    if (!c.touched) return '';
    if (c.hasError('required')) return 'El nombre de la raza es obligatorio.';
    if (c.hasError('onlySpaces')) return 'No se permite solo espacios.';
    if (c.hasError('minlength')) return 'Debe tener al menos 2 caracteres.';
    if (c.hasError('maxlength')) return 'Máximo 80 caracteres.';
    if (c.hasError('pattern'))
      return 'Solo letras/números y caracteres válidos (espacio, punto, guion, apóstrofe).';
    return 'Nombre inválido.';
  }
}
