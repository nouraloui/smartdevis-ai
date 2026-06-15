// src/app/app.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AuthService, ConnectedUser } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  mobileMenuOpen = false;

  menuItems = [
    { label: 'Dashboard', route: '/dashboard', icon: 'pi pi-home' },
    { label: 'Analyses IA', route: '/analyses-ia', icon: 'pi pi-chart-bar' },
    { label: 'IA NLP', route: '/ia-nlp', icon: 'pi pi-sparkles' },
    { label: 'Agent n8n', route: '/n8n-agent', icon: 'pi pi-comments' },
    { label: 'Projets', route: '/projets', icon: 'pi pi-briefcase' },
    { label: 'Paramètres', route: '/parametres', icon: 'pi pi-cog' }
  ];

  get showNavbar(): boolean {
    const hiddenRoutes = ['/', '/login', '/register'];
    const currentUrl = this.router.url.split('?')[0];

    return !hiddenRoutes.includes(currentUrl) &&
      !currentUrl.startsWith('/reset-password');
  }

  get currentUser(): ConnectedUser | null {
    return this.authService.getCurrentUser();
  }

  get userName(): string {
    return this.authService.getCurrentUserName();
  }

  get userRole(): string {
    return this.authService.getCurrentUserRole();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}