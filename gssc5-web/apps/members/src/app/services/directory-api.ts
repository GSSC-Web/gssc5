import { backend } from './backend';
import type { AccountRecord } from './account-api';
import type { ContactMethod, ContactRowContents } from '../modules/contact-row/contact-row';

/** Query filters accepted by Unified Backend GET /users. */
export type DirectorySearchFilters = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  homeCity?: string;
  homeState?: string;
};

/**
 * Treaty calls for members directory list/search.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const directoryApi = {
  listUsers: (query: Record<string, string> = {}) =>
    backend.users.get({ query }),
};

/** Drop blank filter values so the request stays a valid users query. */
export function toDirectoryQuery(
  filters: DirectorySearchFilters,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length > 0) query[key] = trimmed;
  }
  return query;
}

/** Display name from projected name parts. */
export function directoryDisplayName(entry: AccountRecord): string {
  return [entry.firstName, entry.middleName, entry.lastName]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join(' ');
}

/**
 * Contact methods present on the projected list entry (availability already
 * applied by the Unified Backend). Emails and phones become activatable links.
 */
export function directoryContactMethods(entry: AccountRecord): ContactMethod[] {
  const methods: ContactMethod[] = [];
  const email = entry.primaryEmail?.trim();
  if (email) methods.push({ label: email, href: `mailto:${email}` });
  const secondaryEmail = entry.secondaryEmail?.trim();
  if (secondaryEmail) {
    methods.push({ label: secondaryEmail, href: `mailto:${secondaryEmail}` });
  }
  const phone = entry.primaryPhone?.trim();
  if (phone) methods.push({ label: phone, href: `tel:${phone}` });
  const secondaryPhone = entry.secondaryPhone?.trim();
  if (secondaryPhone) {
    methods.push({ label: secondaryPhone, href: `tel:${secondaryPhone}` });
  }

  const addressParts = [
    entry.homeLine1,
    entry.homeLine2,
    entry.homeLine3,
    [entry.homeCity, entry.homeState].filter(Boolean).join(', '),
    [entry.homeZip, entry.homeZipExtension].filter(Boolean).join('-'),
  ]
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0);
  if (addressParts.length > 0) {
    methods.push({ label: addressParts.join(', ') });
  } else {
    const place = [entry.homeCity, entry.homeState]
      .map((part) => part?.trim() ?? '')
      .filter((part) => part.length > 0)
      .join(', ');
    if (place) methods.push({ label: place });
  }

  return methods;
}

export function toContactRowContents(entry: AccountRecord): ContactRowContents {
  return {
    displayName: directoryDisplayName(entry) || entry.username || entry.cuid,
    methods: directoryContactMethods(entry),
  };
}
