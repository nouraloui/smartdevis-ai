import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IaNlpService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.iaApiUrl}/ia-nlp`;
  semanticAnalysis(nClusters = 6, codeProjet = 'ALL'): Observable<any> {
    return this.http.post(`${this.apiUrl}/semantic-analysis`, {
      n_clusters: nClusters,
      code_projet: codeProjet
    });
  }
}