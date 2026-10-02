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

import { AuthService, AuthUser } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
  ],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = String(this.f['email'].value || '').trim();
    const password = String(this.f['password'].value || '');

    this.loading = true;

    // ✅ evita quedarse con rol/token anterior
    this.authService.clearSession();

    this.authService.login(email, password).subscribe({
      next: (user: AuthUser) => {
        this.loading = false;

        const rol = (user.rol ?? '').toString().toUpperCase();

        // ✅ IMPORTANTE: ya no existe /dashboard, ahora es /reportes
        if (rol === 'ADMIN') {
          this.router.navigate(['/reportes']);
        } else if (rol === 'TUTOR') {
          this.router.navigate(['/snouty/mascotas']);
        } else if (rol === 'ADOPTANTE') {
          this.router.navigate(['/mascotas-disponibles']);
        } else {
          // fallback seguro
          this.router.navigate(['/reportes']);
        }
      },
      error: (err) => {
        console.error('Error login:', err);
        this.loading = false;
        this.error = err?.message || 'Credenciales incorrectas.';
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  goToForgot(): void {
    this.router.navigate(['/auth/forgot']);
  }
}