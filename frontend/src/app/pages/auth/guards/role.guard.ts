import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

type Role = 'ADMIN' | 'TUTOR' | 'ADOPTANTE';

function parseJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const expectedRoles = (route.data?.['roles'] as readonly Role[]) ?? [];

    // 1) requiere token
    const token = this.authService.getAccessToken();
    if (!token) {
      return this.router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    // 2) si no hay roles definidos, permite
    if (!expectedRoles.length) return true;

    // 3) rol: primero currentUser; si no hay, desde JWT
    const user = this.authService.getCurrentUser();
    let rol = (user?.rol ?? '').toString().trim().toUpperCase();

    if (!rol) {
      const decoded = parseJwt(token);
      rol = (decoded?.rol ?? decoded?.role ?? decoded?.user_role ?? '')
        .toString()
        .trim()
        .toUpperCase();
    }

    // ✅ Si aún no hay rol, NO dejes pasar (evita hueco)
    if (!rol) {
      // puedes mandar a notfound o login; mejor login
      return this.router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    // 4) valida rol
    if (!expectedRoles.includes(rol as Role)) {
      return this.router.createUrlTree(['/notfound']);
    }

    return true;
  }
}