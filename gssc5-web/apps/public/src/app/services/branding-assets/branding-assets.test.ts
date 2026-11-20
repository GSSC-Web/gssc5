import { TestBed } from '@angular/core/testing';

import { KvStore } from '../kv-store/kv-store';
import {
  BRANDING_FAVICON_KEY,
  BRANDING_LOGO_KEY,
  BrandingAssets,
  brandingFileUrl,
} from './branding-assets';

class FakeKvStore {
  constructor(private readonly values: Record<string, string | null>) {}

  async getValue(key: string): Promise<string | null> {
    return Object.prototype.hasOwnProperty.call(this.values, key)
      ? this.values[key]!
      : null;
  }
}

async function setupBranding(values: Record<string, string | null>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: KvStore, useValue: new FakeKvStore(values) }],
  });
  const branding = TestBed.inject(BrandingAssets);
  await branding.refresh();
  return branding;
}

test('brandingFileUrl maps branding paths; passes through absolute http(s)', () => {
  expect(brandingFileUrl('branding/gssc-society-logo.png')).toBe(
    'http://localhost:3000/branding/gssc-society-logo.png',
  );
  expect(brandingFileUrl('/branding/favicon.ico')).toBe(
    'http://localhost:3000/branding/favicon.ico',
  );
  expect(brandingFileUrl('favicon.ico')).toBe('http://localhost:3000/branding/favicon.ico');
  expect(brandingFileUrl('https://example.org/x.png')).toBe('https://example.org/x.png');
});

// @relation(GSSC-PLLR-400, scope=range_start, role=Test)
test('GSSC-PLLR-400 Semantic', async () => {
  const branding = await setupBranding({
    [BRANDING_FAVICON_KEY]: 'branding/favicon.ico',
    [BRANDING_LOGO_KEY]: 'branding/gssc-society-logo.png',
  });
  expect(branding.faviconUrl()).toBe('http://localhost:3000/branding/favicon.ico');
  expect(branding.logoUrl()).toBe('http://localhost:3000/branding/gssc-society-logo.png');
});
// @relation(GSSC-PLLR-400, scope=range_end, role=Test)

// @relation(GSSC-PLLR-401, scope=range_start, role=Test)
test('GSSC-PLLR-401 Syntactic', async () => {
  await setupBranding({
    [BRANDING_FAVICON_KEY]: 'branding/favicon.ico',
    [BRANDING_LOGO_KEY]: 'branding/gssc-society-logo.png',
  });
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  expect(link).not.toBeNull();
  expect(link!.getAttribute('href')).toBe('http://localhost:3000/branding/favicon.ico');
});
// @relation(GSSC-PLLR-401, scope=range_end, role=Test)

// @relation(GSSC-PLLR-402, scope=range_start, role=Test)
test('GSSC-PLLR-402 Lexical', async () => {
  const branding = await setupBranding({
    [BRANDING_FAVICON_KEY]: 'branding/favicon.ico',
    [BRANDING_LOGO_KEY]: 'branding/gssc-society-logo.png',
  });
  expect(branding.logoUrl()).toMatch(/^http:\/\/localhost:3000\/branding\/.+\.png$/);
  expect(branding.faviconUrl()).toMatch(/^http:\/\/localhost:3000\/branding\/.+\.ico$/);
});
// @relation(GSSC-PLLR-402, scope=range_end, role=Test)
