import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SnipLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

const API_BASE = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class SnipService {
  private readonly http = inject(HttpClient);

  listLinks(): Observable<SnipLink[]> {
    return this.http.get<SnipLink[]>(`${API_BASE}/api/links`);
  }

  createLink(url: string): Observable<SnipLink> {
    return this.http.post<SnipLink>(`${API_BASE}/api/links`, { url });
  }
}
