import { Injectable, inject, signal } from '@angular/core';
import { BACKEND_ORIGIN } from '../backend';
import { KvStore } from '../kv-store/kv-store';


/** KVS keys for public branding asset storage paths. */
export const BRANDING_FAVICON_KEY = 'branding.favicon';
export const BRANDING_LOGO_KEY = 'branding.logo';

/**
 * Resolve a branding storage path (branding/…) to Unified Backend GET /branding/{file}.
 * Absolute http(s) URLs still pass through.
 */
export function brandingFileUrl(
  resource: string,
  origin: string = BACKEND_ORIGIN,
): string {
  const trimmed = resource.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^\/+/, '');
  if (normalized.startsWith('branding/')) {
    return `${origin}/${normalized}`;
  }
  return `${origin}/branding/${normalized}`;
}

/** Resolves favicon and society logo paths from KV, then backend file URLs. */
@Injectable({ providedIn: 'root' })
export class BrandingAssets {
  private readonly kvStore = inject(KvStore);

  readonly faviconUrl = signal('');
  readonly logoUrl = signal('');

  async refresh(): Promise<void> {
    // @relation(GSSC-PLLR-400, GSSC-PLLR-401, GSSC-PLLR-402, scope=range_start, role=Implementation)
    const [faviconPath, logoPath] = await Promise.all([
      this.kvStore.getValue(BRANDING_FAVICON_KEY),
      this.kvStore.getValue(BRANDING_LOGO_KEY),
    ]);
    const favicon = faviconPath?.trim() ? brandingFileUrl(faviconPath) : '';
    const logo = logoPath?.trim() ? brandingFileUrl(logoPath) : '';
    this.faviconUrl.set(favicon);
    this.logoUrl.set(logo);
    this.applyDocumentFavicon(favicon);
    // @relation(GSSC-PLLR-400, GSSC-PLLR-401, GSSC-PLLR-402, scope=range_end, role=Implementation)
  }

  private applyDocumentFavicon(href: string): void {
    if (typeof document === 'undefined') return;
    const link =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
      (() => {
        const created = document.createElement('link');
        created.rel = 'icon';
        created.type = 'image/x-icon';
        document.head.appendChild(created);
        return created;
      })();
    if (href) {
      link.href = href;
    }
  }
}
