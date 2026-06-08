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

  getAllDevis(projetId?: string | null): Observable<any> {
    const url = projetId
      ? `${this.apiUrl}?projet=${projetId}`
      : this.apiUrl;

    return this.http.get(url);
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