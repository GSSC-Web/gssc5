import { backend } from './backend';

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
  isAdmin?: boolean;
  isUserMod?: boolean;
  isToolEditor?: boolean;
  isPublicationEditor?: boolean;
  isNewsletterEditor?: boolean;
};

export type AccountUpdateBody = Record<string, string | boolean | null>;

/**
 * Treaty calls for account load / update / password change.
 * Mutable object so unit tests can stub without fighting Eden proxies.
 */
export const accountApi = {
  getUser: (cuid: string) => backend.users({ cuid }).get(),
  updateUser: (cuid: string, body: AccountUpdateBody) =>
    backend.users({ cuid }).post(body as never),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    backend.password.change.post(body),
};

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
