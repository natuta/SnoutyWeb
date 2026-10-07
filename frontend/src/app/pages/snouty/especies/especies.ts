import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

// PrimeNG
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';

import { Especie } from '../snouty.models';
import { AuthService } from '../../auth/services/auth.service';

const API_URL = 'https://snoutyweb.onrender.com/api/especies/';

@Component({
  selector: 'app-snouty-especies',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,

    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    RippleModule,
  ],
  providers: [MessageService],
  templateUrl: './especies.html',
  styles: [
    `
      .snouty-page {
        min-height: calc(100vh - 2rem);
        padding: 2rem 1rem;
        background: #f3f5f8;
        display: flex;
        justify-content: center;
      }

      .snouty-card {
        width: min(1100px, 100%);
        background: #ffffff;
        border: 1px solid #eef2f7;
        border-radius: 18px;
        box-shadow: 0 14px 40px rgba(16,24,40,.10);
        padding: 1.25rem;
      }

      .snouty-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .snouty-title {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 900;
        color: #111827;
      }

      .snouty-subtitle {
        margin: 0.25rem 0 0;
        color: #6b7280;
        font-size: 0.95rem;
      }

      :host ::ng-deep .snouty-btn-primary.p-button {
        border-radius: 12px !important;
        padding: 0.7rem 1rem !important;
        font-weight: 800 !important;
      }

      .snouty-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 1rem;
      }

      .snouty-search {
        display: flex;
        align-items: center;
        gap: 0.6rem;

        width: 100%;
        max-width: 360px;

        padding: 0.6rem 0.75rem;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
      }

      .snouty-search i {
        color: #6b7280;
        font-size: 1rem;
      }

      .snouty-search input {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        width: 100%;
        font-size: 0.95rem;
      }

      .snouty-tablewrap {
        border-top: 1px solid #eef2f7;
        padding-top: 0.75rem;
      }

      .snouty-rowname {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .snouty-empty {
        text-align: center;
        padding: 1.5rem;
        color: #6b7280;
      }

      .actions-cell {
        text-align: right;
      }

      .field-col label {
        font-weight: 800;
        margin-bottom: 0.35rem;
        display: inline-block;
      }

      .footer-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        width: 100%;
      }
    `,
  ],
})
export class SnoutyEspeciesPage implements OnInit {
  @ViewChild('dt') dt!: Table;

  especies: Especie[] = [];
  form: FormGroup;

  loading = false;
  saving = false;
  deleting = false;

  dialogVisible = false;
  confirmVisible = false;

  especieToDelete: Especie | null = null;

  formError = '';
  deleteError = '';

  globalFilter = '';

  isAdmin = false;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(80),
          Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole(['ADMIN']);
    this.loadEspecies();
  }

  loadEspecies(): void {
    this.loading = true;
    this.http
      .get<Especie[]>(API_URL)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => (this.especies = Array.isArray(data) ? data : []),
        error: () => {
          this.especies = [];
          this.toast('error', 'Error', 'No se pudo cargar la lista de especies.');
        },
      });
  }

  applyGlobalFilter(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.dt?.filterGlobal(value, 'contains');
  }

  openNew(): void {
    if (!this.isAdmin) {
      this.toast('warn', 'Sin permiso', 'Solo ADMIN puede crear especies.');
      return;
    }
    this.form.reset({ nombre: '' });
    this.formError = '';
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.formError = '';
    this.form.reset({ nombre: '' });
  }

  save(): void {
    if (!this.isAdmin) return;

    this.formError = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.formError = 'Revisa el formulario: hay campos inválidos.';
      return;
    }

    const rawNombre = String(this.form.value.nombre ?? '');
    const nombre = rawNombre.trim().replace(/\s+/g, ' ');

    if (nombre.length < 2) {
      this.formError = 'El nombre debe tener al menos 2 caracteres.';
      return;
    }

    this.saving = true;

    this.http
      .post<Especie>(API_URL, { nombre })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.dialogVisible = false;
          this.toast('success', 'Guardado', 'Especie registrada correctamente.');
          this.loadEspecies();
        },
        error: (err) => {
          const msg =
            err?.error?.detail ||
            err?.error?.nombre?.[0] ||
            'No se pudo guardar la especie. Verifica los datos e intenta otra vez.';
          this.formError = msg;
          this.toast('error', 'Error', msg);
        },
      });
  }

  openDeleteConfirm(row: Especie): void {
    if (!this.isAdmin) {
      this.toast('warn', 'Sin permiso', 'Solo ADMIN puede eliminar especies.');
      return;
    }
    if (!row?.id) return;

    this.especieToDelete = row;
    this.deleteError = '';
    this.confirmVisible = true;
  }

  cancelDelete(): void {
    this.confirmVisible = false;
    this.especieToDelete = null;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.isAdmin) return;
    if (!this.especieToDelete?.id) return;

    this.deleting = true;
    const id = this.especieToDelete.id;

    this.http
      .delete(`${API_URL}${id}/`)
      .pipe(finalize(() => (this.deleting = false)))
      .subscribe({
        next: () => {
          this.confirmVisible = false;
          this.especieToDelete = null;
          this.deleteError = '';
          this.toast('success', 'Eliminado', 'Especie eliminada correctamente.');
          this.loadEspecies();
        },
        error: (err) => {
          if (err?.status === 500) {
            this.deleteError =
              'No se puede eliminar esta especie porque tiene razas asociadas.';
          } else if (err?.status === 403) {
            this.deleteError = 'No tienes permisos para eliminar.';
          } else {
            this.deleteError = 'Ocurrió un error al eliminar la especie.';
          }
          this.toast('error', 'Error', this.deleteError);
        },
      });
  }

  touch(controlName: string): void {
    const c = this.form.get(controlName);
    c?.markAsTouched();
    c?.updateValueAndValidity({ onlySelf: true });
  }

  hasError(controlName: string, errorKey: string): boolean {
    const c = this.form.get(controlName);
    return !!(c && c.touched && c.hasError(errorKey));
  }

  private toast(
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail: string
  ) {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
