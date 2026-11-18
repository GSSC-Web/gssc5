import { TestBed } from '@angular/core/testing';
import {
  COLOR_MODE_STORAGE_KEY,
  ThemeMode,
  type ColorMode,
} from './theme-mode';

function clearModeStorage(): void {
  try {
    globalThis.localStorage?.removeItem(COLOR_MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  globalThis.document?.documentElement.classList.remove('dark');
  if (globalThis.document?.documentElement) {
    globalThis.document.documentElement.style.colorScheme = '';
  }
}

function setupTheme(): ThemeMode {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ThemeMode);
}

// @relation(GSSC-MLLR-653, scope=range_start, role=Test)
test('GSSC-MLLR-653 Semantic', () => {
  clearModeStorage();
  const theme = setupTheme();
  expect(theme.mode()).toBe('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);

  theme.setMode('dark');
  expect(theme.mode()).toBe('dark');
  expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  const restored = TestBed.inject(ThemeMode);
  expect(restored.mode()).toBe('dark');
  clearModeStorage();
});
// @relation(GSSC-MLLR-653, scope=range_end, role=Test)

// @relation(GSSC-MLLR-654, scope=range_start, role=Test)
test('GSSC-MLLR-654 Syntactic', () => {
  clearModeStorage();
  const theme = setupTheme();
  theme.setMode('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(document.documentElement.style.colorScheme).toBe('dark');
  theme.setMode('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  expect(document.documentElement.style.colorScheme).toBe('light');
  clearModeStorage();
});
// @relation(GSSC-MLLR-654, scope=range_end, role=Test)

// @relation(GSSC-MLLR-650, scope=range_start, role=Test)
test('GSSC-MLLR-650 Semantic', () => {
  clearModeStorage();
  const theme = setupTheme();
  const before: ColorMode = theme.mode();
  theme.toggle();
  expect(theme.mode()).toBe(before === 'dark' ? 'light' : 'dark');
  expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe(theme.mode());
  theme.toggle();
  expect(theme.mode()).toBe(before);
  clearModeStorage();
});
// @relation(GSSC-MLLR-650, scope=range_end, role=Test)
