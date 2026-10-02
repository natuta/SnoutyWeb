// src/app/pages/auth/forgot-password/forgot-password.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  templateUrl: './forgot-password.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
  ],
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  error = '';
  message = '';

  /**
   * ✅ URL REAL del password reset nativo de Django
   * (habilitada en urls.py con auth_views)
   */
  passwordResetUrl = 'http://127.0.0.1:8000/accounts/password_reset/';

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.error = '';
    this.message = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched(); // ✅ muestra errores
      this.error = 'Ingresa un correo válido.';
      return;
    }

    // El email se ingresará nuevamente en el formulario de Django.
    // Angular solo redirige.
    const email = String(this.form.value.email || '').trim().toLowerCase();
    console.log('Solicitud de recuperación para:', email);

    window.open(this.passwordResetUrl, '_blank');

    this.message = 'Se abrió la página de recuperación de contraseña.';
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
