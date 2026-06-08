import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ia`;

  detectAnomaly(data: {
    pu_fcfa: number;
    quantite: number;
    montant_fcfa: number;
    code_projet: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/detect-anomaly`, data);
  }

  riskScore(data: {
    pu_fcfa: number;
    quantite: number;
    montant_fcfa: number;
    prix_revient_fcfa: number;
    frais_gestion_pct: number;
    marge_nette_pct: number;
    categorie_code: number;
    code_projet: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/risk-score`, data);
  }

  suggestValues(data: {
    quantite: number;
    prix_revient_fcfa: number;
    categorie_code: number;
    code_projet: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/suggest-values`, data);
  }

  predictMargin(data: {
    pu_fcfa: number;
    quantite: number;
    prix_revient_fcfa: number;
    frais_gestion_pct: number;
    categorie_code: number;
    code_projet: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/predict-margin`, data);
  }
}