import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { HistorialMedico } from '../snouty.models';

@Component({
    selector: 'app-snouty-historiales',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DialogModule
    ],
    template: `
    <div class="card">
        <div class="flex justify-content-between align-items-center mb-3">
            <h5 class="m-0">Historiales Médicos</h5>
            <button
                pButton
                type="button"
                label="Nuevo historial"
                icon="pi pi-plus"
                (click)="openNew()"
            ></button>
        </div>

        <p-table
            [value]="historiales"
            [paginator]="true"
            [rows]="10"
            dataKey="id"
            [tableStyle]="{ 'min-width': '50rem' }"
        >
            <ng-template pTemplate="header">
                <tr>
                    <th style="width:5rem">ID</th>
                    <th>Archivo S3</th>
                    <th style="width:8rem">Acciones</th>
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
                <tr>
                    <td>{{ row.id }}</td>
                    <td>{{ row.aws_s3_file || '-' }}</td>
                    <td>
                        <button
                            pButton
                            icon="pi pi-pencil"
                            rounded
                            text
                            severity="secondary"
                            (click)="edit(row)"
                        ></button>
                        <button
                            pButton
                            icon="pi pi-trash"
                            rounded
                            text
                            severity="danger"
                            (click)="openDeleteConfirm(row)"
                        ></button>
                    </td>
                </tr>
            </ng-template>
        </p-table>
    </div>

    <!-- FORM -->
    <p-dialog
        [(visible)]="dialogVisible"
        [modal]="true"
        [closable]="false"
        [draggable]="false"
        [breakpoints]="{ '1200px': '40vw', '960px': '55vw', '640px': '90vw' }"
        [style]="{ width: '32vw', maxWidth: '420px' }"
        [baseZIndex]="10000"
        [dismissableMask]="false"
        [header]="editingId ? 'Editar historial' : 'Nuevo historial'"
    >
        <form
            [formGroup]="form"
            class="p-fluid"
            style="display:flex; flex-direction:column; gap:1rem;"
        >
            <div class="field">
                <label class="font-medium">Archivo en S3 (URL o clave)</label>
                <input
                    pInputText
                    formControlName="aws_s3_file"
                    class="w-full"
                />
            </div>
        </form>

        <div class="flex justify-content-end gap-2 mt-3" style="margin-top:1.5rem;">
            <button
                pButton
                label="Cancelar"
                icon="pi pi-times"
                (click)="closeDialog()"
                class="p-button-text"
                type="button"
            ></button>
            <button
                pButton
                label="Guardar"
                icon="pi pi-check"
                (click)="save()"
                type="button"
            ></button>
        </div>
    </p-dialog>

    <!-- CONFIRM -->
    <p-dialog
        [(visible)]="confirmVisible"
        [modal]="true"
        [closable]="false"
        [draggable]="false"
        [style]="{ width: '360px', maxWidth: '90vw' }"
        [baseZIndex]="11000"
        [dismissableMask]="false"
        header="Confirmar eliminación"
    >
        <div class="flex flex-column gap-3" style="text-align:center;">
            <i class="pi pi-exclamation-triangle" style="font-size:2rem;"></i>
            <p class="m-0">
                ¿Seguro que desea eliminar el historial<br>
                <strong>#{{ historialToDelete?.id }}</strong>?
            </p>
            <small *ngIf="deleteError" class="p-error">
                {{ deleteError }}
            </small>
        </div>

        <div class="flex justify-content-end gap-2 mt-4">
            <button
                pButton
                label="Cancelar"
                icon="pi pi-times"
                class="p-button-text"
                type="button"
                (click)="cancelDelete()"
            ></button>
            <button
                pButton
                label="Eliminar"
                icon="pi pi-trash"
                severity="danger"
                type="button"
                (click)="confirmDelete()"
            ></button>
        </div>
    </p-dialog>
    `
})
export class SnoutyHistorialesPage implements OnInit {
    historiales: HistorialMedico[] = [];
    form: FormGroup;
    dialogVisible = false;
    editingId: number | null = null;

    confirmVisible = false;
    historialToDelete: HistorialMedico | null = null;
    deleteError = '';

    private baseUrl = 'http://127.0.0.1:8000/api/historiales-medicos/';

    constructor(private http: HttpClient, private fb: FormBuilder) {
        this.form = this.fb.group({
            aws_s3_file: [''],
        });
    }

    ngOnInit(): void {
        this.loadHistoriales();
    }

    loadHistoriales() {
        this.http.get<HistorialMedico[]>(this.baseUrl).subscribe({
            next: data => (this.historiales = data),
            error: err => console.error('Error cargando historiales', err)
        });
    }

    openNew() {
        this.editingId = null;
        this.form.reset({
            aws_s3_file: '',
        });
        this.dialogVisible = true;
    }

    edit(row: HistorialMedico) {
        this.editingId = row.id ?? null;
        this.form.patchValue({
            aws_s3_file: row.aws_s3_file || '',
        });
        this.dialogVisible = true;
    }

    closeDialog() {
        this.dialogVisible = false;
    }

    save() {
        const payload: HistorialMedico = {
            aws_s3_file: this.form.value['aws_s3_file'] || null,
        };

        if (this.editingId) {
            this.http.put<HistorialMedico>(`${this.baseUrl}${this.editingId}/`, payload).subscribe({
                next: () => {
                    this.dialogVisible = false;
                    this.loadHistoriales();
                },
                error: err => console.error('Error actualizando historial', err)
            });
        } else {
            this.http.post<HistorialMedico>(this.baseUrl, payload).subscribe({
                next: () => {
                    this.dialogVisible = false;
                    this.loadHistoriales();
                },
                error: err => console.error('Error creando historial', err)
            });
        }
    }

    openDeleteConfirm(row: HistorialMedico) {
        if (!row.id) return;
        this.historialToDelete = row;
        this.deleteError = '';
        this.confirmVisible = true;
    }

    cancelDelete() {
        this.confirmVisible = false;
        this.historialToDelete = null;
        this.deleteError = '';
    }

    confirmDelete() {
        if (!this.historialToDelete?.id) return;

        this.http.delete(`${this.baseUrl}${this.historialToDelete.id}/`).subscribe({
            next: () => {
                this.confirmVisible = false;
                this.historialToDelete = null;
                this.deleteError = '';
                this.loadHistoriales();
            },
            error: err => {
                console.error('Error eliminando historial', err);
                this.deleteError = 'Ocurrió un error al eliminar el historial.';
            }
        });
    }
}
