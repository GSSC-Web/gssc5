import { backend } from './backend';

/** Wire shape for one key-value entry (Unified Backend /kvs). */
export type KeyValueEntry = {
  key: string;
  value: string;
};

/**
 * Treaty calls for key-value catalog CRUD (GSSC5-43 + GSSC-202 list/delete).
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const kvsApi = {
  list: () => backend.kvs.get(),
  get: (key: string) => backend.kvs({ key }).get(),
  upsert: (key: string, value: string) =>
    backend.kvs({ key }).post({ value } as never),
  remove: (key: string) => backend.kvs({ key }).delete(),
};
