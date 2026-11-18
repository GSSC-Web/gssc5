import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const appRoot = process.cwd();
const indexHtmlPath = join(appRoot, 'src', 'index.html');
const faviconPath = join(appRoot, 'public', 'favicon.ico');
const societyLogoPath = join(appRoot, 'public', 'gssc-society-logo.png');

function includesBytes(haystack: Uint8Array, needle: number[]): boolean {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

// @relation(GSSC-PLLR-386, scope=range_start, role=Test)
test('GSSC-PLLR-386 Semantic', () => {
  expect(existsSync(faviconPath)).toBe(true);
  expect(existsSync(societyLogoPath)).toBe(true);
  const favicon = readFileSync(faviconPath);
  expect(favicon.byteLength).toBeGreaterThan(0);
  expect(readU16LE(favicon, 0)).toBe(0);
  expect(readU16LE(favicon, 2)).toBe(1);
  expect(readU16LE(favicon, 4)).toBeGreaterThan(0);
});
// @relation(GSSC-PLLR-386, scope=range_end, role=Test)

// @relation(GSSC-PLLR-387, scope=range_start, role=Test)
test('GSSC-PLLR-387 Syntactic', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  expect(html).toMatch(/<link\s+rel="icon"[^>]*href="favicon\.ico"/);
  expect(html).toContain('<head>');
});
// @relation(GSSC-PLLR-387, scope=range_end, role=Test)

// @relation(GSSC-PLLR-388, scope=range_start, role=Test)
test('GSSC-PLLR-388 Lexical', () => {
  const favicon = readFileSync(faviconPath);
  const logo = readFileSync(societyLogoPath);
  expect(includesBytes(logo.subarray(0, 8), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).toBe(
    true,
  );
  expect(includesBytes(favicon, [0x89, 0x50, 0x4e, 0x47])).toBe(true);
});
// @relation(GSSC-PLLR-388, scope=range_end, role=Test)
