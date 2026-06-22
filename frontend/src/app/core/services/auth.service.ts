// src/app/core/services/auth.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConnectedUser {
  id: string;
  nom: string;
  email: string;
  role: 'admin' | 'manager' | 'consultant' | 'agent_saisie';
  actif: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  login(data: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Observable<any> {
    const payload = {
      email: data.email.trim().toLowerCase(),
      password: data.password.trim()
    };

    return this.http.post(`${this.apiUrl}/login`, payload).pipe(
      tap((response: any) => {
        if (response?.token) {
          if (data.rememberMe) {
            localStorage.setItem('token', response.token);
            sessionStorage.removeItem('token');
          } else {
            sessionStorage.setItem('token', response.token);
            localStorage.removeItem('token');
          }
        }

        if (response?.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      })
    );
  }

  register(data: {
  nom: string;
  email: string;
  password: string;
  role?: string;
}): Observable<any> {
  const payload = {
    nom: data.nom.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password.trim(),
    role: data.role || 'consultant'
  };

  return this.http.post(`${this.apiUrl}/register`, payload);
}


  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, {
      email: email.trim().toLowerCase()
    });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password/${token}`, {
      password: password.trim()
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('userEmail');
  }

  getToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): ConnectedUser | null {
    const userJson = localStorage.getItem('user');

    if (!userJson) {
      return null;
    }

    try {
      return JSON.parse(userJson) as ConnectedUser;
    } catch {
      return null;
    }
  }

  getCurrentUserName(): string {
    const user = this.getCurrentUser();
    return user?.nom || 'Utilisateur';
  }

  getCurrentUserRole(): string {
    const user = this.getCurrentUser();

    if (!user?.role) {
      return '';
    }

    return this.formatRole(user.role);
  }

  private formatRole(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      consultant: 'Consultant',
      agent_saisie: 'Agent de saisie'
    };

    return labels[role] || role;
  }
}