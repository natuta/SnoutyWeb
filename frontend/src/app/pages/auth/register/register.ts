import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { StepsModule } from 'primeng/steps';

const API_URL = 'https://snoutyweb.onrender.com/api';
type RolRegistro = 'TUTOR' | 'ADOPTANTE' | '';
type Sexo = '' | 'M' | 'F';

type FileRule = {
  maxBytes: number;
  acceptMime: string[];
  label: string;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    HttpClientModule,

    InputTextModule,
    ButtonModule,
    CheckboxModule,
    RadioButtonModule,
    ToastModule,
    StepsModule,
  ],
  templateUrl: './register.html',
  providers: [MessageService],
  styles: [
    `
    .auth-bg{
      min-height: 100vh;
      background-image: url('https://images.unsplash.com/photo-1450778869180-41d0601e046e?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cGVycm9zJTIweSUyMGdhdG9zfGVufDB8fDB8fHww');
      background-size: cover;
      background-position: center;
      display:flex;
      align-items:center;
      justify-content:center;
      padding: 2rem 1rem;
      position: relative;
    }
    .auth-bg::before{
      content:'';
      position:absolute;
      inset:0;
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(2px);
    }
    .auth-card{
      position:relative;
      width: min(980px, 100%);
      border-radius: 18px;
      background: rgba(255,255,255,.20);
      border: 1px solid rgba(255,255,255,.20);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
      overflow:hidden;
    }
    .auth-card__header{
      padding: 1.25rem 1.25rem .75rem;
      text-align:center;
      color:#fff;
    }
    .auth-card__title{ margin:0; font-size: 2rem; font-weight: 800; }
    .auth-card__subtitle{ margin:.35rem 0 0; opacity:.9; }

    .auth-card__body{ padding: 1rem 1.25rem 1.25rem; }

    .section{
      background: rgba(255,255,255,.18);
      border: 1px solid rgba(255,255,255,.22);
      border-radius: 14px;
      padding: 1rem;
      margin-top: 1rem;
      color:#fff;
    }
    .section h4{ margin:0 0 .75rem; font-weight:800; }

    .grid-2{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: .85rem;
    }
    @media (max-width: 860px){
      .grid-2{ grid-template-columns: 1fr; }
    }

    .field label{ display:block; font-weight: 700; margin-bottom: .35rem; }
    .p-inputtext{ width:100%; background: rgba(255,255,255,.92) !important; }
    .hint{ font-size: .82rem; opacity:.9; margin-top:.25rem; }
    .p-error{ color: #ffd0d0; font-weight: 600; display:block; margin-top: .35rem; }

    .role-row{
      display:flex;
      gap: 1rem;
      justify-content:center;
      flex-wrap:wrap;
      margin-top: .5rem;
    }
    .role-pill{
      display:flex;
      align-items:center;
      gap:.55rem;
      background: rgba(255,255,255,.18);
      border: 1px solid rgba(255,255,255,.22);
      padding: .55rem .85rem;
      border-radius: 999px;
      cursor:pointer;
      user-select:none;
    }
    .role-pill.active{
      outline: 2px solid rgba(255,255,255,.75);
      box-shadow: 0 10px 24px rgba(0,0,0,.18);
    }

    .doc-grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: .85rem;
      margin-top: .75rem;
    }
    @media (max-width: 860px){
      .doc-grid{ grid-template-columns: 1fr; }
    }
    .doc-card{
      background: rgba(255,255,255,.16);
      border: 1px solid rgba(255,255,255,.22);
      border-radius: 14px;
      padding: .85rem;
      display:flex;
      flex-direction:column;
      gap: .65rem;
    }
    .doc-head{ display:flex; justify-content:space-between; align-items:center; gap: .75rem; }
    .doc-title{ font-weight: 800; margin:0; line-height:1.1; }
    .doc-sub{ opacity:.9; font-size:.85rem; }
    .doc-body{ display:flex; gap:.75rem; align-items:center; }
    .thumb{
      width: 74px; height: 74px; border-radius: 12px;
      border: 1px dashed rgba(255,255,255,.55);
      display:flex; align-items:center; justify-content:center;
      overflow:hidden; flex: 0 0 auto; background: rgba(0,0,0,.08);
    }
    .thumb img{ width:100%; height:100%; object-fit:cover; }
    .doc-meta{ flex:1; min-width:0; }
    .doc-name{ font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .actions{ display:flex; gap:.5rem; justify-content:flex-end; flex-wrap:wrap; }

    .wizard-actions{
      display:flex; gap:.75rem; justify-content:space-between;
      margin-top: 1rem; flex-wrap:wrap;
    }
    `
  ],
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;

  step = 0;
  steps = [{ label: 'Cuenta' }, { label: 'Perfil' }, { label: 'Documentos' }];

  rol: RolRegistro = '';
  showRolError = false;

  // archivos
  fotoPerfilFile: File | null = null;
  reciboLuzFile: File | null = null;
  ciDocFile: File | null = null;
  garanteFile: File | null = null;
  fachadaFile: File | null = null;
  domicilioFile: File | null = null;
  croquisFile: File | null = null;

  // ui
  fotoPerfilName = ''; fotoPerfilPreview: string | null = null;
  reciboLuzName = ''; reciboLuzPreview: string | null = null;
  ciDocName = ''; ciDocPreview: string | null = null;
  garanteName = ''; garantePreview: string | null = null;
  fachadaName = ''; fachadaPreview: string | null = null;
  domicilioName = ''; domicilioPreview: string | null = null;
  croquisName = ''; croquisPreview: string | null = null;

  // flags
  showFotoPerfilError = false;
  showReciboLuzError = false;
  showCiDocError = false;
  showGaranteError = false;
  showFachadaError = false;
  showDomicilioError = false;
  showCroquisError = false;

  private FILE_MAX = 5 * 1024 * 1024; // 5MB
  private RULE_IMG: FileRule = {
    maxBytes: this.FILE_MAX,
    acceptMime: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'Imagen (JPG/PNG/WEBP)',
  };
  private RULE_DOC: FileRule = {
    maxBytes: this.FILE_MAX,
    acceptMime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    label: 'Documento (PDF o Imagen)',
  };

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      rol: ['' as RolRegistro, [Validators.required]],

      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', [Validators.required, Validators.minLength(8), this.strongPasswordValidator]],
      nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), this.namesValidator]],
      apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), this.namesValidator]],
      telefono: ['', [Validators.required, Validators.maxLength(20), this.phoneValidator]],

      nit: [''],

      ci: [''],
      tiene_patio: [false],
      ocupacion: [''],
      direccion: [''],
      edad: [null],
      sexo: ['' as Sexo],
    });
  }

  get f() { return this.form.controls; }

  // ===== validators
  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const v = String(control.value || '');
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v) ? null : { weakPassword: true };
  }
  private namesValidator(control: AbstractControl): ValidationErrors | null {
    const v = String(control.value || '').trim();
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(v) ? null : { invalidName: true };
  }
  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const v = String(control.value || '').trim();
    const digits = v.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return { invalidPhone: true };
    return /^[+\d][\d\s-]+$/.test(v) ? null : { invalidPhone: true };
  }
  private nitValidator(control: AbstractControl): ValidationErrors | null {
    const v = String(control.value || '').trim();
    return /^\d{7,15}$/.test(v) ? null : { invalidNit: true };
  }
  private ciValidator(control: AbstractControl): ValidationErrors | null {
    const v = String(control.value || '').trim();
    return /^[0-9]{5,12}[A-Za-z0-9]{0,4}$/.test(v) ? null : { invalidCi: true };
  }

  // ===== pretty errors
  isInvalid(name: string): boolean {
    const c = this.f[name];
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  errorText(name: string): string {
    const c = this.f[name];
    if (!c?.errors) return '';
    const e = c.errors;

    if (e['required']) return 'Este campo es obligatorio.';
    if (e['email']) return 'Correo inválido. Ej: usuario@gmail.com';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres.`;
    if (e['weakPassword']) return 'Usa 8+ caracteres con MAYÚSCULA, minúscula y número.';
    if (e['invalidName']) return 'Solo letras y espacios (sin símbolos raros).';
    if (e['invalidPhone']) return 'Teléfono inválido. Ej: +591 70000000';
    if (e['invalidNit']) return 'NIT inválido (solo números, 7 a 15 dígitos).';
    if (e['invalidCi']) return 'CI inválido. Ej: 1234567LP';
    if (e['min']) return `Debe ser mayor o igual a ${e['min'].min}.`;
    if (e['max']) return `Debe ser menor o igual a ${e['max'].max}.`;

    return 'Valor inválido.';
  }

  // ===== toast
  private toastSuccess(detail: string) {
    this.messageService.add({ severity: 'success', summary: 'Listo ✅', detail, life: 3000 });
  }
  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Ups…', detail, life: 4500 });
  }
  private toastWarn(detail: string) {
    this.messageService.add({ severity: 'warn', summary: 'Atención', detail, life: 4500 });
  }

  // ===== previews
  private isImage(file: File | null) { return !!file && file.type.startsWith('image/'); }
  private setPreview(file: File | null, setter: (v: string | null) => void) {
    if (!file || !this.isImage(file)) return setter(null);
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  }

  // ===== file validation
  private validateFile(file: File | null, rule: FileRule): boolean {
    if (!file) return false;
    if (!rule.acceptMime.includes(file.type)) {
      this.toastWarn(`Archivo inválido. Se permite: ${rule.label}`);
      return false;
    }
    if (file.size > rule.maxBytes) {
      const mb = (rule.maxBytes / (1024 * 1024)).toFixed(0);
      this.toastWarn(`Archivo muy pesado. Máximo permitido: ${mb}MB`);
      return false;
    }
    return true;
  }

  // ===== role
  setRol(value: Exclude<RolRegistro, ''>) {
    this.rol = value;
    this.form.patchValue({ rol: value });
    this.showRolError = false;

    this.f['nit'].clearValidators();
    this.f['ci'].clearValidators();
    this.f['ocupacion'].clearValidators();
    this.f['direccion'].clearValidators();
    this.f['edad'].clearValidators();
    this.f['sexo'].clearValidators();

    if (value === 'TUTOR') {
      this.f['nit'].setValidators([Validators.required, this.nitValidator]);

      this.f['ci'].setValue('');
      this.f['tiene_patio'].setValue(false);
      this.f['ocupacion'].setValue('');
      this.f['direccion'].setValue('');
      this.f['edad'].setValue(null);
      this.f['sexo'].setValue('');

      this.clearAllAdoptanteFiles();
    }

    if (value === 'ADOPTANTE') {
      this.f['ci'].setValidators([Validators.required, this.ciValidator]);
      this.f['ocupacion'].setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(120)]);
      this.f['direccion'].setValidators([Validators.required, Validators.minLength(5), Validators.maxLength(220)]);
      this.f['edad'].setValidators([Validators.required, Validators.min(18), Validators.max(120)]);
      this.f['sexo'].setValidators([Validators.required]);

      this.f['nit'].setValue('');
    }

    ['nit', 'ci', 'ocupacion', 'direccion', 'edad', 'sexo'].forEach((k) => {
      this.f[k].updateValueAndValidity();
      this.f[k].markAsUntouched();
    });
  }

  // ===== file handlers
  onFotoPerfilSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_IMG)) { input.value = ''; return; }
    this.fotoPerfilFile = file;
    this.fotoPerfilName = file?.name ?? '';
    this.showFotoPerfilError = false;
    this.setPreview(file, (v) => (this.fotoPerfilPreview = v));
  }
  onReciboLuzSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_DOC)) { input.value = ''; return; }
    this.reciboLuzFile = file;
    this.reciboLuzName = file?.name ?? '';
    this.showReciboLuzError = false;
    this.setPreview(file, (v) => (this.reciboLuzPreview = v));
  }
  onCiDocSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_DOC)) { input.value = ''; return; }
    this.ciDocFile = file;
    this.ciDocName = file?.name ?? '';
    this.showCiDocError = false;
    this.setPreview(file, (v) => (this.ciDocPreview = v));
  }
  onGaranteSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_DOC)) { input.value = ''; return; }
    this.garanteFile = file;
    this.garanteName = file?.name ?? '';
    this.showGaranteError = false;
    this.setPreview(file, (v) => (this.garantePreview = v));
  }
  onFachadaSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_DOC)) { input.value = ''; return; }
    this.fachadaFile = file;
    this.fachadaName = file?.name ?? '';
    this.showFachadaError = false;
    this.setPreview(file, (v) => (this.fachadaPreview = v));
  }
  onDomicilioSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_DOC)) { input.value = ''; return; }
    this.domicilioFile = file;
    this.domicilioName = file?.name ?? '';
    this.showDomicilioError = false;
    this.setPreview(file, (v) => (this.domicilioPreview = v));
  }
  onCroquisSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.validateFile(file, this.RULE_DOC)) { input.value = ''; return; }
    this.croquisFile = file;
    this.croquisName = file?.name ?? '';
    this.showCroquisError = false;
    this.setPreview(file, (v) => (this.croquisPreview = v));
  }

  // ===== clear files
  clearFotoPerfil(input: HTMLInputElement) {
    input.value = '';
    this.fotoPerfilFile = null; this.fotoPerfilName = ''; this.fotoPerfilPreview = null;
  }
  clearRecibo(input: HTMLInputElement) {
    input.value = '';
    this.reciboLuzFile = null; this.reciboLuzName = ''; this.reciboLuzPreview = null;
  }
  clearCiDoc(input: HTMLInputElement) {
    input.value = '';
    this.ciDocFile = null; this.ciDocName = ''; this.ciDocPreview = null;
  }
  clearGarante(input: HTMLInputElement) {
    input.value = '';
    this.garanteFile = null; this.garanteName = ''; this.garantePreview = null;
  }
  clearFachada(input: HTMLInputElement) {
    input.value = '';
    this.fachadaFile = null; this.fachadaName = ''; this.fachadaPreview = null;
  }
  clearDomicilio(input: HTMLInputElement) {
    input.value = '';
    this.domicilioFile = null; this.domicilioName = ''; this.domicilioPreview = null;
  }
  clearCroquis(input: HTMLInputElement) {
    input.value = '';
    this.croquisFile = null; this.croquisName = ''; this.croquisPreview = null;
  }

  private clearAllAdoptanteFiles() {
    this.reciboLuzFile = null; this.reciboLuzName = ''; this.reciboLuzPreview = null;
    this.ciDocFile = null; this.ciDocName = ''; this.ciDocPreview = null;
    this.garanteFile = null; this.garanteName = ''; this.garantePreview = null;
    this.fachadaFile = null; this.fachadaName = ''; this.fachadaPreview = null;
    this.domicilioFile = null; this.domicilioName = ''; this.domicilioPreview = null;
    this.croquisFile = null; this.croquisName = ''; this.croquisPreview = null;

    this.showReciboLuzError = false;
    this.showCiDocError = false;
    this.showGaranteError = false;
    this.showFachadaError = false;
    this.showDomicilioError = false;
    this.showCroquisError = false;
  }

  // ===== validate files per role
  private validateFiles(): boolean {
    this.showFotoPerfilError = !this.fotoPerfilFile;

    if (this.rol === 'ADOPTANTE') {
      this.showReciboLuzError = !this.reciboLuzFile;
      this.showCiDocError = !this.ciDocFile;
      this.showGaranteError = !this.garanteFile;
      this.showFachadaError = !this.fachadaFile;
      this.showDomicilioError = !this.domicilioFile;
      this.showCroquisError = !this.croquisFile;

      return !(
        this.showFotoPerfilError ||
        this.showReciboLuzError ||
        this.showCiDocError ||
        this.showGaranteError ||
        this.showFachadaError ||
        this.showDomicilioError ||
        this.showCroquisError
      );
    }

    return !this.showFotoPerfilError;
  }

  // ===== wizard validation
  private validateStep(step: number): boolean {
    const rol = this.form.value.rol as RolRegistro;
    if (!rol) {
      this.showRolError = true;
      this.toastWarn('Selecciona un rol (Tutor o Adoptante).');
      return false;
    }
    this.rol = rol;

    if (step === 0) {
      ['email', 'password'].forEach((k) => this.f[k].markAsTouched());
      if (this.f['email'].invalid || this.f['password'].invalid) {
        this.toastError('Revisa tu correo y contraseña.');
        return false;
      }
      return true;
    }

    if (step === 1) {
      const base = ['nombres', 'apellidos', 'telefono'];
      base.forEach((k) => this.f[k].markAsTouched());

      const roleKeys = rol === 'TUTOR'
        ? ['nit']
        : ['ci', 'ocupacion', 'direccion', 'edad', 'sexo'];

      roleKeys.forEach((k) => this.f[k].markAsTouched());

      const all = [...base, ...roleKeys];
      if (all.some((k) => this.f[k].invalid)) {
        this.toastError('Faltan datos del perfil o hay campos inválidos.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const ok = this.validateFiles();
      if (!ok) this.toastError('Faltan documentos obligatorios.');
      return ok;
    }

    return true;
  }

  nextStep() {
    if (!this.validateStep(this.step)) return;
    if (this.step < 2) this.step++;
  }

  prevStep() {
    if (this.step > 0) this.step--;
  }

  // ===== SUBMIT FINAL
  onSubmitFinal() {
    for (let s = 0; s <= 2; s++) {
      if (!this.validateStep(s)) { this.step = s; return; }
    }

    this.loading = true;
    const rol = this.form.value.rol as RolRegistro;
    this.rol = rol;

    const fd = new FormData();
    fd.append('email', String(this.form.value.email || '').trim().toLowerCase());
    fd.append('password', String(this.form.value.password || ''));
    fd.append('rol', rol);
    fd.append('nombres', String(this.form.value.nombres || '').trim());
    fd.append('apellidos', String(this.form.value.apellidos || '').trim());
    fd.append('telefono', String(this.form.value.telefono || '').trim());

    fd.append('foto_perfil_file', this.fotoPerfilFile as File);

    if (rol === 'TUTOR') {
      fd.append('nit', String(this.form.value.nit || '').trim());
    } else {
      fd.append('ci', String(this.form.value.ci || '').trim());
      fd.append('tiene_patio', String(!!this.form.value.tiene_patio));
      fd.append('ocupacion', String(this.form.value.ocupacion || '').trim());
      fd.append('direccion', String(this.form.value.direccion || '').trim());
      fd.append('edad', String(this.form.value.edad ?? ''));
      fd.append('sexo', String(this.form.value.sexo || '').trim());

      fd.append('recibo_luz_file', this.reciboLuzFile as File);
      fd.append('ci_file', this.ciDocFile as File);
      fd.append('garante_file', this.garanteFile as File);
      fd.append('fachada_file', this.fachadaFile as File);
      fd.append('domicilio_file', this.domicilioFile as File);
      fd.append('croquis_file', this.croquisFile as File);
    }

    this.http.post(`${API_URL}/registro/`, fd)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastSuccess('Cuenta creada correctamente. Ahora puedes iniciar sesión.');
          setTimeout(() => this.router.navigate(['/auth/login']), 1200);
        },
        error: (err) => {
          const data = err?.error;
          const msg =
            data?.detail ||
            data?.email?.[0] ||
            data?.password?.[0] ||
            data?.rol?.[0] ||
            data?.nombres?.[0] ||
            data?.apellidos?.[0] ||
            data?.telefono?.[0] ||
            data?.nit?.[0] ||
            data?.ci?.[0] ||
            data?.ocupacion?.[0] ||
            data?.direccion?.[0] ||
            data?.edad?.[0] ||
            data?.sexo?.[0] ||
            data?.foto_perfil_file?.[0] ||
            data?.recibo_luz_file?.[0] ||
            data?.ci_file?.[0] ||
            data?.garante_file?.[0] ||
            data?.fachada_file?.[0] ||
            data?.domicilio_file?.[0] ||
            data?.croquis_file?.[0] ||
            'No se pudo completar el registro. Verifica los datos.';
          this.toastError(msg);
        },
      });
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
