import { Injectable, signal } from '@angular/core';

export type ColorMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'gssc-color-mode';

function readStoredMode(): ColorMode {
  try {
    const raw = globalThis.localStorage?.getItem(COLOR_MODE_STORAGE_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function writeStoredMode(mode: ColorMode): void {
  try {
    globalThis.localStorage?.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    /* private mode / blocked storage — in-memory mode still applies */
  }
}

function applyDocumentMode(mode: ColorMode): void {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
}

/** Applies and persists Public FE light/dark color mode (GSSC5-125). */
@Injectable({ providedIn: 'root' })
export class ThemeMode {
  // @relation(GSSC-PLLR-390, GSSC-PLLR-393, GSSC-PLLR-394, scope=range_start, role=Implementation)
  readonly mode = signal<ColorMode>(readStoredMode());

  constructor() {
    applyDocumentMode(this.mode());
  }

  toggle(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ColorMode): void {
    this.mode.set(mode);
    writeStoredMode(mode);
    applyDocumentMode(mode);
  }
  // @relation(GSSC-PLLR-390, GSSC-PLLR-393, GSSC-PLLR-394, scope=range_end, role=Implementation)
}
