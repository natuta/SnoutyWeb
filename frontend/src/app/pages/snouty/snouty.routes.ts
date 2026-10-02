import { Routes } from '@angular/router';

import { SnoutyEspeciesPage } from './especies/especies';
import { SnoutyRazasPage } from './razas/razas';
import { SnoutyUsuariosPage } from './usuarios/usuarios';

import { SnoutyMascotasPage } from './mascotas/mascotas';
import { SnoutyFotosMascotaPage } from './fotos/fotos';
import { SnoutyHistorialesPage } from './cartillas-medicas/historiales';
import { SnoutyCartillasPage } from './cartillas-medicas/cartillas';
import { SnoutyVacunasPage } from './vacunas/vacunas';
import { SnoutySolicitudesAdopcionPage } from './solicitudes/solicitudes';
import { SnoutyValoracionesPage } from './valoraciones/valoraciones';
import { MascotasDashboard } from './buscador/mascotas-dashboard';

import { SeguimientoPage } from './seguimientos/seguimiento';

import { RoleGuard } from '../auth/guards/role.guard';
import { ReportesAdminPage } from './reports/reportes-admin';

const ROLES = {
  ADMIN: ['ADMIN'] as const,
  ADMIN_TUTOR: ['ADMIN', 'TUTOR'] as const,
  TUTOR: ['TUTOR'] as const,
  ADOPTANTE: ['ADOPTANTE'] as const,

  // ✅ CORREGIDO: el ADMIN también puede entrar (solo lectura en backend)
  SEGUIMIENTO: ['ADMIN', 'TUTOR', 'ADOPTANTE'] as const,

  ALL: ['ADMIN', 'TUTOR', 'ADOPTANTE'] as const,
};

export const SNOUTY_ROUTES: Routes = [
  // =========================
  // SOLO ADMIN
  // =========================
  {
    path: 'especies',
    component: SnoutyEspeciesPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN },
  },
  {
    path: 'razas',
    component: SnoutyRazasPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN },
  },
  {
    path: 'usuarios',
    component: SnoutyUsuariosPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN },
  },

  // =========================
  // ADMIN + TUTOR
  // =========================
  {
    path: 'mascotas',
    component: SnoutyMascotasPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN_TUTOR },
  },
  {
    path: 'fotos-mascota',
    component: SnoutyFotosMascotaPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN_TUTOR },
  },
  {
    path: 'historiales-medicos',
    component: SnoutyHistorialesPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN_TUTOR },
  },
  {
    path: 'cartillas-medicas',
    component: SnoutyCartillasPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN_TUTOR },
  },
  {
    path: 'vacunas',
    component: SnoutyVacunasPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN_TUTOR },
  },

  // =========================
  // SEGUIMIENTO (ADMIN/TUTOR/ADOPTANTE)
  // =========================
  {
    path: 'seguimiento',
    component: SeguimientoPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.SEGUIMIENTO },
  },

  // =========================
  // TODOS
  // =========================
  {
    path: 'solicitudes-adopcion',
    component: SnoutySolicitudesAdopcionPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ALL },
  },
  {
    path: 'valoraciones',
    component: SnoutyValoracionesPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ALL },
  },

  // =========================
  // SOLO ADOPTANTE
  // =========================
  {
    path: 'mascotas-disponibles',
    component: MascotasDashboard,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADOPTANTE },
  },

  // =========================
  // SOLO ADMIN
  // =========================
  {
    path: 'reportes',
    component: ReportesAdminPage,
    canActivate: [RoleGuard],
    data: { roles: ROLES.ADMIN },
  },
];