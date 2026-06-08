import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private apiUrl = `${environment.apiUrl}/assistant/chat`;

  constructor(private http: HttpClient) {}

  askAssistant(message: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { message });
  }
}