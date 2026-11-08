import { inject, Injectable, InjectionToken } from '@angular/core';
import { backend } from '../backend';

export type KvBackendGet = (key: string) => Promise<string | null>;

/** Default Unified Backend key-value GET used by KvStore. */
export const KV_BACKEND_GET = new InjectionToken<KvBackendGet>('KV_BACKEND_GET', {
  providedIn: 'root',
  factory: () => defaultKvBackendGet,
});

async function defaultKvBackendGet(key: string): Promise<string | null> {
  try {
    const result = await backend.kvs({ key }).get();
    if (result.error || result.data === null || result.data === undefined) {
      return null;
    }
    return result.data.value;
  } catch {
    return null;
  }
}

/** Reads global website values from the Unified Backend key-value store. */
@Injectable({ providedIn: 'root' })
export class KvStore {
  private readonly backendGet = inject(KV_BACKEND_GET);

  // @relation(GSSC-PLLR-76, GSSC-PLLR-77, scope=range_start, role=Implementation)
  async getValue(key: string): Promise<string | null> {
    return this.backendGet(key);
  }
  // @relation(GSSC-PLLR-76, GSSC-PLLR-77, scope=range_end, role=Implementation)
}
