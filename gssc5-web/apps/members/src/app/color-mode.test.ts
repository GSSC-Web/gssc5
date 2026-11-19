import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const stylesPath = join(process.cwd(), 'src', 'styles.css');
const indexHtmlPath = join(process.cwd(), 'src', 'index.html');

// @relation(GSSC-MLLR-655, scope=range_start, role=Test)
test('GSSC-MLLR-655 Lexical', () => {
  const css = readFileSync(stylesPath, 'utf8');
  expect(css).toMatch(/html\.dark\s*\{/);
  expect(css).toMatch(/--gssc-white:\s*#1a1c16/);
  expect(css).toMatch(/--gssc-black:\s*#f2efe6/);
  expect(css).toMatch(/--gssc-logo-plate:\s*#ffffee/);
  expect(css).toContain('html.dark .gssc-header__logo-mark');
  expect(css).toContain('html.dark .gssc-footer__logo-mark');
  expect(css).toContain('html.dark .gssc-login-page__logo-mark');
  expect(css).toMatch(/html\.dark\s+\.gssc-footer\s*\{/);
  expect(css).not.toMatch(/--gssc-cream\b/);
  expect(css).not.toMatch(/--color-gssc-cream\b/);
  const footerPin = css.match(/html\.dark\s+\.gssc-footer\s*\{([^}]*)\}/);
  expect(footerPin?.[1]).toMatch(/--gssc-black:\s*#000000/);
  expect(footerPin?.[1]).toMatch(/--gssc-white:\s*#ffffff/);
  expect(footerPin?.[1]).toMatch(/--color-gssc-black:\s*#000000/);
  expect(footerPin?.[1]).toMatch(/--color-gssc-white:\s*#ffffff/);
});
// @relation(GSSC-MLLR-655, scope=range_end, role=Test)

test('members color-mode boot script is present', () => {
  const html = readFileSync(indexHtmlPath, 'utf8');
  expect(html).toContain("localStorage.getItem('gssc-color-mode')");
  expect(html).toContain("classList.add('dark')");
});
