import { backend } from './backend';

const ACCOUNT_PHOTOS_ORIGIN = 'http://localhost:3000';

export type AccountRecord = {
  cuid: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  username?: string;
  primaryEmail?: string | null;
  secondaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  preferredContactMethod?: string | null;
  secondaryEmailDisplay?: boolean;
  secondaryPhoneDisplay?: boolean;
  homeLine1?: string | null;
  homeLine2?: string | null;
  homeLine3?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  homeZip?: string | null;
  homeZipExtension?: string | null;
  homeAddressDisplay?: string | null;
  mailingLine1?: string | null;
  mailingLine2?: string | null;
  mailingLine3?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingZip?: string | null;
  mailingZipExtension?: string | null;
  membershipStatus?: string | null;
  position?: string | null;
  accountPhoto?: string | null;
  /** Soft-delete marker when projected (administrators only); string, Date, or epoch. */
  deletedAt?: string | Date | number | null;
  isAdmin?: boolean;
  isUserMod?: boolean;
  isToolEditor?: boolean;
  isPublicationEditor?: boolean;
  isNewsletterEditor?: boolean;
};

export type AccountUpdateBody = Record<string, string | boolean | null>;

export type AccountPhotoUploadResult = { cuid: string; path: string };

/**
 * Treaty calls for account load / update / password change / photo upload.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
/** Minimal Treaty-shaped result for clear-passwords. */
type ClearPasswordsResult = {
  data: unknown;
  error: { status?: number; value?: unknown } | null;
  status?: number;
};

type ClearPasswordsRoutes = {
  'clear-passwords': { post: (body?: Record<string, never>) => Promise<ClearPasswordsResult> };
};

export const accountApi = {
  getUser: (cuid: string) => backend.users({ cuid }).get(),
  updateUser: (cuid: string, body: AccountUpdateBody) =>
    backend.users({ cuid }).patch(body as never),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    backend.password.change.post(body),
  /** Admin/user-mod: delete retained past password hashes (BLLR-263). */
  clearPasswordHistory: (cuid: string) =>
    (backend.users({ cuid }) as unknown as ClearPasswordsRoutes)['clear-passwords'].post({}),
  uploadAccountPhoto: async (
    file: File,
    userCuid: string,
  ): Promise<{
    data: AccountPhotoUploadResult | null;
    error: { status: number; value: unknown } | null;
  }> => {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('userCuid', userCuid);
    const response = await fetch(`${ACCOUNT_PHOTOS_ORIGIN}/account-photos`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!response.ok) {
      return {
        data: null,
        error: { status: response.status, value: await response.text() },
      };
    }
    return {
      data: (await response.json()) as AccountPhotoUploadResult,
      error: null,
    };
  },
};

/** Resolve a stored account photo cuid to the dedicated GET URL. */
export function accountPhotoUrl(
  resource: string | null | undefined,
  origin: string = ACCOUNT_PHOTOS_ORIGIN,
): string | null {
  if (resource === null || resource === undefined) return null;
  const trimmed = resource.trim();
  if (trimmed.length === 0) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/account-photos/')) return `${origin}${trimmed}`;
  return `${origin}/account-photos/${trimmed.replace(/^\/+/, '')}`;
}

export const PASSWORD_MIN_LENGTH = 8;

export const SITE_PRIVILEGES = [
  { key: 'isAdmin', label: 'Administrator' },
  { key: 'isUserMod', label: 'User Moderator' },
  { key: 'isToolEditor', label: 'Tool Editor' },
  { key: 'isPublicationEditor', label: 'Publication Editor' },
  { key: 'isNewsletterEditor', label: 'Newsletter Editor' },
] as const;

export type PrivilegeKey = (typeof SITE_PRIVILEGES)[number]['key'];

export type PasswordCriteria = {
  match: boolean;
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
};

const SPECIALS = "`~!@#$%^&*()_+-={}|[]\\:\";'<>?,./";

