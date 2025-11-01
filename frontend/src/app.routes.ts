import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },

            { path: 'especies', loadComponent: () => import('./app/features/especies-list/especies-list') },
            { path: 'especies/nuevo', loadComponent: () => import('./app/features/especie-form/especie-form') },
            { path: 'especies/:id/editar', loadComponent: () => import('./app/features/especie-form/especie-form') },

            { path: 'razas', loadComponent: () => import('./app/features/razas-list/razas-list') },
            { path: 'razas/nuevo', loadComponent: () => import('./app/features/raza-form/raza-form') },
            { path: 'razas/:id/editar', loadComponent: () => import('./app/features/raza-form/raza-form') },

            { path: 'mascotas', loadComponent: () => import('./app/features/mascotas-list/mascotas-list') },
            { path: 'mascotas/nuevo', loadComponent: () => import('./app/features/mascota-form/mascota-form') },
            { path: 'mascotas/:id/editar', loadComponent: () => import('./app/features/mascota-form/mascota-form') },

            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
