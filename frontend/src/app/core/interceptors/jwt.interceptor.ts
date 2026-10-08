
import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';

import { inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  catchError,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError
} from 'rxjs';

import { AuthService } from '../../pages/auth/services/auth.service';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const API_BASE = 'https://snoutyweb.onrender.com';

interface RefreshResponse {
  access: string;
  refresh?: string;
}

// Una sola renovación compartida
let refreshRequest$: Observable<string> | null = null;

// ============================================================
// INTERCEPTOR JWT
// ============================================================

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  // ==========================================================
  // IDENTIFICAR PETICIONES DE AUTENTICACIÓN
  // ==========================================================

  const isAuthUrl =
    req.url.includes('/api/token/') ||
    req.url.includes('/api/token/refresh/');

  // ==========================================================
  // IDENTIFICAR API
  // ==========================================================

  const isApi =
    req.url.startsWith('/api/') ||
    req.url.startsWith('http://127.0.0.1:8000/api/') ||
    req.url.startsWith('http://localhost:8000/api/') ||
    req.url.startsWith(`${API_BASE}/api/`);

  // ==========================================================
  // ADJUNTAR ACCESS TOKEN
  // ==========================================================

  const token = authService.getAccessToken();

  const authReq =
    token && isApi && !isAuthUrl
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      : req;

  // ==========================================================
  // EJECUTAR PETICIÓN
  // ==========================================================

  return next(authReq).pipe(

    catchError((error: HttpErrorResponse) => {

      if (
        error.status !== 401 ||
        !isApi ||
        isAuthUrl
      ) {
        return throwError(() => error);
      }

      // ======================================================
      // COMPROBAR SI LA PETICIÓN USÓ UN TOKEN ANTIGUO
      // ======================================================

      const currentToken = authService.getAccessToken();

      if (
        token &&
        currentToken &&
        token !== currentToken
      ) {
        return next(
          req.clone({
            setHeaders: {
              Authorization: `Bearer ${currentToken}`
            }
          })
        );
      }

      // ======================================================
      // OBTENER REFRESH TOKEN
      // ======================================================

      const refreshToken = authService.getRefreshToken();

      if (!refreshToken) {

        authService.clearSession();

        router.navigate(['/auth/login']);

        return throwError(() => error);
      }

      // ======================================================
      // CREAR UNA SOLA RENOVACIÓN PARA TODAS LAS PETICIONES
      // ======================================================

      if (!refreshRequest$) {

        refreshRequest$ = http.post<RefreshResponse>(
          `${API_BASE}/api/token/refresh/`,
          {
            refresh: refreshToken
          }
        ).pipe(

          switchMap((response) => {

            if (!response.access) {
              return throwError(
                () => new Error(
                  'No se recibió un nuevo access token.'
                )
              );
            }

            // Actualizar token de acceso
            authService.setAccessToken(response.access);

            // Actualizar refresh token rotado
            if (response.refresh) {
              authService.setRefreshToken(response.refresh);
            }

            return new Observable<string>((observer) => {
              observer.next(response.access);
              observer.complete();
            });
          }),

          catchError((refreshError) => {

            console.error(
              'Error renovando sesión:',
              refreshError
            );

            // Si el usuario ya inició otra sesión,
            // no borrar los tokens nuevos.
            if (
              authService.getRefreshToken() === refreshToken
            ) {
              authService.clearSession();
              router.navigate(['/auth/login']);
            }

            return throwError(() => refreshError);
          }),

          finalize(() => {
            refreshRequest$ = null;
          }),

          shareReplay({
            bufferSize: 1,
            refCount: false
          })
        );
      }

      // ======================================================
      // ESPERAR LA RENOVACIÓN Y REPETIR LA PETICIÓN
      // ======================================================

      return refreshRequest$.pipe(

        switchMap((newAccessToken) => {

          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`
            }
          });

          return next(retryReq);
        })
      );
    })
  );
};
