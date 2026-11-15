import { EditorSession } from './editor-session';

// @relation(GSSC-MLLR-196, GSSC-MLLR-197, GSSC-MLLR-198, scope=range_start, role=Test)
test('EditorSession exclusive and concurrent holds', () => {
  const session = new EditorSession();

  expect(session.tryAcquire('a', 'h1')).toBe(true);
  expect(session.tryAcquire('b', 'h2')).toBe(true);
  expect(session.tryAcquire('a', 'h2')).toBe(false);
  expect(session.isHeldByOther('a', 'h2')).toBe(true);
  expect(session.isHeldByOther('a', 'h1')).toBe(false);

  session.release('a', 'h2');
  expect(session.tryAcquire('a', 'h2')).toBe(false);

  session.release('a', 'h1');
  expect(session.tryAcquire('a', 'h2')).toBe(true);
});
// @relation(GSSC-MLLR-196, GSSC-MLLR-197, GSSC-MLLR-198, scope=range_end, role=Test)
