import { Injectable } from '@angular/core';
import { backend } from './backend';

/** Reads global website values from the Unified Backend key-value store. */
@Injectable({ providedIn: 'root' })
export class WebsiteKv {
  async getValue(key: string): Promise<string | null> {
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
}
