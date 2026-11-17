import { filesApi, filesApiUrl, resolveStoredFileObjectUrl } from './files-api';

test('filesApiUrl maps cuid and /files paths; passes through absolute http(s)', () => {
  expect(filesApiUrl('file-abc')).toBe('http://localhost:3000/files/file-abc');
  expect(filesApiUrl('/files/file-abc')).toBe('http://localhost:3000/files/file-abc');
  expect(filesApiUrl('https://cdn.example/x.pdf')).toBe('https://cdn.example/x.pdf');
});

test('resolveStoredFileObjectUrl blobs Treaty Response payload', async () => {
  const original = filesApi.get;
  const bytes = new Uint8Array([1, 2, 3]);
  filesApi.get = (async () => ({
    data: new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    }),
    error: null,
    status: 200,
    response: new Response(),
    headers: undefined,
  })) as unknown as typeof filesApi.get;

  try {
    const url = await resolveStoredFileObjectUrl('file-abc');
    expect(url).toMatch(/^blob:/);
  } finally {
    filesApi.get = original;
  }
});

test('resolveStoredFileObjectUrl omits on Treaty 403 and 404', async () => {
  const original = filesApi.get;
  try {
    filesApi.get = (async () => ({
      data: null,
      error: { status: 403, value: 'Forbidden' },
      status: 403,
      response: new Response(),
      headers: undefined,
    })) as unknown as typeof filesApi.get;
    expect(await resolveStoredFileObjectUrl('secret')).toBeNull();

    filesApi.get = (async () => ({
      data: null,
      error: { status: 404, value: 'Not Found' },
      status: 404,
      response: new Response(),
      headers: undefined,
    })) as unknown as typeof filesApi.get;
    expect(await resolveStoredFileObjectUrl('/files/missing')).toBeNull();
  } finally {
    filesApi.get = original;
  }
});

test('resolveStoredFileObjectUrl fetches absolute http(s) with omit on failure', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response('nope', { status: 404 })) as typeof fetch;
    expect(await resolveStoredFileObjectUrl('https://cdn.example/x.pdf')).toBeNull();

    globalThis.fetch = (async () =>
      new Response(new Uint8Array([9]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })) as typeof fetch;
    const url = await resolveStoredFileObjectUrl('https://cdn.example/ok.png');
    expect(url).toMatch(/^blob:/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
