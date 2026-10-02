import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

import { AuthService } from '../../pages/auth/services/auth.service';

export type RoleMenuItem = MenuItem & {
  roles?: Array<'ADMIN' | 'TUTOR' | 'ADOPTANTE'>;
  items?: RoleMenuItem[];
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `
    <ul class="layout-menu">
      <ng-container *ngFor="let item of model; let i = index">
        <li
          app-menuitem
          *ngIf="!item['separator']"
          [item]="item"
          [index]="i"
          [root]="true"
        ></li>
        <li *ngIf="item['separator']" class="menu-separator"></li>
      </ng-container>
    </ul>
  `,
})
export class AppMenu implements OnInit {
  model: RoleMenuItem[] = [];

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit() {
    const rawModel: RoleMenuItem[] = [
      {
        label: 'SNOUTY',
        icon: 'pi pi-fw pi-paw',
        items: [
          // =========================
          // MÓDULO: MASCOTAS
          // =========================
          {
            label: 'Mascotas',
            icon: 'pi pi-fw pi-heart',
            roles: ['ADMIN', 'TUTOR'],
            items: [
              {
                label: 'Registro de mascotas',
                icon: 'pi pi-fw pi-heart',
                roles: ['ADMIN', 'TUTOR'],
                command: () => this.router.navigate(['/snouty/mascotas']),
              },
              {
                label: 'Registro de fotos',
                icon: 'pi pi-fw pi-images',
                roles: ['ADMIN', 'TUTOR'],
                command: () => this.router.navigate(['/snouty/fotos-mascota']),
              },
              {
                label: 'Especies',
                icon: 'pi pi-fw pi-list',
                roles: ['ADMIN'],
                command: () => this.router.navigate(['/snouty/especies']),
              },
              {
                label: 'Razas',
                icon: 'pi pi-fw pi-database',
                roles: ['ADMIN'],
                command: () => this.router.navigate(['/snouty/razas']),
              },
            ],
          },

          // =========================
          // MÓDULO: USUARIOS
          // =========================
          {
            label: 'Usuarios',
            icon: 'pi pi-fw pi-users',
            roles: ['ADMIN'],
            items: [
              {
                label: 'Registro de usuarios',
                icon: 'pi pi-fw pi-user-plus',
                roles: ['ADMIN'],
                command: () => this.router.navigate(['/snouty/usuarios']),
              },
              {
                label: 'Valoraciones',
                icon: 'pi pi-fw pi-star',
                roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'],
                command: () => this.router.navigate(['/snouty/valoraciones']),
              },
            ],
          },

          // =========================
          // MÓDULO: HISTORIAL MÉDICO
          // =========================
          {
            label: 'Historial Médico',
            icon: 'pi pi-fw pi-file',
            roles: ['ADMIN', 'TUTOR'],
            items: [
              {
                label: 'Cartillas médicas',
                icon: 'pi pi-fw pi-book',
                roles: ['ADMIN', 'TUTOR'],
                command: () => this.router.navigate(['/snouty/cartillas-medicas']),
              },
              {
                label: 'Registro de vacunas',
                icon: 'pi pi-fw pi-shield',
                roles: ['ADMIN', 'TUTOR'],
                command: () => this.router.navigate(['/snouty/vacunas']),
              },
              {
                label: 'Historial médico',
                icon: 'pi pi-fw pi-folder-open',
                roles: ['ADMIN', 'TUTOR'],
                command: () => this.router.navigate(['/snouty/historiales-medicos']),
              },
            ],
          },

          // =========================
          // MÓDULO: ADOPCIONES  ✅ AQUÍ VAN BÚSQUEDA Y SEGUIMIENTOS
          // =========================
          {
            label: 'Adopciones',
            icon: 'pi pi-fw pi-send',
            roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'],
            items: [
              {
                label: 'Solicitudes',
                icon: 'pi pi-fw pi-inbox',
                roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'],
                command: () =>
                  this.router.navigate(['/snouty/solicitudes-adopcion']),
              },

              // ✅ Seguimientos dentro de adopciones
              {
                label: 'Seguimientos',
                icon: 'pi pi-fw pi-calendar',
                roles: ['ADMIN', 'TUTOR', 'ADOPTANTE'],
                command: () => this.router.navigate(['/snouty/seguimiento']),
              },

              // ✅ Buscador de mascotas dentro de adopciones
              {
                label: 'Búsqueda de mascotas',
                icon: 'pi pi-fw pi-search',
                roles: ['ADOPTANTE'],
                command: () => this.router.navigate(['/mascotas-disponibles']),
              },
            ],
          },

          // =========================
          // MÓDULO: REPORTES
          // =========================
        
        ],
      },
    ];

    this.model = this.filterMenuByRole(rawModel);
  }

  private filterMenuByRole(sections: RoleMenuItem[]): RoleMenuItem[] {
    const user = this.authService.getCurrentUser();
    if (!user?.rol) return [];

    const role = user.rol;

    const filterRecursive = (items: RoleMenuItem[]): RoleMenuItem[] => {
      return items.reduce<RoleMenuItem[]>((acc, item) => {
        const children = item.items ? filterRecursive(item.items) : undefined;

        const visibleByRole =
          !item.roles || item.roles.length === 0 || item.roles.includes(role);

        if (!visibleByRole) return acc;

        const hasCommand = !!item.command;
        const hasChildren = !!children && children.length > 0;

        // si no tiene command y no tiene hijos visibles -> se elimina
        if (!hasCommand && item.items && !hasChildren) return acc;

        acc.push({ ...item, items: children });
        return acc;
      }, []);
    };

    return filterRecursive(sections);
  }
}
