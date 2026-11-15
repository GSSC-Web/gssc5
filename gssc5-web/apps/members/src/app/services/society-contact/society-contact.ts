import { computed, Injectable, inject, signal } from '@angular/core';
import { KvStore } from '../kv-store/kv-store';

/** KVS keys for member society contact fields shown in the Footer. */
export const SOCIETY_ORGANIZATION_NAME_KEY = 'society.organizationName';
export const SOCIETY_PHONE_KEY = 'society.phoneNumber';
export const SOCIETY_EMAIL_KEY = 'society.emailAddress';
export const SOCIETY_POSTAL_KEY = 'society.postalAddress';

/** Member society contact fields shown in the Footer. */
@Injectable({ providedIn: 'root' })
export class SocietyContact {
  private readonly kvStore = inject(KvStore);

  readonly organizationName = signal('');
  readonly phoneNumber = signal('');
  readonly emailAddress = signal('');
  readonly postalAddress = signal('');

  readonly phoneDialHref = computed(() => dialHref(this.phoneNumber()));
  readonly emailMailtoHref = computed(() => {
    const email = this.emailAddress().trim();
    return email ? `mailto:${email}` : '';
  });

  async refresh(): Promise<void> {
    // @relation(GSSC-MLLR-66, scope=range_start, role=Implementation)
    this.organizationName.set(
      (await this.kvStore.getValue(SOCIETY_ORGANIZATION_NAME_KEY)) ?? '',
    );
    // @relation(GSSC-MLLR-66, scope=range_end, role=Implementation)

    // @relation(GSSC-MLLR-63, scope=range_start, role=Implementation)
    this.phoneNumber.set((await this.kvStore.getValue(SOCIETY_PHONE_KEY)) ?? '');
    // @relation(GSSC-MLLR-63, scope=range_end, role=Implementation)

    // @relation(GSSC-MLLR-64, scope=range_start, role=Implementation)
    this.emailAddress.set((await this.kvStore.getValue(SOCIETY_EMAIL_KEY)) ?? '');
    // @relation(GSSC-MLLR-64, scope=range_end, role=Implementation)

    // @relation(GSSC-MLLR-65, scope=range_start, role=Implementation)
    this.postalAddress.set((await this.kvStore.getValue(SOCIETY_POSTAL_KEY)) ?? '');
    // @relation(GSSC-MLLR-65, scope=range_end, role=Implementation)
  }
}

function dialHref(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) return '';
  const withCountry = digits.startsWith('1') ? digits : `1${digits}`;
  return `tel:+${withCountry}`;
}
