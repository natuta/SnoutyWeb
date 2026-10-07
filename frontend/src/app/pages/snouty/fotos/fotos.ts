import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl
} from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { MessageService } from 'primeng/api';

import { FotoMascota, Mascota } from '../snouty.models';
import { AuthService, AuthUser } from '../../auth/services/auth.service';

type SelectedFile = {
  file: File;
  preview: string;
};

@Component({
  selector: 'app-snouty-fotos-mascota',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    AutoCompleteModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './fotos.html',
  styles: [
    `
        .snouty-page {
      min-height: calc(100vh - 2rem);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2.25rem 1rem;

      background: #f6f8fb !important;     /* igual que dashboards */
      background-image: none !important; /* quita la foto */
      position: relative;
    }

    /* quita el overlay oscuro */
    .snouty-page::before{
      content: none !important;
    }


    

      .snouty-shell {
        width: min(1100px, 100%);
        position: relative;
        z-index: 1;
      }

      .deny-card {
        padding: 1rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #fff;
      }

      .snouty-card {
        background: #ffffff !important;
        background-image: none !important;
        border: 1px solid #eef2f7 !important;
        border-radius: 18px !important;
        box-shadow: 0 14px 40px rgba(16, 24, 40, 0.10) !important;
        padding: 1.1rem !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        opacity: 1 !important;
        color: #111827 !important;
      }

      .snouty-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.75rem;
      }

      .snouty-card-title h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: #1f2937;
      }

      .snouty-card-sub {
        margin: 0.25rem 0 0;
        font-size: 0.92rem;
        color: #6b7280;
      }

      .muted-dark {
        color: #6b7280;
      }

      :host ::ng-deep .snouty-btn-primary.p-button {
        border-radius: 12px !important;
        padding: 0.7rem 1rem !important;
        font-weight: 700 !important;
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08) !important;
      }

      /* ====== KILL GLASS EN TODA LA TABLA (tema global) ====== */
      :host ::ng-deep .snouty-table,
      :host ::ng-deep .snouty-table * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      :host ::ng-deep .snouty-table .p-datatable,
      :host ::ng-deep .snouty-table .p-datatable-wrapper,
      :host ::ng-deep .snouty-table .p-datatable-table,
      :host ::ng-deep .snouty-table .p-datatable-scrollable-wrapper,
      :host ::ng-deep .snouty-table .p-datatable-scrollable-view,
      :host ::ng-deep .snouty-table .p-datatable-header,
      :host ::ng-deep .snouty-table .p-datatable-footer,
      :host ::ng-deep .snouty-table .p-datatable-loading-overlay {
        background: #ffffff !important;
        background-image: none !important;
        opacity: 1 !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-thead > tr > th {
        background: #ffffff !important;
        color: #374151 !important;
        font-weight: 800 !important;
        border: 0 !important;
        border-bottom: 1px solid #eef2f7 !important;
        padding: 0.95rem 0.9rem !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-tbody > tr,
      :host ::ng-deep .snouty-table .p-datatable-tbody > tr.p-row-odd,
      :host ::ng-deep .snouty-table .p-datatable-tbody > tr.p-row-even {
        background: #ffffff !important;
        opacity: 1 !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-tbody > tr > td {
        background: #ffffff !important;
        color: #111827 !important;
        border: 0 !important;
        border-bottom: 1px solid #f1f5f9 !important;
        padding: 0.9rem 0.9rem !important;
      }

      :host ::ng-deep .snouty-table .p-datatable-tbody > tr:hover,
      :host ::ng-deep .snouty-table .p-datatable-tbody > tr:hover > td {
        background: #fafafa !important;
      }

      :host ::ng-deep .snouty-table .p-paginator,
      :host ::ng-deep .snouty-table .p-paginator-bottom,
      :host ::ng-deep .snouty-table .p-paginator-top {
        background: #ffffff !important;
        border: 0 !important;
        padding-top: 1rem !important;
        justify-content: center !important;
        opacity: 1 !important;
      }

      :host ::ng-deep .snouty-table .p-paginator .p-paginator-page,
      :host ::ng-deep .snouty-table .p-paginator .p-paginator-next,
      :host ::ng-deep .snouty-table .p-paginator .p-paginator-prev,
      :host ::ng-deep .snouty-table .p-paginator .p-paginator-first,
      :host ::ng-deep .snouty-table .p-paginator .p-paginator-last {
        border-radius: 999px !important;
        margin: 0 0.15rem !important;
      }

      :host ::ng-deep .snouty-table .p-paginator .p-paginator-page.p-highlight {
        background: #efe7ff !important;
        color: #6d28d9 !important;
        border: 0 !important;
      }

      .actions-cell {
        text-align: right;
      }

      .empty-msg {
        text-align: center;
        padding: 1.25rem;
        color: #6b7280;
      }

      :host ::ng-deep .snouty-toast-center {
        width: min(520px, 92vw);
      }

      .centered {
        text-align: center;
      }

      .dialog-wrap {
        max-width: 520px;
        width: 100%;
        margin: 0 auto;
      }

      .step-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .step-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.08);
      }

      .field label {
        font-weight: 700;
        margin-bottom: 0.35rem;
        display: inline-block;
      }

      .hint {
        font-size: 0.85rem;
        opacity: 0.85;
      }

      .p-error {
        font-size: 0.85rem;
      }

      .thumb-grid {
        margin-top: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .thumb {
        width: 92px;
        text-align: center;
      }

      .thumb-box {
        border-radius: 10px;
        padding: 5px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.65);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
      }

      .thumb img {
        width: 100%;
        height: 70px;
        object-fit: cover;
        border-radius: 8px;
      }

      .file-name {
        font-size: 0.72rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 0.25rem;
      }

      .muted {
        color: rgba(255, 255, 255, 0.75);
      }
    `
  ]
})
export class SnoutyFotosMascotaPage implements OnInit {
  fotos: FotoMascota[] = [];
  mascotas: Mascota[] = [];
  mascotasFiltradas: Mascota[] = [];

