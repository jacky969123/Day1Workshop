import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

interface LinkRecord {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly http = inject(HttpClient);
  readonly url = signal('');
  readonly links = signal<LinkRecord[]>([]);
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal(false);

  constructor() {
    this.fetchLinks();
  }

  fetchLinks(): void {
    this.http.get<LinkRecord[]>('http://localhost:3000/api/links').subscribe({
      next: (items) => this.links.set(items),
      error: () => this.error.set('Could not load existing links.'),
    });
  }

  shortenUrl(): void {
    const rawUrl = this.url().trim();
    if (!rawUrl) {
      this.error.set('Please enter a valid http(s) URL.');
      this.success.set('');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      this.error.set('Please enter a valid http(s) URL.');
      this.success.set('');
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      this.error.set('Only http and https URLs are allowed.');
      this.success.set('');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.http.post<LinkRecord>('http://localhost:3000/api/links', { url: parsed.toString() }).subscribe({
      next: (link) => {
        this.links.set([link, ...this.links()]);
        this.url.set('');
        this.success.set(`Short link created: ${link.shortUrl}`);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Could not create a short link.');
      },
    });
  }
}
