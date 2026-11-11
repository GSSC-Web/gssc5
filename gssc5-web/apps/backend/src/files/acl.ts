/** File ACL helpers (GSSC5-71). */

// @relation(GSSC-BLLR-367, scope=range_start, role=Implementation)
export const FILE_ROLE_TOKENS = [
  "member",
  "userMod",
  "toolEditor",
  "publicationEditor",
] as const;
// @relation(GSSC-BLLR-367, scope=range_end, role=Implementation)

export type FileRoleToken = (typeof FILE_ROLE_TOKENS)[number];

export type FileAcl = {
  isPublic: boolean;
  readRoles: string[];
  writeRoles: string[];
};

export type FileSessionUser = {
  isAdmin: boolean;
  isUserMod: boolean;
  isToolEditor: boolean;
  isPublicationEditor: boolean;
};

export function isFileRoleToken(value: string): value is FileRoleToken {
  return (FILE_ROLE_TOKENS as readonly string[]).includes(value);
}

export function parseRoleList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function serializeRoleList(roles: string[]): string {
  return JSON.stringify(roles);
}

export function optionalRoleList(value: unknown): string[] | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return "invalid";
  if (!value.every((item) => typeof item === "string" && isFileRoleToken(item))) {
    return "invalid";
  }
  return [...new Set(value as string[])];
}

/** ACL applied when creating under the virtual root with omitted ACL fields. */
export function rootDefaultAcl(): FileAcl {
  return { isPublic: true, readRoles: [], writeRoles: [] };
}

/** Maximum ACL a root child may request (non-loosening ceiling). */
export function rootAclCeiling(): FileAcl {
  return {
    isPublic: true,
    readRoles: [...FILE_ROLE_TOKENS],
    writeRoles: [...FILE_ROLE_TOKENS],
  };
}

export function inheritAcl(parent: FileAcl): FileAcl {
  // @relation(GSSC-BLLR-368, scope=range_start, role=Implementation)
  return {
    isPublic: parent.isPublic,
    readRoles: [...parent.readRoles],
    writeRoles: [...parent.writeRoles],
  };
  // @relation(GSSC-BLLR-368, scope=range_end, role=Implementation)
}

/** True when child would grant broader access than parent. */
export function isLooserThanParent(child: FileAcl, parent: FileAcl): boolean {
  // @relation(GSSC-BLLR-369, scope=range_start, role=Implementation)
  if (child.isPublic && !parent.isPublic) return true;
  for (const role of child.readRoles) {
    if (!parent.readRoles.includes(role)) return true;
  }
  for (const role of child.writeRoles) {
    if (!parent.writeRoles.includes(role)) return true;
  }
  return false;
  // @relation(GSSC-BLLR-369, scope=range_end, role=Implementation)
}

function userHasRole(user: FileSessionUser, role: string): boolean {
  if (role === "member") return true;
  if (role === "userMod") return user.isUserMod;
  if (role === "toolEditor") return user.isToolEditor;
  if (role === "publicationEditor") return user.isPublicationEditor;
  return false;
}

// @relation(GSSC-BLLR-383, scope=range_start, role=Implementation)
function isAdminFileBypass(user: FileSessionUser): boolean {
  return user.isAdmin;
}
// @relation(GSSC-BLLR-383, scope=range_end, role=Implementation)

export function canReadEntry(
  acl: FileAcl,
  user: FileSessionUser | null,
): boolean {
  // @relation(GSSC-BLLR-384, scope=range_start, role=Implementation)
  if (acl.isPublic) return true;
  // @relation(GSSC-BLLR-384, scope=range_end, role=Implementation)
  if (user === null) return false;
  if (isAdminFileBypass(user)) return true;
  // @relation(GSSC-BLLR-385, scope=range_start, role=Implementation)
  return acl.readRoles.some((role) => userHasRole(user, role));
  // @relation(GSSC-BLLR-385, scope=range_end, role=Implementation)
}

export function canWriteEntry(
  acl: FileAcl,
  user: FileSessionUser | null,
): boolean {
  if (user === null) return false;
  if (isAdminFileBypass(user)) return true;
  // @relation(GSSC-BLLR-386, scope=range_start, role=Implementation)
  return acl.writeRoles.some((role) => userHasRole(user, role));
  // @relation(GSSC-BLLR-386, scope=range_end, role=Implementation)
}
