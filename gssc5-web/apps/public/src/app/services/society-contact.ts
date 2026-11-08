import { computed, Injectable, inject, signal } from '@angular/core';
import { WebsiteKv } from './website-kv';

/** KVS keys for public society contact fields shown in the Footer. */
export const SOCIETY_PHONE_KEY = 'society.phoneNumber';
export const SOCIETY_EMAIL_KEY = 'society.emailAddress';
export const SOCIETY_POSTAL_KEY = 'society.postalAddress';

/** Public society contact fields shown in the Footer. */
@Injectable({ providedIn: 'root' })
export class SocietyContact {
  private readonly websiteKv = inject(WebsiteKv);

  readonly organizationName = 'Genealogical Society of Stanislaus County';
  readonly phoneNumber = signal('');
  readonly emailAddress = signal('');
  readonly postalAddress = signal('');

  readonly phoneDialHref = computed(() => dialHref(this.phoneNumber()));
  readonly emailMailtoHref = computed(() => {
    const email = this.emailAddress().trim();
    return email ? `mailto:${email}` : '';
  });

  // @relation(GSSC-PLLR-34, GSSC-PLLR-37, GSSC-PLLR-40, scope=range_start, role=Implementation)
  async refresh(): Promise<void> {
    const [phone, email, postal] = await Promise.all([
      this.websiteKv.getValue(SOCIETY_PHONE_KEY),
      this.websiteKv.getValue(SOCIETY_EMAIL_KEY),
      this.websiteKv.getValue(SOCIETY_POSTAL_KEY),
    ]);
    this.phoneNumber.set(phone ?? '');
    this.emailAddress.set(email ?? '');
    this.postalAddress.set(postal ?? '');
  }
  // @relation(GSSC-PLLR-34, GSSC-PLLR-37, GSSC-PLLR-40, scope=range_end, role=Implementation)
}

function dialHref(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) return '';
  const withCountry = digits.startsWith('1') ? digits : `1${digits}`;
  return `tel:+${withCountry}`;
}
