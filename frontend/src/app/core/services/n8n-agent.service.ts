import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface N8nAgentRequest {
  message: string;
  sessionId?: string;
  context?: {
    source?: string;
    module?: string;
    [key: string]: unknown;
  };
}

export interface N8nAgentResponse {
  success: boolean;
  answer: string;
  raw?: unknown;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class N8nAgentService {
  private readonly apiUrl = `${environment.apiUrl}/n8n-agent`;

  constructor(private http: HttpClient) {}

  askAgent(message: string): Observable<N8nAgentResponse> {
    const body: N8nAgentRequest = {
      message,
      sessionId: 'smartdevis-test-002',
      context: {
        source: 'frontend-angular',
        module: 'n8n-agent'
      }
    };

    return this.http.post<N8nAgentResponse>(`${this.apiUrl}/ask`, body)
      .pipe(catchError(this.handleError));
  }

  checkStatus(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/status`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erreur lors de la communication avec le backend.';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}