import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService, AuthUser } from '../../auth/services/auth.service';

type UserRole = 'ADMIN' | 'TUTOR' | 'ADOPTANTE' | '';

export type SolicitudAdopcionLite = {
  id: number;
  mascota?: number | null;
  perfil_adoptante?: number | null;
  estado?: string | null;
  motivacion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  mascota_nombre?: string | null;
  tutor_email?: string | null;
  adoptante_email?: string | null;
};

export type SeguimientoConfig = {
  id: number;
  solicitud: number;
  activo: boolean;
  modo: 'MANUAL' | 'AUTO';
  frecuencia?: string | null;

  inicio?: string | null;
  proximo_envio?: string | null;

  creado_en?: string | null;
  actualizado_en?: string | null;

  mascota_nombre?: string | null;
  adoptante_email?: string | null;
  tutor_email?: string | null;
  estado_solicitud?: string | null;
};

export type SeguimientoEvidencia = {
  id: number;
  solicitud: number;
  fecha: string;
  obs?: string | null;
  imagen?: string | null;
  imagen_url?: string | null;
  s3_url?: string | null;
};

// ✅ helper: leer rol del JWT si no hay user
function parseJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-snouty-seguimiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
  ],
  templateUrl: './seguimiento.html',
  providers: [MessageService],
})
export class SeguimientoPage implements OnInit {
  user: AuthUser | null = null;
  role: UserRole = '';

  // ✅ loading global real (contador)
  private loadingCount = 0;
  loading = false;

  // ✅ si NO usas proxy, deja absoluto
private API = 'https://snoutyweb.onrender.com/api';

  get isAdmin() { return this.role === 'ADMIN'; }
  get isTutor() { return this.role === 'TUTOR'; }
  get isAdoptante() { return this.role === 'ADOPTANTE'; }

  // =========================
  // ADMIN (lectura)
  // =========================
  adminSolicitudesAprobadas: SolicitudAdopcionLite[] = [];
  adminConfigs: SeguimientoConfig[] = [];
  adminEvidencias: SeguimientoEvidencia[] = [];

  // =========================
  // TUTOR
  // =========================
  tutorSolicitudesAprobadas: SolicitudAdopcionLite[] = [];
  tutorConfigs: SeguimientoConfig[] = [];

  dialogTutorVisible = false;
  selectedTutorSolicitud: SolicitudAdopcionLite | null = null;
  selectedTutorConfig: SeguimientoConfig | null = null;

  tutorEvidenciasSolicitud: SeguimientoEvidencia[] = [];
  formConfig: FormGroup;

  // =========================
  // ADOPTANTE
  // =========================
  adoptanteConfigsIniciadas: SeguimientoConfig[] = [];
  adoptanteSolicitudesAprobadasConSeguimiento: SolicitudAdopcionLite[] = [];

  evidencias: SeguimientoEvidencia[] = [];

  dialogEvidenciaVisible = false;
  selectedAdoptanteSolicitud: SolicitudAdopcionLite | null = null;
  evidenciasDeSolicitud: SeguimientoEvidencia[] = [];

