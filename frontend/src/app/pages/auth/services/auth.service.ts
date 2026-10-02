import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, throwError } from 'rxjs';
import { Router } from '@angular/router';

export type UserRole = 'ADMIN' | 'TUTOR' | 'ADOPTANTE' | null;

export interface AuthUser {
  id: number;
  email: string;
  rol: UserRole;
  nombres: string;
  apellidos: string;

  foto_perfil_s3?: string | null;
  foto_perfil_url?: string | null;

  is_active?: boolean;
  is_staff?: boolean;
}

type LoginResponse = {
  access: string;
  refresh: string;
  rol?: string | null;
  role?: string | null;
  id?: number;
  user_id?: number;
  email?: string;
  nombres?: string | null;
  apellidos?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000';

  private readonly ACCESS_KEY = 'snouty_access_token';
  private readonly REFRESH_KEY = 'snouty_refresh_token';
  private readonly USER_KEY = 'snouty_current_user';
  private readonly USER_KEY_COMPAT = 'snouty_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const stored =
      localStorage.getItem(this.USER_KEY) ||
      localStorage.getItem(this.USER_KEY_COMPAT);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.currentUserSubject.next(parsed);
      } catch {
        this.currentUserSubject.next(null);
      }
    }
  }

  // -------------------------------
  // helpers
  // -------------------------------
  private normalizeRole(role: any): UserRole {
    const r = (role ?? '').toString().trim().toUpperCase();
    if (r === 'ADMIN') return 'ADMIN';
    if (r === 'TUTOR') return 'TUTOR';
    if (r === 'ADOPTANTE') return 'ADOPTANTE';
    return null;
  }

  private getRoleFromJwt(token: string): UserRole {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(json);
      return this.normalizeRole(data?.rol ?? data?.role ?? null);
    } catch {
      return null;
    }
  }

  private normalizeUser(raw: any): AuthUser {
    return {
      id: Number(raw?.id ?? raw?.user_id ?? 0),
      email: String(raw?.email ?? ''),
      rol: this.normalizeRole(raw?.rol ?? raw?.role ?? null),
      nombres: String(raw?.nombres ?? ''),
      apellidos: String(raw?.apellidos ?? ''),
    };
  }

  // -------------------------------
  // LOGIN
  // -------------------------------
  login(email: string, password: string): Observable<AuthUser> {
    const body = {
      email: email.trim().toLowerCase(),
      password,
    };

    return this.http.post<LoginResponse>(`${this.apiUrl}/api/token/`, body).pipe(
      map((res) => {
        let user = this.normalizeUser(res);

        // ✅ si el backend no manda rol → leerlo del JWT
        if (!user.rol && res.access) {
          const jwtRole = this.getRoleFromJwt(res.access);
          if (jwtRole) user.rol = jwtRole;
        }

        this.saveSession(res, user);
        return user;
      }),
      catchError(() => throwError(() => new Error('Credenciales incorrectas'))),
    );
  }

  private saveSession(res: LoginResponse, user: AuthUser): void {
    localStorage.setItem(this.ACCESS_KEY, res.access);
    localStorage.setItem(this.REFRESH_KEY, res.refresh);

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.USER_KEY_COMPAT, JSON.stringify(user));

    this.currentUserSubject.next(user);
  }

  // -------------------------------
  // TOKENS (CLAVE)
  // -------------------------------
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_KEY, token);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_KEY, token);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  // -------------------------------
  // ROLES
  // -------------------------------
  hasRole(expectedRoles: Array<'ADMIN' | 'TUTOR' | 'ADOPTANTE'>): boolean {
    let rol = this.currentUserSubject.value?.rol ?? null;

    if (!rol) {
      const stored =
        localStorage.getItem(this.USER_KEY) ||
        localStorage.getItem(this.USER_KEY_COMPAT);
      if (stored) {
        try {
          rol = JSON.parse(stored)?.rol ?? null;
        } catch {}
      }
    }

    const r = (rol ?? '').toString().toUpperCase();
    return expectedRoles.includes(r as any);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  // -------------------------------
  // LOGOUT / CLEAR
  // -------------------------------
  logout(silent = false): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.USER_KEY_COMPAT);

    this.currentUserSubject.next(null);

    if (!silent) {
      this.router.navigate(['/auth/login']);
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.USER_KEY_COMPAT);
    this.currentUserSubject.next(null);
  }
}