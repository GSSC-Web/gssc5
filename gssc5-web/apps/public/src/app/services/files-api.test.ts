import {
  filesApi,
  filesApiUrl,
  resolveStoredFileAccessUrl,
  resolveStoredFileObjectUrl,
} from './files-api';

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

// @relation(GSSC-PLLR-399, scope=range_start, role=Test)
test('GSSC-PLLR-399 resolveStoredFileAccessUrl uses Treaty HEAD without body transfer', async () => {
  const originalHead = filesApi.head;
  let headCalls = 0;
  let getCalls = 0;
  const originalGet = filesApi.get;
  filesApi.head = (async () => {
    headCalls += 1;
    return {
      data: null,
      error: null,
      status: 200,
      response: new Response(null, { status: 200 }),
      headers: undefined,
    };
  }) as unknown as typeof filesApi.head;
  filesApi.get = (async () => {
    getCalls += 1;
    return {
      data: new Response(new Uint8Array([1]), { status: 200 }),
      error: null,
      status: 200,
      response: new Response(),
      headers: undefined,
    };
  }) as unknown as typeof filesApi.get;

  try {
    expect(await resolveStoredFileAccessUrl('file-abc')).toBe(
      'http://localhost:3000/files/file-abc',
    );
    expect(headCalls).toBe(1);
    expect(getCalls).toBe(0);
  } finally {
    filesApi.head = originalHead;
    filesApi.get = originalGet;
  }
});
// @relation(GSSC-PLLR-399, scope=range_end, role=Test)

test('resolveStoredFileAccessUrl omits on Treaty HEAD 403', async () => {
  const original = filesApi.head;
  filesApi.head = (async () => ({
    data: null,
    error: { status: 403, value: 'Forbidden' },
    status: 403,
    response: new Response(),
    headers: undefined,
  })) as unknown as typeof filesApi.head;

  try {
    expect(await resolveStoredFileAccessUrl('secret')).toBeNull();
  } finally {
    filesApi.head = original;
  }
});