  uploadForm: FormGroup;
  selectedFile: File | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private auth: AuthService,
    private msg: MessageService,
  ) {
    // Tutor config (solicitud bloqueado)
    this.formConfig = this.fb.group({
      solicitud: [{ value: null, disabled: true }, Validators.required],
      activo: [true, Validators.required],
      modo: ['MANUAL', Validators.required],
      frecuencia: [null],
    });

    // Adoptante evidencia
    this.uploadForm = this.fb.group({
      solicitud_id: [{ value: null, disabled: true }, Validators.required],
      fecha: [''],
      obs: [''],
    });
  }

  // =========================
  // Loading helpers
  // =========================
  private startLoading() {
    this.loadingCount += 1;
    this.loading = this.loadingCount > 0;
  }

  private stopLoading() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    this.loading = this.loadingCount > 0;
  }

  // ====================== Toast helpers ======================
  private ok(detail: string) {
    this.msg.add({ severity: 'success', summary: 'OK', detail });
  }
  private err(detail: string) {
    this.msg.add({ severity: 'error', summary: 'Error', detail });
  }

  // ====================== UI Rules ======================
  get modoForm(): 'MANUAL' | 'AUTO' {
    const v = (this.formConfig.get('modo')?.value ?? 'MANUAL') as any;
    return (String(v).toUpperCase() === 'AUTO') ? 'AUTO' : 'MANUAL';
  }

  get configGuardada(): boolean {
    return !!this.selectedTutorConfig?.id;
  }

  // ✅ SOLO habilitar si: existe config + modo manual + iniciado + activo
  canSolicitarEvidenciaManual(): boolean {
    if (!this.selectedTutorConfig) return false;
    if ((this.selectedTutorConfig.modo || '').toUpperCase() !== 'MANUAL') return false;
    if (!this.selectedTutorConfig.activo) return false;
    if (!this.selectedTutorConfig.inicio) return false;
    return true;
  }

  // ==========================================================
  // INIT
  // ==========================================================
  ngOnInit(): void {
    // 1) intenta user desde storage
    this.user = this.auth.getCurrentUser();
    this.role = (this.user?.rol ?? '') as UserRole;

    // 2) fallback: rol desde JWT si user no está cargado
    if (!this.role) {
      const token = this.auth.getAccessToken();
      if (token) {
        const decoded = parseJwt(token);
        const r = (decoded?.rol ?? decoded?.role ?? decoded?.user_role ?? '')
          .toString().trim().toUpperCase();
        if (r === 'ADMIN' || r === 'TUTOR' || r === 'ADOPTANTE') {
          this.role = r as UserRole;
        }
      }
    }

    console.log('[SeguimientoPage] init role=', this.role);

    // 3) Cargar data según rol (ADMIN también)
    if (this.isAdmin) {
      this.loadAdminInicial();
      return;
    }

    if (this.isTutor) {
      this.loadTutorInicial();
      return;
    }

    if (this.isAdoptante) {
      this.loadAdoptanteInicial();
      return;
    }

    // si no hay rol, no debería pasar porque el guard te frena
    this.err('No se pudo identificar tu rol.');
  }

  // ==========================================================
  // ============================ ADMIN =======================
  // ==========================================================
  private loadAdminInicial(): void {
    this.startLoading();
    forkJoin({
      solicitudesAprobadas: this.http.get<SolicitudAdopcionLite[]>(`${this.API}/tutor/seguimientos/solicitudes/`).pipe(
        catchError((e) => {
          console.error('[Admin] solicitudes aprobadas error:', e);
          // no es fatal
          return of([]);
        })
      ),
      configs: this.http.get<SeguimientoConfig[]>(`${this.API}/seguimiento-config/`).pipe(
        catchError((e) => {
          console.error('[Admin] configs error:', e);
          return of([]);
        })
      ),
      evidencias: this.http.get<SeguimientoEvidencia[]>(`${this.API}/seguimientos/evidencias/`).pipe(
        catchError((e) => {
          console.error('[Admin] evidencias error:', e);
          return of([]);
        })
      ),
    })
    .pipe(finalize(() => this.stopLoading()))
    .subscribe(({ solicitudesAprobadas, configs, evidencias }) => {
      this.adminSolicitudesAprobadas = solicitudesAprobadas ?? [];
      this.adminConfigs = (configs ?? []).map(c => ({ ...c, activo: !!c.activo }));
      this.adminEvidencias = evidencias ?? [];
    });
  }

  // ==========================================================
  // ============================ TUTOR =======================
  // ==========================================================
  private loadTutorInicial(): void {
    this.startLoading();
    forkJoin({
      solicitudes: this.http.get<SolicitudAdopcionLite[]>(`${this.API}/tutor/seguimientos/solicitudes/`).pipe(
        catchError((e) => {
          console.error('[Tutor] solicitudes APROBADAS error:', e);
          this.err('No se pudieron cargar solicitudes APROBADAS del tutor.');
          return of([]);
        })
      ),
      configs: this.http.get<SeguimientoConfig[]>(`${this.API}/seguimiento-config/`).pipe(
        catchError((e) => {
          console.error('[Tutor] configs error:', e);
          this.err('No se pudieron cargar configuraciones del tutor.');
          return of([]);
        })
      ),
    })
    .pipe(finalize(() => this.stopLoading()))
    .subscribe(({ solicitudes, configs }) => {
      this.tutorSolicitudesAprobadas = solicitudes ?? [];
      this.tutorConfigs = (configs ?? []).map(c => ({ ...c, activo: !!c.activo }));

      const sid = this.selectedTutorSolicitud?.id ?? null;
      if (sid) {
        this.selectedTutorConfig = this.tutorConfigs.find(c => c.solicitud === sid) ?? this.selectedTutorConfig;
      }
    });
  }

  private loadTutorConfigs(): void {
    this.startLoading();
    this.http.get<SeguimientoConfig[]>(`${this.API}/seguimiento-config/`)
      .pipe(
        finalize(() => this.stopLoading()),
        catchError((e) => {
          console.error('[Tutor] configs error:', e);
          this.err('No se pudieron cargar configuraciones del tutor.');
          return of([]);
        })
      )
      .subscribe((data) => {
        this.tutorConfigs = (data ?? []).map(c => ({ ...c, activo: !!c.activo }));
        const sid = this.selectedTutorSolicitud?.id ?? null;
        if (sid) {
          this.selectedTutorConfig = this.tutorConfigs.find(c => c.solicitud === sid) ?? this.selectedTutorConfig;
        }
      });
  }

  openTutorDialogConfig(s: SolicitudAdopcionLite): void {
    this.selectedTutorSolicitud = s;

    this.selectedTutorConfig = this.tutorConfigs.find(c => c.solicitud === s.id) ?? null;

    this.formConfig.reset({
      solicitud: s.id,
      activo: !!(this.selectedTutorConfig?.activo ?? true),
      modo: this.selectedTutorConfig?.modo ?? 'MANUAL',
      frecuencia: this.selectedTutorConfig?.frecuencia ?? null,
    });
    this.formConfig.get('solicitud')?.disable();

    this.tutorEvidenciasSolicitud = [];
    if (this.selectedTutorConfig?.inicio) {
      this.loadTutorEvidenciasBySolicitud(s.id);
    }

    this.dialogTutorVisible = true;
  }

  closeTutorDialog(): void {
    this.dialogTutorVisible = false;
    this.selectedTutorSolicitud = null;
    this.selectedTutorConfig = null;
    this.tutorEvidenciasSolicitud = [];
    this.formConfig.reset({ solicitud: null, activo: true, modo: 'MANUAL', frecuencia: null });
    this.formConfig.get('solicitud')?.disable();
  }

  guardarTutorConfig(): void {
    if (this.formConfig.invalid) {
      this.err('Completa los campos obligatorios.');
      return;
    }

    if (this.selectedTutorConfig) {
      this.err('Esta solicitud ya tiene configuración. No se puede modificar.');
      return;
    }

    const payload: any = this.formConfig.getRawValue();
    payload.activo = !!payload.activo;

    if ((payload.modo || '').toUpperCase() === 'MANUAL') {
      payload.frecuencia = null;
    }

    this.startLoading();
    this.http.post<SeguimientoConfig>(`${this.API}/seguimiento-config/`, payload)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (created) => {
          this.ok('Configuración creada.');
          this.selectedTutorConfig = { ...created, activo: !!created.activo };
          this.loadTutorConfigs();
        },
        error: (e) => {
          console.error('[Tutor] crear config error:', e);
          const msg =
            e?.error?.detail ||
            e?.error?.solicitud?.[0] ||
            e?.error?.frecuencia?.[0] ||
            'No se pudo crear la configuración.';
          this.err(msg);
        },
      });
  }

  iniciarSeguimientoTutor(): void {
    if (!this.selectedTutorConfig) {
      this.err('Primero guarda la configuración.');
      return;
    }
    if (this.selectedTutorConfig.inicio) {
      this.err('El seguimiento ya fue iniciado.');
      return;
    }

    this.startLoading();
    this.http.post<any>(`${this.API}/seguimiento-config/${this.selectedTutorConfig.id}/iniciar/`, {})
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: (resp) => {
          const newCfg: SeguimientoConfig | null = resp?.config ?? null;
          if (newCfg) this.selectedTutorConfig = { ...newCfg, activo: !!newCfg.activo };

          this.ok('Seguimiento iniciado. Se envió correo al adoptante.');
          this.loadTutorConfigs();

          if (this.selectedTutorSolicitud?.id) {
            this.loadTutorEvidenciasBySolicitud(this.selectedTutorSolicitud.id);
          }
        },
        error: (e) => {
          console.error('[Tutor] iniciar error:', e);
          this.err(e?.error?.detail || 'No se pudo iniciar el seguimiento.');
        },
      });
  }

  solicitarEvidenciaTutor(): void {
    if (!this.selectedTutorConfig) {
      this.err('Primero guarda la configuración.');
      return;
    }
    if ((this.selectedTutorConfig.modo || '').toUpperCase() !== 'MANUAL') {
      this.err('Solo puedes solicitar evidencia si el modo es MANUAL.');
      return;
    }
    if (!this.selectedTutorConfig.activo) {
      this.err('El seguimiento está inactivo.');
      return;
    }
    if (!this.selectedTutorConfig.inicio) {
      this.err('Debes iniciar el seguimiento primero.');
      return;
    }

    this.startLoading();
    this.http.post<any>(`${this.API}/seguimiento-config/${this.selectedTutorConfig.id}/recordatorio-manual/`, {})
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: () => this.ok('Recordatorio manual enviado al adoptante.'),
        error: (e) => {
          console.error('[Tutor] recordatorio manual error:', e);
          this.err(e?.error?.detail || 'No se pudo enviar el recordatorio.');
        },
      });
  }

  private loadTutorEvidenciasBySolicitud(solicitudId: number): void {
    this.startLoading();

    const urlTutor = `${this.API}/tutor/seguimientos/evidencias/`;
    const paramsTutor = new HttpParams().set('solicitud_id', String(solicitudId));

    const urlFallback = `${this.API}/seguimientos/evidencias/`;
    const paramsFallback = new HttpParams().set('solicitud', String(solicitudId));

    this.http.get<SeguimientoEvidencia[]>(urlTutor, { params: paramsTutor }).pipe(
      catchError((e) => {
        if (e?.status === 404) {
          return this.http.get<SeguimientoEvidencia[]>(urlFallback, { params: paramsFallback }).pipe(
            catchError((e2) => {
              console.error('[Tutor] fallback evidencias error:', e2);
              return of([]);
            })
          );
        }

        console.error('[Tutor] evidencias error:', e);
        return of([]);
      }),
      finalize(() => this.stopLoading()),
    )
    .subscribe((data) => {
      this.tutorEvidenciasSolicitud = data ?? [];
    });
  }

  // ==========================================================
  // ========================== ADOPTANTE ======================
  // ==========================================================
  private loadAdoptanteInicial(): void {
    this.startLoading();
    forkJoin({
      configs: this.http.get<SeguimientoConfig[]>(`${this.API}/adoptante/seguimientos/configs/`).pipe(
        catchError((e) => {
          console.error('[Adoptante] configs iniciadas error:', e);
          this.err('No se pudieron cargar tus seguimientos iniciados.');
          return of([]);
        })
      ),
      evidencias: this.http.get<SeguimientoEvidencia[]>(`${this.API}/seguimientos/evidencias/`).pipe(
        catchError((e) => {
          console.error('[Adoptante] evidencias error:', e);
          this.err('No se pudieron cargar tus evidencias.');
          return of([]);
        })
      ),
    })
    .pipe(finalize(() => this.stopLoading()))
    .subscribe(({ configs, evidencias }) => {
      this.adoptanteConfigsIniciadas = (configs ?? []).map(c => ({ ...c, activo: !!c.activo }));
      this.evidencias = evidencias ?? [];

      this.adoptanteSolicitudesAprobadasConSeguimiento = this.adoptanteConfigsIniciadas.map(cfg => ({
        id: cfg.solicitud,
        estado: cfg.estado_solicitud ?? 'APROBADA',
        mascota_nombre: cfg.mascota_nombre ?? null,
        tutor_email: cfg.tutor_email ?? null,
        adoptante_email: cfg.adoptante_email ?? null,
      }));

      const seen = new Set<number>();
      this.adoptanteSolicitudesAprobadasConSeguimiento =
        this.adoptanteSolicitudesAprobadasConSeguimiento.filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });

      const sid = this.selectedAdoptanteSolicitud?.id ?? null;
      if (sid) this.evidenciasDeSolicitud = this.evidencias.filter(ev => ev.solicitud === sid);
    });
  }

  private loadEvidenciasAdoptante(): void {
    this.startLoading();
    this.http.get<SeguimientoEvidencia[]>(`${this.API}/seguimientos/evidencias/`)
      .pipe(
        finalize(() => this.stopLoading()),
        catchError((e) => {
          console.error('[Adoptante] evidencias error:', e);
          this.err('No se pudieron cargar tus evidencias.');
          return of([]);
        })
      )
      .subscribe((data) => {
        this.evidencias = data ?? [];
        const sid = this.selectedAdoptanteSolicitud?.id ?? null;
        if (sid) this.evidenciasDeSolicitud = this.evidencias.filter(ev => ev.solicitud === sid);
      });
  }

  openAdoptanteEvidenciasDialog(s: SolicitudAdopcionLite): void {
    this.selectedAdoptanteSolicitud = s;

    this.uploadForm.reset({
      solicitud_id: s.id,
      fecha: '',
      obs: '',
    });
    this.uploadForm.get('solicitud_id')?.disable();

    this.selectedFile = null;
    this.evidenciasDeSolicitud = this.evidencias.filter(ev => ev.solicitud === s.id);
    this.dialogEvidenciaVisible = true;
  }

  closeAdoptanteEvidenciasDialog(): void {
    this.dialogEvidenciaVisible = false;
    this.selectedAdoptanteSolicitud = null;
    this.evidenciasDeSolicitud = [];
    this.uploadForm.reset({ solicitud_id: null, fecha: '', obs: '' });
    this.uploadForm.get('solicitud_id')?.disable();
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.selectedFile = f;
    input.value = '';
  }

  clearFile(): void {
    this.selectedFile = null;
  }

  enviarEvidenciaAdoptante(): void {
    const sid = this.selectedAdoptanteSolicitud?.id ?? null;
    if (!sid) {
      this.err('No hay solicitud seleccionada.');
      return;
    }
    if (!this.selectedFile) {
      this.err('Selecciona un archivo.');
      return;
    }

    const v = this.uploadForm.getRawValue();
    const fd = new FormData();
    fd.append('solicitud_id', String(sid));
    fd.append('file', this.selectedFile);

    if (v.fecha) fd.append('fecha', v.fecha);
    if (v.obs) fd.append('obs', v.obs);

    this.startLoading();
    this.http.post(`${this.API}/seguimientos/evidencias/upload/`, fd)
      .pipe(finalize(() => this.stopLoading()))
      .subscribe({
        next: () => {
          this.ok('Evidencia enviada. El tutor fue notificado por correo.');
          this.uploadForm.patchValue({ fecha: '', obs: '' });
          this.selectedFile = null;
          this.loadEvidenciasAdoptante();
        },
        error: (e) => {
          console.error('[Adoptante] upload evidencia error:', e);
          const msg = e?.error?.detail
            || e?.error?.fecha?.[0]
            || e?.error?.solicitud?.[0]
            || 'No se pudo enviar evidencia.';
          this.err(msg);
        },
      });
  }

  adoptanteCfgPorSolicitud(solicitudId: number): SeguimientoConfig | null {
    return this.adoptanteConfigsIniciadas.find(c => c.solicitud === solicitudId) ?? null;
  }
}