  loading = false;
  dialogVisible = false;
  confirmVisible = false;

  fotoToDelete: FotoMascota | null = null;

  form: FormGroup;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  selectedFiles: SelectedFile[] = [];
  showFilesError = false;

  readonly MAX_FILES = 6;
  readonly MAX_FILE_MB = 5;

  lastMascotaId: number | null = null;

  bgStyle = `url("assets/layout/images/snouty-bg.jpg")`;

private baseFotos = 'https://snoutyweb.onrender.com/api/fotos-mascota/';
private baseMascotas = 'https://snoutyweb.onrender.com/api/mascotas/';
private baseUpload = 'https://snoutyweb.onrender.com/api/fotos-mascota/upload/';

  user: AuthUser | null = null;

  get isAdmin(): boolean { return this.user?.rol === 'ADMIN'; }
  get isTutor(): boolean { return this.user?.rol === 'TUTOR'; }
  get isAdoptante(): boolean { return this.user?.rol === 'ADOPTANTE'; }

  get canAdd(): boolean { return this.isTutor; }
  get canDelete(): boolean { return this.isAdmin || this.isTutor; }

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private auth: AuthService,
    private msg: MessageService
  ) {
    this.form = this.fb.group({
      mascota: [null, Validators.required],
      fecha: [this.todayISO(), [Validators.required, this.noFutureDateValidator]]
    });
  }

  private noFutureDateValidator(control: AbstractControl) {
    const v = String(control.value ?? '').trim();
    if (!v) return null;
    const today = new Date();
    const input = new Date(v + 'T00:00:00');
    const todayISO = today.toISOString().slice(0, 10);
    const todayLocal = new Date(todayISO + 'T00:00:00');
    if (input.getTime() > todayLocal.getTime()) return { futureDate: true };
    return null;
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    if (!this.user) return;
    if (this.isAdoptante) return;

    this.loading = true;

    if (this.isAdmin) {
      this.loadMascotasAdmin();
      return;
    }

    if (this.isTutor) {
      this.loadMascotasTutor();
    }
  }

  private loadMascotasAdmin(): void {
    forkJoin({
      mascotas: this.http.get<any>(this.baseMascotas).pipe(catchError(() => of([]))),
      fotos: this.http.get<any>(this.baseFotos).pipe(catchError(() => of([])))
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(({ mascotas, fotos }) => {
        const m: Mascota[] = Array.isArray(mascotas) ? mascotas : mascotas?.results ?? [];
        const f: FotoMascota[] = Array.isArray(fotos) ? fotos : fotos?.results ?? [];
        this.mascotas = m;
        this.mascotasFiltradas = [...m];
        this.fotos = f;
      });
  }

  private loadMascotasTutor(): void {
    if (!this.user?.email) {
      this.mascotas = [];
      this.mascotasFiltradas = [];
      this.fotos = [];
      this.loading = false;
      return;
    }

    this.http
      .get<any>(this.baseMascotas)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          const all: any[] = Array.isArray(data) ? data : data?.results ?? [];
          this.mascotas = all.filter(
            (m) => String(m.tutor_email ?? '').toLowerCase() === String(this.user!.email).toLowerCase()
          );
          this.mascotasFiltradas = [...this.mascotas];
          this.loadFotosTutor();
        },
        error: () => {
          this.mascotas = [];
          this.mascotasFiltradas = [];
          this.fotos = [];
        }
      });
  }

  private loadFotosTutor(): void {
    this.loading = true;
    this.http
      .get<any>(this.baseFotos)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (resp) => {
          const data: FotoMascota[] = Array.isArray(resp) ? resp : resp?.results ?? [];
          const ids = new Set(this.mascotas.map((m) => m.id));
          this.fotos = data.filter((f) => ids.has(f.mascota_id));
        },
        error: () => {
          this.fotos = [];
        }
      });
  }

  filtrarMascotas(event: any): void {
    const q = String(event?.query ?? '').toLowerCase().trim();
    if (!q) {
      this.mascotasFiltradas = [...this.mascotas];
      return;
    }
    this.mascotasFiltradas = this.mascotas.filter((m: any) =>
      String(m?.nombre ?? '').toLowerCase().includes(q)
    );
  }

  nombreMascota(id: number): string {
    const m: any = this.mascotas.find((x) => x.id === id);
    return m ? (m.nombre ?? `Mascota #${id}`) : `Mascota #${id}`;
  }

  openNew(): void {
    if (!this.canAdd) return;

    this.resetFileSelection();

    const defaultMascota =
      this.lastMascotaId
        ? this.mascotas.find((m) => m.id === this.lastMascotaId) ?? null
        : this.mascotas.length === 1
          ? this.mascotas[0]
          : null;

    this.form.reset({
      mascota: defaultMascota,
      fecha: this.todayISO()
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.dialogVisible = true;
    this.mascotasFiltradas = [...this.mascotas];
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.resetFileSelection();
    this.showFilesError = false;
  }

  pickFiles(): void {
    this.fileInput?.nativeElement?.click();
  }

  private resetFileSelection(): void {
    this.selectedFiles.forEach((sf) => sf.preview && URL.revokeObjectURL(sf.preview));
    this.selectedFiles = [];
    this.showFilesError = false;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      input.value = '';
      return;
    }

    const incoming = Array.from(files);

    if (this.selectedFiles.length + incoming.length > this.MAX_FILES) {
      this.toastWarn(`Máximo ${this.MAX_FILES} imágenes.`, `Ya tienes ${this.selectedFiles.length}.`);
      input.value = '';
      return;
    }

    const valid: SelectedFile[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith('image/')) {
        this.toastWarn('Archivo no válido', `${f.name} no es una imagen.`);
        continue;
      }

      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > this.MAX_FILE_MB) {
        this.toastWarn('Imagen muy pesada', `${f.name} supera ${this.MAX_FILE_MB}MB.`);
        continue;
      }

      valid.push({ file: f, preview: URL.createObjectURL(f) });
    }

    if (valid.length > 0) {
      this.selectedFiles = [...this.selectedFiles, ...valid];
      this.showFilesError = false;
    }

    input.value = '';
  }

  removeFile(index: number): void {
    const sf = this.selectedFiles[index];
    if (sf) URL.revokeObjectURL(sf.preview);
    this.selectedFiles.splice(index, 1);
  }

  clearSelectedFiles(): void {
    this.resetFileSelection();
  }

  save(): void {
    if (!this.canAdd) return;

    this.showFilesError = false;
    this.form.markAllAsTouched();

    const mascotaObj = this.form.value['mascota'] as any;
    const mascotaId = mascotaObj?.id ?? null;
    if (!mascotaId) return;

    if (!this.selectedFiles.length) {
      this.showFilesError = true;
      this.toastWarn('Faltan fotos', 'Selecciona al menos una imagen.');
      return;
    }

    this.lastMascotaId = mascotaId;

    const fecha = this.form.value['fecha'] as string;

    const formData = new FormData();
    formData.append('mascota_id', String(mascotaId));
    formData.append('fecha', fecha);

    this.selectedFiles.forEach((sf) => {
      formData.append('files', sf.file, sf.file.name);
    });

    this.loading = true;

    this.http
      .post<string[]>(this.baseUpload, formData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.dialogVisible = false;
          this.resetFileSelection();

          if (this.isTutor) this.loadFotosTutor();
          if (this.isAdmin) this.loadMascotasAdmin();

          this.toastSuccess('¡Guardado con éxito!', 'Las fotos se subieron correctamente.');
        },
        error: () => {
          this.toastError('No se pudo guardar', 'Verifica tu conexión o el servidor.');
        }
      });
  }

  openDeleteConfirm(row: FotoMascota): void {
    if (!this.canDelete) return;
    if (!row.id) return;
    this.fotoToDelete = row;
    this.confirmVisible = true;
  }

  cancelDelete(): void {
    this.confirmVisible = false;
    this.fotoToDelete = null;
  }

  confirmDelete(): void {
    if (!this.canDelete) return;
    if (!this.fotoToDelete?.id) return;

    this.loading = true;

    this.http
      .delete(`${this.baseFotos}${this.fotoToDelete.id}/`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.confirmVisible = false;
          this.fotoToDelete = null;

          if (this.isAdmin) this.loadMascotasAdmin();
          else if (this.isTutor) this.loadFotosTutor();

          this.toastSuccess('Eliminado', 'La foto fue eliminada correctamente.');
        },
        error: () => {
          this.toastError('Error', 'Ocurrió un error al eliminar la foto.');
        }
      });
  }

  get mascotaCtrl(): AbstractControl | null {
    return this.form.get('mascota');
  }

  get fechaCtrl(): AbstractControl | null {
    return this.form.get('fecha');
  }

  fechaErrorMessage(): string {
    const c = this.fechaCtrl;
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'La fecha es obligatoria.';
    if (c.errors['futureDate']) return 'La fecha no puede ser futura.';
    return 'Fecha inválida.';
  }

  private toastSuccess(summary: string, detail: string) {
    this.msg.add({ severity: 'success', summary, detail });
  }

  private toastError(summary: string, detail: string) {
    this.msg.add({ severity: 'error', summary, detail });
  }

  private toastWarn(summary: string, detail: string) {
    this.msg.add({ severity: 'warn', summary, detail });
  }
}
