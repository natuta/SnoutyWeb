import {
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpClient,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, throwError, switchMap } from 'rxjs';

import { AuthService } from '../../pages/auth/services/auth.service';

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

const API_BASE = 'https://snoutyweb.onrender.com';

function enqueue(cb: (token: string | null) => void) {
  queue.push(cb);
}

function flush(token: string | null) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const isAuthUrl =
    req.url.includes('/api/token/') ||
    req.url.includes('/api/token/refresh/');

  const isApi =
    req.url.startsWith('/api/') ||
    req.url.startsWith('http://127.0.0.1:8000/api/') ||
    req.url.startsWith('http://localhost:8000/api/') ||
    req.url.startsWith(`${API_BASE}/api/`);

  const accessToken = authService.getAccessToken();

  let authReq = req;

  if (accessToken && !isAuthUrl && isApi) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !isApi || isAuthUrl) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();

      if (!refreshToken) {
        authService.logout(true);
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      if (isRefreshing) {
        return new Observable<HttpEvent<unknown>>((observer) => {
          enqueue((newToken) => {
            if (!newToken) {
              observer.error(error);
              return;
            }

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });

            next(retryReq).subscribe({
              next: (ev) => observer.next(ev),
              error: (e) => observer.error(e),
              complete: () => observer.complete(),
            });
          });
        });
      }

      isRefreshing = true;

      return http
        .post<any>(`${API_BASE}/api/token/refresh/`, {
          refresh: refreshToken,
        })
        .pipe(
          switchMap((res) => {
            const newAccess = res?.access ?? null;

            isRefreshing = false;

            if (!newAccess) {
              flush(null);
              authService.logout(true);
              router.navigate(['/auth/login']);
              return throwError(() => error);
            }

            authService.setAccessToken(newAccess);
            flush(newAccess);

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccess}`,
              },
            });

            return next(retryReq);
          }),

          catchError((refreshErr) => {
            isRefreshing = false;
            flush(null);

            authService.logout(true);
            router.navigate(['/auth/login']);

            return throwError(() => refreshErr);
          }),
        );
    }),
  );
};