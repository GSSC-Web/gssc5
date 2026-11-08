import { TestBed } from '@angular/core/testing';
import { KV_BACKEND_GET, KvStore } from './kv-store';

async function setupKvStore(backendGet: (key: string) => Promise<string | null>) {
  TestBed.configureTestingModule({
    providers: [{ provide: KV_BACKEND_GET, useValue: backendGet }],
  });
  return TestBed.inject(KvStore);
}

// @relation(GSSC-PLLR-76, scope=range_start, role=Test)
test('GSSC-PLLR-76 Key-Value Retrieval', async () => {
  const calls: string[] = [];
  const store = await setupKvStore(async (key) => {
    calls.push(key);
    return `value-for-${key}`;
  });
  await expect(store.getValue('society.phoneNumber')).resolves.toBe(
    'value-for-society.phoneNumber',
  );
  expect(calls).toEqual(['society.phoneNumber']);
});
// @relation(GSSC-PLLR-76, scope=range_end, role=Test)

// @relation(GSSC-PLLR-77, scope=range_start, role=Test)
test('GSSC-PLLR-77 Key-Value Absence', async () => {
  const store = await setupKvStore(async () => null);
  await expect(store.getValue('missing.key')).resolves.toBeNull();
});
// @relation(GSSC-PLLR-77, scope=range_end, role=Test)
