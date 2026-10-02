import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { MascotasDashboard } from './app/pages/snouty/buscador/mascotas-dashboard';

import { RoleGuard } from './app/pages/auth/guards/role.guard';
import { ReportesAdminPage } from '@/pages/snouty/reports/reportes-admin';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  {
    path: '',
    component: AppLayout,
    children: [
      // ✅ al entrar al layout
      { path: '', redirectTo: 'reportes', pathMatch: 'full' },

      // alias
      { path: 'dashboard', redirectTo: 'reportes', pathMatch: 'full' },

      {
        path: 'reportes',
        component: ReportesAdminPage,
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] },
      },

      // ADOPTANTE dashboard
      {
        path: 'mascotas-disponibles',
        component: MascotasDashboard,
        canActivate: [RoleGuard],
        data: { roles: ['ADOPTANTE'] },
      },

      // ✅ CORREGIDO AQUÍ
      {
        path: 'snouty',
        loadChildren: () =>
          import('./app/pages/snouty/snouty.routes').then((m) => m.SNOUTY_ROUTES),
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'] },
      },

      {
        path: 'uikit',
        loadChildren: () =>
          import('./app/pages/uikit/uikit.routes').then((m) => m.default),
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'] },
      },

      {
        path: 'pages',
        loadChildren: () =>
          import('./app/pages/pages.routes').then((m) => m.default),
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'] },
      },

      {
        path: 'documentation',
        component: Documentation,
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] },
      },
    ],
  },

  { path: 'landing', component: Landing },
  { path: 'notfound', component: Notfound },

  {
    path: 'auth',
    loadChildren: () =>
      import('./app/pages/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  { path: '**', redirectTo: '/notfound' },
];