import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getStats(codeProjet: string = 'DI-M3'): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats?code_projet=${codeProjet}`);
  }
}