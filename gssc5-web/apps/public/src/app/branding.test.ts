import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const appRoot = process.cwd();
const indexHtmlPath = join(appRoot, 'src', 'index.html');
const publicDir = join(appRoot, 'public');

// @relation(GSSC-PLLR-386, scope=range_start, role=Test)
test('GSSC-PLLR-386 Semantic', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  expect(html).toMatch(/<link\s+rel="icon"/);
  expect(existsSync(join(publicDir, 'favicon.ico'))).toBe(false);
});
// @relation(GSSC-PLLR-386, scope=range_end, role=Test)

// @relation(GSSC-PLLR-387, scope=range_start, role=Test)
test('GSSC-PLLR-387 Syntactic', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  expect(html).toMatch(/<link\s+rel="icon"[^>]*>/);
  expect(html).toContain('<head>');
});
// @relation(GSSC-PLLR-387, scope=range_end, role=Test)

// @relation(GSSC-PLLR-388, scope=range_start, role=Test)
test('GSSC-PLLR-388 Lexical', () => {
  // Official society artwork is served from backend FILE_STORAGE_ROOT via KV
  // paths (GSSC5-151); Public must not commit .ico/.png branding binaries.
  const names = readdirSync(publicDir);
  expect(names.some((name) => /\.(ico|png)$/i.test(name))).toBe(false);
  expect(existsSync(join(publicDir, 'gssc-society-logo.png'))).toBe(false);
});
// @relation(GSSC-PLLR-388, scope=range_end, role=Test)