export function evaluatePasswordCriteria(
  password: string,
  confirmation: string,
  minimumLength = PASSWORD_MIN_LENGTH,
): PasswordCriteria {
  return {
    match: password.length > 0 && password === confirmation,
    length: password.length >= minimumLength,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: [...password].some((ch) => SPECIALS.includes(ch)),
  };
}

export function passwordCriteriaSatisfied(criteria: PasswordCriteria): boolean {
  return (
    criteria.match &&
    criteria.length &&
    criteria.lower &&
    criteria.upper &&
    criteria.number &&
    criteria.special
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]{7,20}$/;
const ZIP5_PATTERN = /^[0-9]{5}$/;
const ZIP4_PATTERN = /^[0-9]{4}$/;
const STATE_PATTERN = /^[A-Za-z]{2}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

export function isValidZip5(value: string): boolean {
  return ZIP5_PATTERN.test(value.trim());
}

export function isValidZip4(value: string): boolean {
  return ZIP4_PATTERN.test(value.trim());
}

export function isValidState(value: string): boolean {
  return STATE_PATTERN.test(value.trim());
}

export type MemberFieldKey =
  | 'firstName'
  | 'lastName'
  | 'primaryEmail'
  | 'secondaryEmail'
  | 'primaryPhone'
  | 'secondaryPhone'
  | 'preferredContactMethod'
  | 'homeLine1'
  | 'homeCity'
  | 'homeState'
  | 'homeZip'
  | 'homeZipExtension'
  | 'mailingLine1'
  | 'mailingCity'
  | 'mailingState'
  | 'mailingZip'
  | 'mailingZipExtension';

export type AccountFieldKey = 'username';

/** Collect invalid member-info field keys for submit-time red highlighting. */
export function validateMemberInfoFields(form: {
  firstName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  preferredContactMethod: string;
  homeLine1: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  homeZipExtension: string;
  mailingLine1: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  mailingZipExtension: string;
}): Set<MemberFieldKey> {
  const failed = new Set<MemberFieldKey>();
  if (form.firstName.trim() === '') failed.add('firstName');
  if (form.lastName.trim() === '') failed.add('lastName');
  if (form.primaryEmail.trim() === '' || !isValidEmail(form.primaryEmail)) {
    failed.add('primaryEmail');
  }
  if (form.secondaryEmail.trim() !== '' && !isValidEmail(form.secondaryEmail)) {
    failed.add('secondaryEmail');
  }
  if (form.primaryPhone.trim() === '' || !isValidPhone(form.primaryPhone)) {
    failed.add('primaryPhone');
  }
  if (form.secondaryPhone.trim() !== '' && !isValidPhone(form.secondaryPhone)) {
    failed.add('secondaryPhone');
  }
  if (form.preferredContactMethod.trim() === '') failed.add('preferredContactMethod');
  if (form.homeLine1.trim() === '') failed.add('homeLine1');
  if (form.homeCity.trim() === '') failed.add('homeCity');
  if (form.homeState.trim() === '' || !isValidState(form.homeState)) failed.add('homeState');
  if (form.homeZip.trim() === '' || !isValidZip5(form.homeZip)) failed.add('homeZip');
  if (form.homeZipExtension.trim() !== '' && !isValidZip4(form.homeZipExtension)) {
    failed.add('homeZipExtension');
  }
  if (form.mailingLine1.trim() === '') failed.add('mailingLine1');
  if (form.mailingCity.trim() === '') failed.add('mailingCity');
  if (form.mailingState.trim() === '' || !isValidState(form.mailingState)) {
    failed.add('mailingState');
  }
  if (form.mailingZip.trim() === '' || !isValidZip5(form.mailingZip)) failed.add('mailingZip');
  if (form.mailingZipExtension.trim() !== '' && !isValidZip4(form.mailingZipExtension)) {
    failed.add('mailingZipExtension');
  }
  return failed;
}

export function validateAccountInfoFields(form: { username: string }): Set<AccountFieldKey> {
  const failed = new Set<AccountFieldKey>();
  if (form.username.trim() === '') failed.add('username');
  return failed;
}
