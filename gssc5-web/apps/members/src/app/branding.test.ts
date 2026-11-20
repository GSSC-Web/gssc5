import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const appRoot = process.cwd();
const indexHtmlPath = join(appRoot, 'src', 'index.html');
const publicDir = join(appRoot, 'public');

// @relation(GSSC-MLLR-647, scope=range_start, role=Test)
test('GSSC-MLLR-647 Semantic', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  expect(html).toMatch(/<link\s+rel="icon"/);
  expect(existsSync(join(publicDir, 'favicon.ico'))).toBe(false);
});
// @relation(GSSC-MLLR-647, scope=range_end, role=Test)

// @relation(GSSC-MLLR-648, scope=range_start, role=Test)
test('GSSC-MLLR-648 Syntactic', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  expect(html).toMatch(/<link\s+rel="icon"[^>]*>/);
  expect(html).toContain('<head>');
});
// @relation(GSSC-MLLR-648, scope=range_end, role=Test)

// @relation(GSSC-MLLR-649, scope=range_start, role=Test)
test('GSSC-MLLR-649 Lexical', () => {
  // Official society artwork is served from backend FILE_STORAGE_ROOT via KV
  // paths (GSSC5-151); Members must not commit .ico/.png branding binaries.
  const names = readdirSync(publicDir);
  expect(names.some((name) => /\.(ico|png)$/i.test(name))).toBe(false);
  expect(existsSync(join(publicDir, 'gssc-society-logo.png'))).toBe(false);
});
// @relation(GSSC-MLLR-649, scope=range_end, role=Test)
