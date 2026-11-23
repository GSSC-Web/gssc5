import { EditorSession } from './editor-session';

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
