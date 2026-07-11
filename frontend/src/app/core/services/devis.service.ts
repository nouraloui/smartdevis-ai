import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DevisService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/devis`;

  getAllDevis(
    projetId?: string | null,
    phase: 'phase1' | 'phase2' = 'phase2'
  ): Observable<any> {
    const params: string[] = [];

    if (projetId) {
      params.push(`projet=${projetId}`);
    }

    params.push(`phase=${phase}`);

    return this.http.get(`${this.apiUrl}?${params.join('&')}`);
  }

  getDevisById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  createDevis(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateDevis(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteDevis(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}