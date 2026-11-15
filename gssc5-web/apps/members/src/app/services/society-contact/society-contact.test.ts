import { TestBed } from '@angular/core/testing';
import { KvStore } from '../kv-store/kv-store';
import {
  SOCIETY_EMAIL_KEY,
  SOCIETY_ORGANIZATION_NAME_KEY,
  SOCIETY_PHONE_KEY,
  SOCIETY_POSTAL_KEY,
  SocietyContact,
} from './society-contact';

class FakeKvStore {
  constructor(private readonly values: Record<string, string | null>) {}

  async getValue(key: string): Promise<string | null> {
    return Object.prototype.hasOwnProperty.call(this.values, key)
      ? this.values[key]!
      : null;
  }
}

async function setupSocietyContact(values: Record<string, string | null>) {
  TestBed.configureTestingModule({
    providers: [{ provide: KvStore, useValue: new FakeKvStore(values) }],
  });
  const societyContact = TestBed.inject(SocietyContact);
  await societyContact.refresh();
  return societyContact;
}

// @relation(GSSC-MLLR-63, scope=range_start, role=Test)
test('GSSC-MLLR-63 Society Phone Number', async () => {
  const societyContact = await setupSocietyContact({
    [SOCIETY_PHONE_KEY]: '(209) 529-9430',
  });
  expect(societyContact.phoneNumber()).toBe('(209) 529-9430');
});
// @relation(GSSC-MLLR-63, scope=range_end, role=Test)

// @relation(GSSC-MLLR-64, scope=range_start, role=Test)
test('GSSC-MLLR-64 Society Email Address', async () => {
  const societyContact = await setupSocietyContact({
    [SOCIETY_EMAIL_KEY]: 'gsscfounded1968@gmail.com',
  });
  expect(societyContact.emailAddress()).toBe('gsscfounded1968@gmail.com');
});
// @relation(GSSC-MLLR-64, scope=range_end, role=Test)

// @relation(GSSC-MLLR-65, scope=range_start, role=Test)
test('GSSC-MLLR-65 Society Postal Address', async () => {
  const societyContact = await setupSocietyContact({
    [SOCIETY_POSTAL_KEY]: 'P.O. Box 1352 Modesto, CA 95353-1352',
  });
  expect(societyContact.postalAddress()).toBe('P.O. Box 1352 Modesto, CA 95353-1352');
});
// @relation(GSSC-MLLR-65, scope=range_end, role=Test)

// @relation(GSSC-MLLR-66, scope=range_start, role=Test)
test('GSSC-MLLR-66 Society Organization Name', async () => {
  const societyContact = await setupSocietyContact({
    [SOCIETY_ORGANIZATION_NAME_KEY]: 'Genealogical Society of Stanislaus County',
  });
  expect(societyContact.organizationName()).toBe(
    'Genealogical Society of Stanislaus County',
  );
});
// @relation(GSSC-MLLR-66, scope=range_end, role=Test)
