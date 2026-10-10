import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppConfigurator],
    template: `
        <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button
                    type="button"
                    class="layout-menu-button layout-topbar-action"
                    (click)="layoutService.onMenuToggle()"
                    aria-label="Abrir o cerrar menú"
                >
                    <i class="pi pi-bars"></i>
                </button>

                <a class="layout-topbar-logo" routerLink="/">
                    <svg
                        viewBox="0 0 54 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M17.1637 19.2467C17.1566 19.4033 17.1529 19.561 17.1529 19.7194C17.1529 25.3503 21.7203 29.915 27.3546 29.915C32.9887 29.915 37.5561 25.3503 37.5561 19.7194C37.5561 19.5572 37.5524 19.3959 37.5449 19.2355C38.5617 19.0801 39.5759 18.9013 40.5867 18.6994L40.6926 18.6782C40.7191 19.0218 40.7326 19.369 40.7326 19.7194C40.7326 27.1036 34.743 33.0896 27.3546 33.0896C19.966 33.0896 13.9765 27.1036 13.9765 19.7194C13.9765 19.374 13.9896 19.0316 14.0154 18.6927L14.0486 18.6994C15.0837 18.9062 16.1223 19.0886 17.1637 19.2467ZM33.3284 11.4538C31.6493 10.2396 29.5855 9.52381 27.3546 9.52381C25.1195 9.52381 23.0524 10.2421 21.3717 11.4603C20.0078 11.3232 18.6475 11.1387 17.2933 10.907C19.7453 8.11308 23.3438 6.34921 27.3546 6.34921C31.36 6.34921 34.9543 8.10844 37.4061 10.896C36.0521 11.1292 34.692 11.3152 33.3284 11.4538ZM43.826 18.0518C43.881 18.6003 43.9091 19.1566 43.9091 19.7194C43.9091 28.8568 36.4973 36.2642 27.3546 36.2642C18.2117 36.2642 10.8 28.8568 10.8 19.7194C10.8 19.1615 10.8276 18.61 10.8816 18.0663L7.75383 17.4411C7.66775 18.1886 7.62354 18.9488 7.62354 19.7194C7.62354 30.6102 16.4574 39.4388 27.3546 39.4388C38.2517 39.4388 47.0855 30.6102 47.0855 19.7194C47.0855 18.9439 47.0407 18.1789 46.9536 17.4267L43.826 18.0518ZM44.2613 9.54743L40.9084 10.2176C37.9134 5.95821 32.9593 3.1746 27.3546 3.1746C21.7442 3.1746 16.7856 5.96385 13.7915 10.2305L10.4399 9.56057C13.892 3.83178 20.1756 0 27.3546 0C34.5281 0 40.8075 3.82591 44.2613 9.54743Z"
                            fill="var(--primary-color)"
                        />
                    </svg>
                    <span>SNOUTY</span>
                </a>
            </div>

            <div class="layout-topbar-actions snouty-actions">
                <div class="layout-config-menu">
                    <button
                        type="button"
                        class="layout-topbar-action"
                        (click)="toggleDarkMode()"
                        title="Cambiar tema"
                        aria-label="Cambiar tema"
                    >
                        <i [ngClass]="{ 'pi': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                    </button>
                    <div class="relative">
                        <button
                            type="button"
                            class="layout-topbar-action layout-topbar-action-highlight"
                            pStyleClass="@next"
                            enterFromClass="hidden"
                            enterActiveClass="animate-scalein"
                            leaveToClass="hidden"
                            leaveActiveClass="animate-fadeout"
                            [hideOnOutsideClick]="true"
                            title="Personalizar apariencia"
                            aria-label="Personalizar apariencia"
                        >
                            <i class="pi pi-palette"></i>
                        </button>
                        <app-configurator />
                    </div>
                </div>

                <button
                    type="button"
                    class="snouty-logout-button"
                    (click)="cerrarSesion()"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                >
                    <i class="pi pi-sign-out" aria-hidden="true"></i>
                    <span class="snouty-logout-label">Cerrar sesión</span>
                </button>
            </div>
        </div>
    `,
    styles: [`
        .snouty-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .snouty-logout-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55rem;
            background: transparent;
            color: #b42318;
            border: 1px solid #e6b8b4;
            border-radius: 10px;
            padding: 0.65rem 0.85rem;
            font: inherit;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            transition: background 0.2s ease, border-color 0.2s ease;
        }

        .snouty-logout-button:hover,
        .snouty-logout-button:focus-visible {
            background: #fff1f0;
            border-color: #d92d20;
        }

        .snouty-logout-button .pi {
            font-size: 1.05rem;
        }

        @media (max-width: 640px) {
            .snouty-actions {
                gap: 0.25rem;
            }

            .snouty-logout-button {
                padding: 0.6rem;
            }

            .snouty-logout-label {
                display: none;
            }
        }
    `]
})
export class AppTopbar {
    constructor(public layoutService: LayoutService) {}

    toggleDarkMode(): void {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }

    cerrarSesion(): void {
        // Son las mismas claves utilizadas por AuthService.
        localStorage.removeItem('snouty_access_token');
        localStorage.removeItem('snouty_refresh_token');
        localStorage.removeItem('snouty_current_user');
        localStorage.removeItem('snouty_user');

        // Recarga la aplicación en el login para limpiar también el estado
        // de los servicios Angular que siguen en memoria.
        window.location.replace('/auth/login');
    }
}
