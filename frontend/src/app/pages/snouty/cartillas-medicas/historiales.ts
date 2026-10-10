import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
                *ngIf="isAdmin"
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
                    <th style="width:10rem">Acciones</th>
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
                <tr>
                    <td>{{ row.id }}</td>
                    <td>{{ row.aws_s3_file || '-' }}</td>
                    <td>
                        <button
                            pButton
                            type="button"
                            icon="pi pi-eye"
                            rounded
                            text
                            severity="info"
                            title="Ver historial"
                            (click)="view(row)"
                        ></button>
                        <ng-container *ngIf="isAdmin">
                            <button
                                pButton
                                type="button"
                                icon="pi pi-pencil"
                                rounded
                                text
                                severity="secondary"
                                title="Editar historial"
                                (click)="edit(row)"
                            ></button>
                            <button
                                pButton
                                type="button"
                                icon="pi pi-trash"
                                rounded
                                text
                                severity="danger"
                                title="Eliminar historial"
                                (click)="openDeleteConfirm(row)"
                            ></button>
                        </ng-container>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
                <tr><td colspan="3" class="text-center">No hay historiales médicos registrados.</td></tr>
            </ng-template>
        </p-table>
    </div>

    <!-- CONSULTA / CREACIÓN / EDICIÓN -->
    <p-dialog
        [(visible)]="dialogVisible"
        [modal]="true"
        [closable]="false"
        [draggable]="false"
        [breakpoints]="{ '1200px': '40vw', '960px': '55vw', '640px': '90vw' }"
        [style]="{ width: '32vw', maxWidth: '420px' }"
        [baseZIndex]="10000"
        [dismissableMask]="false"
        [header]="readOnlyMode ? 'Ver historial médico' : (editingId ? 'Editar historial' : 'Nuevo historial')"
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
                [label]="readOnlyMode ? 'Cerrar' : 'Cancelar'"
                icon="pi pi-times"
                (click)="closeDialog()"
                class="p-button-text"
                type="button"
            ></button>
            <button
                *ngIf="isAdmin && !readOnlyMode"
                pButton
                label="Guardar"
                icon="pi pi-check"
                (click)="save()"
                type="button"
            ></button>
        </div>
    </p-dialog>

    <!-- ELIMINAR: SOLO ADMIN -->
    <p-dialog
        *ngIf="isAdmin"
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
                ¿Seguro que desea eliminar el historial<br />
                <strong>#{{ historialToDelete?.id }}</strong>?
            </p>
            <small *ngIf="deleteError" class="p-error">{{ deleteError }}</small>
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
    readOnlyMode = false;

    confirmVisible = false;
    historialToDelete: HistorialMedico | null = null;
    deleteError = '';

    private baseUrl = 'https://snoutyweb.onrender.com/api/historiales-medicos/';

    constructor(private http: HttpClient, private fb: FormBuilder) {
        this.form = this.fb.group({
            aws_s3_file: ['']
        });
    }

    // Mismas claves que utiliza AuthService para el usuario autenticado.
    // El backend continúa siendo quien aplica los permisos de seguridad.
    get isAdmin(): boolean {
        try {
            const stored = localStorage.getItem('snouty_current_user')
                || localStorage.getItem('snouty_user');
            if (!stored) return false;
            const rol = JSON.parse(stored)?.rol;
            return String(rol ?? '').trim().toUpperCase() === 'ADMIN';
        } catch {
            return false;
        }
    }

    ngOnInit(): void {
        this.loadHistoriales();
    }

    loadHistoriales(): void {
        this.http.get<HistorialMedico[]>(this.baseUrl).subscribe({
            next: data => (this.historiales = data || []),
            error: err => console.error('Error cargando historiales', err)
        });
    }

    openNew(): void {
        if (!this.isAdmin) return;

        this.readOnlyMode = false;
        this.editingId = null;
        this.form.enable({ emitEvent: false });
        this.form.reset({ aws_s3_file: '' });
        this.dialogVisible = true;
    }

    private loadRowIntoForm(row: HistorialMedico): void {
        this.editingId = row.id ?? null;
        this.form.enable({ emitEvent: false });
        this.form.reset({ aws_s3_file: row.aws_s3_file || '' });
    }

    view(row: HistorialMedico): void {
        this.readOnlyMode = true;
        this.loadRowIntoForm(row);
        this.form.disable({ emitEvent: false });
        this.dialogVisible = true;
    }

    edit(row: HistorialMedico): void {
        if (!this.isAdmin) return;

        this.readOnlyMode = false;
        this.loadRowIntoForm(row);
        this.dialogVisible = true;
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    save(): void {
        if (!this.isAdmin || this.readOnlyMode) return;

        const payload: HistorialMedico = {
            aws_s3_file: this.form.getRawValue()['aws_s3_file'] || null
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

    openDeleteConfirm(row: HistorialMedico): void {
        if (!this.isAdmin || !row.id) return;
        this.historialToDelete = row;
        this.deleteError = '';
        this.confirmVisible = true;
    }

    cancelDelete(): void {
        this.confirmVisible = false;
        this.historialToDelete = null;
        this.deleteError = '';
    }

    confirmDelete(): void {
        if (!this.isAdmin || !this.historialToDelete?.id) return;

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
