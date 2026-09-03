import { Component, inject, signal } from '@angular/core';
import { SnipLink, SnipService } from './snip.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly snipService = inject(SnipService);

  readonly url = signal('');
  readonly links = signal<SnipLink[]>([]);
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal(false);

  constructor() {
    this.fetchLinks();
  }

  fetchLinks(): void {
    this.snipService.listLinks().subscribe({
      next: (items) => this.links.set(items),
      error: () => this.error.set('Could not load existing links.'),
    });
  }

  onUrlInput(value: string): void {
    this.url.set(value);
  }

  shortenUrl(): void {
    const rawUrl = this.url().trim();
    this.error.set('');
    this.success.set('');

    if (!this.isValidHttpUrl(rawUrl)) {
      this.error.set('Please enter a valid http(s) URL.');
      return;
    }

    this.loading.set(true);

    this.snipService.createLink(rawUrl).subscribe({
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

  private isValidHttpUrl(value: string): boolean {
    if (!value) return false;

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
