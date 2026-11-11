// Account management checks. Each assertion is limited to that requirement's statement.
// forbid is 403, invalidate is 422, and not found is 404. Those checks read the status only,
// except a not-found report that the requirement says is the same for every logged-in caller.
import { randomUUID } from "node:crypto";

import { beforeAll, expect, setSystemTime, test } from "bun:test";

import {
  DAY_MS,
  bootInProcess,
  cellText,
  columnFor,
  establishedLogin,
  insertCopy,
  logout,
  memberPassword,
  memberUsername,
  quote,
  selectAll,
  sqlLiteral,
  type ColumnInfo,
  type InProcessApp,
} from "../test-harness";

type Concept =
  | "cuid"
  | "firstName"
  | "middleName"
  | "lastName"
  | "username"
  | "primaryEmail"
  | "secondaryEmail"
  | "primaryPhone"
  | "secondaryPhone"
  | "preferredContactMethod"
  | "homeLine1"
  | "homeLine2"
  | "homeLine3"
  | "homeCity"
  | "homeState"
  | "homeZip"
  | "homeZipExt"
  | "homeDisplay"
  | "mailLine1"
  | "mailLine2"
  | "mailLine3"
  | "mailCity"
  | "mailState"
  | "mailZip"
  | "mailZipExt"
  | "secondaryEmailDisplay"
  | "secondaryPhoneDisplay"
  | "isAdmin"
  | "isUserMod"
  | "isToolEditor"
  | "isPublicationEditor"
  | "membershipStatus"
  | "position"
  | "passwordHash";

type Value = string | boolean | null;

type Fixture = {
  id: string;
  username: string;
  token: string;
  values: Record<Concept, Value>;
};

type CallResult = {
  status: number;
  text: string;
  entries: Array<Record<string, unknown>>;
  user: Record<string, unknown> | undefined;
};

const ALIASES: Record<Concept, string[]> = {
  cuid: ["cuid", "id"],
  firstName: ["firstname"],
  middleName: ["middlename"],
  lastName: ["lastname"],
  username: ["username"],
  primaryEmail: ["primaryemail"],
  secondaryEmail: ["secondaryemail"],
  primaryPhone: ["primaryphone", "primaryphonenumber"],
  secondaryPhone: ["secondaryphone", "secondaryphonenumber"],
  preferredContactMethod: ["preferredcontactmethod"],
  homeLine1: ["homeline1", "homeaddressline1"],
  homeLine2: ["homeline2", "homeaddressline2"],
  homeLine3: ["homeline3", "homeaddressline3"],
  homeCity: ["homecity", "homeaddresscity"],
  homeState: ["homestate", "homeaddressstate"],
  homeZip: ["homezip", "homezipcode", "homeaddresszip", "homeaddresszipcode"],
  homeZipExt: ["homezipextension", "homeaddresszipextension"],
  homeDisplay: ["homeaddressdisplay"],
  mailLine1: ["mailingline1", "mailingaddressline1"],
  mailLine2: ["mailingline2", "mailingaddressline2"],
  mailLine3: ["mailingline3", "mailingaddressline3"],
  mailCity: ["mailingcity", "mailingaddresscity"],
  mailState: ["mailingstate", "mailingaddressstate"],
  mailZip: ["mailingzip", "mailingzipcode", "mailingaddresszip", "mailingaddresszipcode"],
  mailZipExt: ["mailingzipextension", "mailingaddresszipextension"],
  secondaryEmailDisplay: ["secondaryemaildisplay"],
  secondaryPhoneDisplay: ["secondaryphonedisplay", "secondaryphonenumberdisplay"],
  isAdmin: ["isadmin"],
  isUserMod: ["isusermod"],
  isToolEditor: ["istooleditor"],
  isPublicationEditor: ["ispublicationeditor"],
  membershipStatus: ["membershipstatus"],
  position: ["position"],
  passwordHash: ["passwordhash"],
};

const DEFAULT_KEY: Record<Concept, string> = {
  cuid: "id",
  firstName: "firstName",
  middleName: "middleName",
  lastName: "lastName",
  username: "username",
  primaryEmail: "primaryEmail",
  secondaryEmail: "secondaryEmail",
  primaryPhone: "primaryPhone",
  secondaryPhone: "secondaryPhone",
  preferredContactMethod: "preferredContactMethod",
  homeLine1: "homeLine1",
  homeLine2: "homeLine2",
  homeLine3: "homeLine3",
  homeCity: "homeCity",
  homeState: "homeState",
  homeZip: "homeZip",
  homeZipExt: "homeZipExtension",
  homeDisplay: "homeAddressDisplay",
  mailLine1: "mailingLine1",
  mailLine2: "mailingLine2",
  mailLine3: "mailingLine3",
  mailCity: "mailingCity",
  mailState: "mailingState",
  mailZip: "mailingZip",
  mailZipExt: "mailingZipExtension",
  secondaryEmailDisplay: "secondaryEmailDisplay",
  secondaryPhoneDisplay: "secondaryPhoneDisplay",
  isAdmin: "isAdmin",
  isUserMod: "isUserMod",
  isToolEditor: "isToolEditor",
  isPublicationEditor: "isPublicationEditor",
  membershipStatus: "membershipStatus",
  position: "position",
  passwordHash: "passwordHash",
};

const ACCOUNT_FIELDS = Object.keys(DEFAULT_KEY) as Concept[];
const BOOLEAN_FIELDS = new Set<Concept>([
  "secondaryEmailDisplay",
  "secondaryPhoneDisplay",
  "isAdmin",
  "isUserMod",
  "isToolEditor",
  "isPublicationEditor",
]);

const PASSWORD = "account-secret";

let app: InProcessApp;
let passwordHash = "";
const columnOf = new Map<Concept, string>();
const fieldPath = new Map<Concept, string[]>();

let admin: Fixture;
let moderator: Fixture;
let emailMember: Fixture;
let phoneMember: Fixture;
let noneMember: Fixture;
let redactedMember: Fixture;
let otherAdmin: Fixture;
let mutable: Fixture;

beforeAll(async () => {
  app = await bootInProcess();
  passwordHash = await Bun.password.hash(PASSWORD);
  for (const concept of ACCOUNT_FIELDS) {
    const column = columnForAny(app.columns, ALIASES[concept]);
    if (column) columnOf.set(concept, column);
  }
  admin = await loginExisting();
  moderator = await seedMember("moderator", persona("moderator", { isUserMod: true, membershipStatus: null }));
  emailMember = await seedMember("email", persona("email", { preferredContactMethod: "Email" }));
  phoneMember = await seedMember(
    "phone",
    persona("phone", {
      preferredContactMethod: "Phone",
      firstName: "Quillanetta",
      secondaryEmailDisplay: true,
      secondaryPhoneDisplay: true,
    }),
  );
  noneMember = await seedMember("none", persona("none", { preferredContactMethod: "None" }));
  redactedMember = await seedMember(
    "redacted",
    persona("redacted", {
      preferredContactMethod: "Email",
      homeDisplay: "redacted",
      secondaryEmailDisplay: false,
      secondaryPhoneDisplay: false,
    }),
  );
  otherAdmin = await seedMember("other-admin", persona("other-admin", { isAdmin: true, isUserMod: false }));
  mutable = await seedMember("mutable", persona("mutable", { preferredContactMethod: "Email" }));

  const sample = await readEntry(admin.token, emailMember.id);
  for (const concept of ACCOUNT_FIELDS) {
    if (concept === "passwordHash") continue;
    const found = locate(sample, concept);
    if (!found) {
      throw new Error(
        `${concept} was not in the privileged user read: ${JSON.stringify(sample).slice(0, 2000)}`,
      );
    }
    fieldPath.set(concept, found.parts);
  }
}, 120_000);

function columnForAny(columns: ColumnInfo[], aliases: string[]): string | undefined {
  const found = columns.filter((column) => aliases.includes(normalize(column.name)));
  return found.length === 1 ? found[0]?.name : undefined;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function phoneFor(label: string, which: "primary" | "secondary"): string {
  const codes: Record<string, string> = {
    moderator: "11",
    email: "21",
    phone: "31",
    none: "41",
    redacted: "51",
    "other-admin": "61",
    mutable: "71",
  };
  return `209555${codes[label] ?? "99"}${which === "primary" ? "01" : "02"}`;
}

function persona(label: string, overrides: Partial<Record<Concept, Value>>): Record<Concept, Value> {
  const values: Record<Concept, Value> = {
    cuid: "",
    firstName: "Quillan",
    middleName: `${label}-middle`,
    lastName: `${label}-last`,
    username: `${label}-username`,
    primaryEmail: `${label}.primary@seed.test`,
    secondaryEmail: `${label}.secondary@seed.test`,
    primaryPhone: phoneFor(label, "primary"),
    secondaryPhone: phoneFor(label, "secondary"),
    preferredContactMethod: "Email",
    homeLine1: `${label} home line one`,
    homeLine2: `${label} home line two`,
    homeLine3: `${label} home line three`,
    homeCity: `${label}ville`,
    homeState: `${label}state`,
    homeZip: "95354",
    homeZipExt: "0101",
    homeDisplay: "full",
    mailLine1: `${label} mail line one`,
    mailLine2: `${label} mail line two`,
    mailLine3: `${label} mail line three`,
    mailCity: `${label} mail city`,
    mailState: `${label} mail state`,
    mailZip: "97201",
    mailZipExt: "0202",
    secondaryEmailDisplay: true,
    secondaryPhoneDisplay: true,
    isAdmin: false,
    isUserMod: false,
    isToolEditor: false,
    isPublicationEditor: false,
    membershipStatus: `${label}-roster-status`,
    position: null,
    passwordHash: null,
  };
  return { ...values, ...overrides, username: `${label}-username` };
}

async function loginExisting(): Promise<Fixture> {
  const token = await establishedLogin(app.backend, {
    password: memberPassword,
    username: memberUsername,
  });
  expect(token, "permanent admin can log in").toEqual(expect.any(String));
  const row = (await allRows()).find((item) => cell(item, "username") === memberUsername);
  expect(row, "permanent admin is stored").toBeDefined();
  const id = cell(row ?? {}, "cuid");
  expect(id, "permanent admin cuid").toEqual(expect.any(String));
  return {
    id: id ?? "",
    username: memberUsername,
    token: token ?? "",
    values: valuesFrom(row ?? {}),
  };
}

function valuesFrom(row: Record<string, unknown>): Record<Concept, Value> {
  const values = {} as Record<Concept, Value>;
  for (const concept of ACCOUNT_FIELDS) {
    values[concept] = logical(row, concept);
  }
  return values;
}

async function seedMember(label: string, values: Record<Concept, Value>): Promise<Fixture> {
  const template = app.startupRows[0];
  expect(template, "users table has the permanent admin row").toBeDefined();
  const id = `c${randomUUID().replaceAll("-", "")}`;
  const username = String(values.username);
  const overrides: Record<string, unknown> = {};
  const assign = (concept: Concept, value: unknown) => {
    const column = columnOf.get(concept);
    expect(column, `users table stores ${concept}`).toBeDefined();
    overrides[column ?? ""] = value;
  };
  assign("cuid", id);
  assign("username", username);
  assign("primaryEmail", values.primaryEmail);
  assign("passwordHash", passwordHash);
  for (const concept of ACCOUNT_FIELDS) {
    if (concept === "cuid" || concept === "username" || concept === "primaryEmail" || concept === "passwordHash") {
      continue;
    }
    assign(concept, sqlFor(concept, values[concept]));
  }
  await insertCopy(app.sql, app.table, app.columns, template ?? {}, overrides);
  const token = await establishedLogin(app.backend, { password: PASSWORD, username });
  expect(token, `${label} can log in`).toEqual(expect.any(String));
  const stored = values;
  stored.cuid = id;
  return { id, username, token: token ?? "", values: stored };
}

function sqlFor(concept: Concept, value: Value): unknown {
  if (value === null) return null;
  if (typeof value === "boolean" || BOOLEAN_FIELDS.has(concept)) return value === true || value === "true" ? 1 : 0;
  return value;
}

function logical(row: Record<string, unknown>, concept: Concept): Value {
  const column = columnOf.get(concept);
  if (!column) return null;
  const text = cellText(row[column]);
  if (text === null) return null;
  if (BOOLEAN_FIELDS.has(concept)) return text === "1" || text.toLowerCase() === "true";
  return text;
}

function cell(row: Record<string, unknown>, concept: Concept): string | null {
  const value = logical(row, concept);
  if (value === null || value === undefined) return null;
  return typeof value === "boolean" ? String(value) : value;
}

async function allRows(): Promise<Array<Record<string, unknown>>> {
  return selectAll(app.sql, app.table);
}

async function rowById(id: string): Promise<Record<string, unknown>> {
  const column = columnOf.get("cuid");
  expect(column).toBeDefined();
  const rows = await app.sql.query(
    `SELECT * FROM ${quote(app.table)} WHERE ${quote(column ?? "")} = ${sqlLiteral(id)}`,
  );
  expect(rows).toHaveLength(1);
  const row = rows[0];
  expect(row).toBeDefined();
  return row ?? {};
}

async function snapshot(id: string): Promise<Record<string, string | null>> {
  const row = await rowById(id);
  const stored: Record<string, string | null> = {};
  for (const column of app.columns) stored[column.name] = cellText(row[column.name]);
  return stored;
}

async function restore(id: string, stored: Record<string, string | null>): Promise<void> {
  const idColumn = columnOf.get("cuid") ?? "";
  const assignments = Object.entries(stored)
    .filter(([column]) => column !== idColumn)
    .map(([column, value]) => `${quote(column)} = ${sqlLiteral(value)}`);
  await app.sql.execute(
    `UPDATE ${quote(app.table)} SET ${assignments.join(", ")} WHERE ${quote(idColumn)} = ${sqlLiteral(id)}`,
  );
}

async function withRow(id: string, run: () => Promise<void>): Promise<void> {
  const stored = await snapshot(id);
  try {
    await run();
  } finally {
    await restore(id, stored);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function locate(
  value: unknown,
  concept: Concept,
  parts: string[] = [],
): { parts: string[]; value: unknown } | undefined {
  if (!isRecord(value)) return undefined;
  for (const [key, child] of Object.entries(value)) {
    const next = [...parts, key];
    if (matchesAlias(concept, next)) return { parts: next, value: child };
  }
  for (const [key, child] of Object.entries(value)) {
    if (isRecord(child)) {
      const found = locate(child, concept, [...parts, key]);
      if (found) return found;
    }
  }
  return undefined;
}

function matchesAlias(concept: Concept, parts: string[]): boolean {
  const leaf = normalize(parts[parts.length - 1] ?? "");
  const joined = parts.map((part) => normalize(part)).join("");
  if (concept === "cuid") return parts.length === 1 && ALIASES.cuid.includes(leaf);
  return ALIASES[concept].includes(leaf) || ALIASES[concept].includes(joined);
}

function idOf(entry: Record<string, unknown> | undefined): string | null {
  if (!entry) return null;
  const found = locate(entry, "cuid");
  if (!found || found.value === null || found.value === undefined) return null;
  return String(found.value);
}

function findEntry(
  entries: Array<Record<string, unknown>>,
  id: string,
): Record<string, unknown> | undefined {
  return entries.find((entry) => idOf(entry) === id);
}

function idsOf(entries: Array<Record<string, unknown>>): string[] {
  return entries.map((entry) => idOf(entry) ?? "");
}

function sameValue(concept: Concept, stored: Value, returned: unknown): boolean {
  if (BOOLEAN_FIELDS.has(concept)) {
    return asBoolean(stored) === asBoolean(returned);
  }
  if (stored === null || stored === "") return returned === null || returned === undefined || returned === "";
  return String(returned) === String(stored);
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).toLowerCase();
  return text === "1" || text === "true";
}

function storedIsUnset(value: Value): boolean {
  return value === null || value === "";
}

function queryKey(concept: Concept): string {
  const parts = fieldPath.get(concept);
  if (parts && parts.length === 1) return parts[0] ?? DEFAULT_KEY[concept];
  return DEFAULT_KEY[concept];
}

function assignPath(target: Record<string, unknown>, parts: string[], value: unknown): void {
  if (parts.length === 0) return;
  const [head, ...rest] = parts;
  if (!head) return;
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  const child = target[head];
  const next = isRecord(child) ? child : {};
  target[head] = next;
  assignPath(next, rest, value);
}

function fieldsBody(fields: Partial<Record<Concept, unknown>>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [concept, value] of Object.entries(fields) as Array<[Concept, unknown]>) {
    assignPath(body, fieldPath.get(concept) ?? [DEFAULT_KEY[concept]], value);
  }
  return body;
}

async function call(
  method: "GET" | "POST",
  pathname: string,
  token: string | undefined,
  fields?: Partial<Record<Concept, unknown>>,
  query?: Record<string, string>,
): Promise<CallResult> {
  const url = new URL(`http://127.0.0.1${pathname}`);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const payload = fieldsBody(fields ?? {});
  const sendBody = fields !== undefined && Object.keys(fields).length > 0;
  const headers: Record<string, string> = {};
  if (sendBody) headers["content-type"] = "application/json";
  if (token !== undefined) headers.cookie = `gssc_login_token=${token}`;
  const response = await app.backend(
    new Request(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: sendBody ? JSON.stringify(payload) : undefined,
    }),
  );
  const text = await response.text();
  const parsed = parseJson(text);
  return {
    status: response.status,
    text,
    entries: method === "GET" && pathname === "/users" ? entriesFrom(parsed) : [],
    user: method === "GET" && pathname.startsWith("/users/") ? userFrom(parsed) : undefined,
  };
}

function parseJson(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function entriesFrom(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) return [];
  const arrays = Object.values(body).filter((value): value is unknown[] => Array.isArray(value));
  const objects = arrays
    .map((value) => value.filter(isRecord))
    .sort((left, right) => right.length - left.length)[0];
  return objects ?? [];
}

function userFrom(body: unknown): Record<string, unknown> | undefined {
  if (isRecord(body) && locate(body, "cuid")) return body;
  if (!isRecord(body)) return undefined;
  for (const value of Object.values(body)) {
    if (isRecord(value) && locate(value, "cuid")) return value;
  }
  return isRecord(body) ? body : undefined;
}

async function listEntries(token: string, query?: Record<string, string>): Promise<Array<Record<string, unknown>>> {
  const result = await call("GET", "/users", token, undefined, query);
  expect(result.status, result.text.slice(0, 500)).toBeGreaterThanOrEqual(200);
  expect(result.status).toBeLessThan(300);
  return result.entries;
}

async function readEntry(token: string, id: string): Promise<Record<string, unknown>> {
  const result = await call("GET", `/users/${encodeURIComponent(id)}`, token);
  expect(result.status, result.text.slice(0, 500)).toBeGreaterThanOrEqual(200);
  expect(result.status).toBeLessThan(300);
  expect(result.user, result.text.slice(0, 500)).toBeDefined();
  return result.user ?? {};
}

async function expectStatus(
  status: number,
  method: "GET" | "POST",
  pathname: string,
  token: string | undefined,
  fields?: Partial<Record<Concept, unknown>>,
  query?: Record<string, string>,
): Promise<CallResult> {
  const result = await call(method, pathname, token, fields, query);
  expect(result.status).toBe(status);
  return result;
}

async function expectUnchanged(id: string, before: Record<string, string | null>): Promise<void> {
  expect(await snapshot(id)).toEqual(before);
}

function otherSees(concept: Concept, subject: Fixture): boolean {
  const method = subject.values.preferredContactMethod;
  const email = method === "Email" || method === "None";
  const phone = method === "Phone" || method === "None";
  if (concept === "primaryEmail") return email;
  if (concept === "primaryPhone") return phone;
  if (concept === "secondaryEmail") return subject.values.secondaryEmailDisplay === true && email;
  if (concept === "secondaryPhone") return subject.values.secondaryPhoneDisplay === true && phone;
  if (
    concept === "homeLine1" ||
    concept === "homeLine2" ||
    concept === "homeLine3" ||
    concept === "homeZip" ||
    concept === "homeZipExt"
  ) {
    return subject.values.homeDisplay === "full";
  }
  return false;
}

const SUBJECTS = () => [emailMember, phoneMember, noneMember, redactedMember];

async function viewed(viewer: Fixture, subject: Fixture, source: "list" | "read"): Promise<Record<string, unknown>> {
  if (source === "read") return readEntry(viewer.token, subject.id);
  const entries = await listEntries(viewer.token);
  const entry = findEntry(entries, subject.id);
  expect(entry, `${source} includes ${subject.username}`).toBeDefined();
  return entry ?? {};
}

function expectPresent(entry: Record<string, unknown>, subject: Fixture, concept: Concept): void {
  const found = locate(entry, concept);
  expect(found, `${concept} is returned for ${subject.username}`).toBeDefined();
  expect(sameValue(concept, subject.values[concept], found?.value)).toBe(true);
}

function containsStoredValue(value: unknown, stored: string): boolean {
  if (typeof value === "string") return value === stored;
  if (Array.isArray(value)) return value.some((item) => containsStoredValue(item, stored));
  if (isRecord(value)) return Object.values(value).some((item) => containsStoredValue(item, stored));
  return false;
}

function expectAbsent(entry: Record<string, unknown>, subject: Fixture, concept: Concept): void {
  const found = locate(entry, concept);
  expect(found, `${concept} is omitted for ${subject.username}`).toBeUndefined();
  const stored = subject.values[concept];
  if (typeof stored === "string" && stored !== "") {
    expect(containsStoredValue(entry, stored)).toBe(false);
  }
}

async function expectEveryone(concept: Concept, source: "list" | "read"): Promise<void> {
  for (const viewer of [emailMember, admin]) {
    for (const subject of SUBJECTS()) {
      expectPresent(await viewed(viewer, subject, source), subject, concept);
    }
  }
}

async function expectPrivileged(concept: Concept, source: "list" | "read"): Promise<void> {
  const subject = emailMember;
  expectPresent(await viewed(admin, subject, source), subject, concept);
  expectPresent(await viewed(moderator, subject, source), subject, concept);
  expectPresent(await viewed(subject, subject, source), subject, concept);
  expectAbsent(await viewed(phoneMember, subject, source), subject, concept);
}

async function expectConditional(concept: Concept, source: "list" | "read"): Promise<void> {
  for (const subject of SUBJECTS()) {
    expectPresent(await viewed(admin, subject, source), subject, concept);
    expectPresent(await viewed(moderator, subject, source), subject, concept);
    expectPresent(await viewed(subject, subject, source), subject, concept);
    const entry = await viewed(emailMember === subject ? phoneMember : emailMember, subject, source);
    if (otherSees(concept, subject)) expectPresent(entry, subject, concept);
    else expectAbsent(entry, subject, concept);
  }
}

async function expectSubstringFilter(concept: Concept, viewer: Fixture, subject: Fixture): Promise<void> {
  const stored = String(subject.values[concept] ?? "");
  expect(stored.length).toBeGreaterThan(3);
  const fragment = stored.slice(1, -1).toUpperCase();
  const matched = await listEntries(viewer.token, { [queryKey(concept)]: fragment });
  expect(idsOf(matched)).toContain(subject.id);
  const missed = await listEntries(viewer.token, { [queryKey(concept)]: "nomatchzz" });
  expect(idsOf(missed)).not.toContain(subject.id);
}

async function expectFullValueFilter(
  concept: Concept,
  subject: Fixture,
  other: Fixture,
): Promise<void> {
  const stored = String(subject.values[concept] ?? "");
  const matched = await listEntries(admin.token, { [queryKey(concept)]: stored.toUpperCase() });
  expect(idsOf(matched)).toContain(subject.id);
  expect(idsOf(matched)).not.toContain(other.id);
  const partial = stored.slice(0, -1);
  const missed = await listEntries(admin.token, { [queryKey(concept)]: partial });
  expect(idsOf(missed)).not.toContain(subject.id);
}

async function expectFlagFilter(concept: Concept, yes: Fixture, no: Fixture, ignoreCase: boolean): Promise<void> {
  const truthy = await listEntries(admin.token, { [queryKey(concept)]: "true" });
  expect(idsOf(truthy)).toContain(yes.id);
  expect(idsOf(truthy)).not.toContain(no.id);
  const falsy = await listEntries(admin.token, { [queryKey(concept)]: "false" });
  expect(idsOf(falsy)).toContain(no.id);
  expect(idsOf(falsy)).not.toContain(yes.id);
  if (ignoreCase) {
    const upper = await listEntries(admin.token, { [queryKey(concept)]: "TRUE" });
    expect(idsOf(upper)).toContain(yes.id);
  }
}

async function postField(caller: Fixture, target: Fixture, concept: Concept, value: unknown): Promise<CallResult> {
  return call("POST", `/users/${encodeURIComponent(target.id)}`, caller.token, { [concept]: value });
}

async function expectStored(caller: Fixture, target: Fixture, concept: Concept, value: Value): Promise<void> {
  const result = await postField(caller, target, concept, value);
  expect(result.status, result.text.slice(0, 500)).toBeGreaterThanOrEqual(200);
  expect(result.status).toBeLessThan(300);
  const stored = logical(await rowById(target.id), concept);
  if (value === "") expect(storedIsUnset(stored)).toBe(true);
  else expect(sameValue(concept, value, stored)).toBe(true);
}

async function expectStoredByEachCaller(concept: Concept, value: Value, clear: boolean): Promise<void> {
  await withRow(mutable.id, async () => {
    for (const caller of [admin, mutable, moderator]) {
      await expectStored(caller, mutable, concept, value);
      if (clear) await expectStored(caller, mutable, concept, "");
    }
  });
}

async function expectEmptyRejected(concept: Concept): Promise<void> {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const result = await postField(admin, mutable, concept, "");
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
  });
  await withRow(admin.id, async () => {
    const result = await postField(admin, admin, concept, "");
    expect(result.status, result.text.slice(0, 300)).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
    expect(storedIsUnset(logical(await rowById(admin.id), concept))).toBe(true);
  });
}

async function expectShapeRejected(concept: Concept, value: string): Promise<void> {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const alongside: Partial<Record<Concept, unknown>> = { [concept]: value, firstName: "ShouldNotStick" };
    const result = await call("POST", `/users/${encodeURIComponent(mutable.id)}`, admin.token, alongside);
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
  });
}

async function expiredToken(): Promise<string> {
  const start = Date.now();
  setSystemTime(new Date(start));
  const token = await establishedLogin(app.backend, { password: memberPassword, username: memberUsername });
  expect(token).toEqual(expect.any(String));
  setSystemTime(new Date(start + 7 * DAY_MS));
  return token ?? "";
}

// @relation(GSSC-BLLR-41, scope=range_start, role=Test)
test("GSSC-BLLR-41 User List", async () => {
  const listed = await listEntries(emailMember.token);
  const stored = await allRows();
  expect(new Set(idsOf(listed))).toEqual(new Set(stored.map((row) => cell(row, "cuid") ?? "")));
  expect(idsOf(listed)).toContain(emailMember.id);
  expect(idsOf(listed)).toContain(moderator.id);
});
// @relation(GSSC-BLLR-41, scope=range_end, role=Test)

// @relation(GSSC-BLLR-70, scope=range_start, role=Test)
test("GSSC-BLLR-70 User List cuid", async () => {
  await expectEveryone("cuid", "list");
});
// @relation(GSSC-BLLR-70, scope=range_end, role=Test)

// @relation(GSSC-BLLR-71, scope=range_start, role=Test)
test("GSSC-BLLR-71 User List First Name", async () => {
  await expectEveryone("firstName", "list");
});
// @relation(GSSC-BLLR-71, scope=range_end, role=Test)

// @relation(GSSC-BLLR-72, scope=range_start, role=Test)
test("GSSC-BLLR-72 User List Middle Name", async () => {
  await expectEveryone("middleName", "list");
});
// @relation(GSSC-BLLR-72, scope=range_end, role=Test)

// @relation(GSSC-BLLR-73, scope=range_start, role=Test)
test("GSSC-BLLR-73 User List Last Name", async () => {
  await expectEveryone("lastName", "list");
});
// @relation(GSSC-BLLR-73, scope=range_end, role=Test)

// @relation(GSSC-BLLR-74, scope=range_start, role=Test)
test("GSSC-BLLR-74 User List Username", async () => {
  await expectPrivileged("username", "list");
});
// @relation(GSSC-BLLR-74, scope=range_end, role=Test)

// @relation(GSSC-BLLR-75, scope=range_start, role=Test)
test("GSSC-BLLR-75 User List Primary Email", async () => {
  await expectConditional("primaryEmail", "list");
});
// @relation(GSSC-BLLR-75, scope=range_end, role=Test)

// @relation(GSSC-BLLR-76, scope=range_start, role=Test)
test("GSSC-BLLR-76 User List Secondary Email", async () => {
  await expectConditional("secondaryEmail", "list");
});
// @relation(GSSC-BLLR-76, scope=range_end, role=Test)

// @relation(GSSC-BLLR-77, scope=range_start, role=Test)
test("GSSC-BLLR-77 User List Primary Phone Number", async () => {
  await expectConditional("primaryPhone", "list");
});
// @relation(GSSC-BLLR-77, scope=range_end, role=Test)

// @relation(GSSC-BLLR-78, scope=range_start, role=Test)
test("GSSC-BLLR-78 User List Secondary Phone Number", async () => {
  await expectConditional("secondaryPhone", "list");
});
// @relation(GSSC-BLLR-78, scope=range_end, role=Test)

// @relation(GSSC-BLLR-79, scope=range_start, role=Test)
test("GSSC-BLLR-79 User List Preferred Contact Method", async () => {
  await expectPrivileged("preferredContactMethod", "list");
});
// @relation(GSSC-BLLR-79, scope=range_end, role=Test)

// @relation(GSSC-BLLR-80, scope=range_start, role=Test)
test("GSSC-BLLR-80 User List Home Address line 1", async () => {
  await expectConditional("homeLine1", "list");
});
// @relation(GSSC-BLLR-80, scope=range_end, role=Test)

// @relation(GSSC-BLLR-81, scope=range_start, role=Test)
test("GSSC-BLLR-81 User List Home Address line 2", async () => {
  await expectConditional("homeLine2", "list");
});
// @relation(GSSC-BLLR-81, scope=range_end, role=Test)

// @relation(GSSC-BLLR-82, scope=range_start, role=Test)
test("GSSC-BLLR-82 User List Home Address line 3", async () => {
  await expectConditional("homeLine3", "list");
});
// @relation(GSSC-BLLR-82, scope=range_end, role=Test)

// @relation(GSSC-BLLR-83, scope=range_start, role=Test)
test("GSSC-BLLR-83 User List Home Address city", async () => {
  await expectEveryone("homeCity", "list");
});
// @relation(GSSC-BLLR-83, scope=range_end, role=Test)

// @relation(GSSC-BLLR-84, scope=range_start, role=Test)
test("GSSC-BLLR-84 User List Home Address state", async () => {
  await expectEveryone("homeState", "list");
});
// @relation(GSSC-BLLR-84, scope=range_end, role=Test)

// @relation(GSSC-BLLR-85, scope=range_start, role=Test)
test("GSSC-BLLR-85 User List Home Address zip code", async () => {
  await expectConditional("homeZip", "list");
});
// @relation(GSSC-BLLR-85, scope=range_end, role=Test)

// @relation(GSSC-BLLR-86, scope=range_start, role=Test)
test("GSSC-BLLR-86 User List Home Address zip extension", async () => {
  await expectConditional("homeZipExt", "list");
});
// @relation(GSSC-BLLR-86, scope=range_end, role=Test)

// @relation(GSSC-BLLR-87, scope=range_start, role=Test)
test("GSSC-BLLR-87 User List Home Address display", async () => {
  await expectPrivileged("homeDisplay", "list");
});
// @relation(GSSC-BLLR-87, scope=range_end, role=Test)

// @relation(GSSC-BLLR-88, scope=range_start, role=Test)
test("GSSC-BLLR-88 User List Mailing Address line 1", async () => {
  await expectPrivileged("mailLine1", "list");
});
// @relation(GSSC-BLLR-88, scope=range_end, role=Test)

// @relation(GSSC-BLLR-89, scope=range_start, role=Test)
test("GSSC-BLLR-89 User List Mailing Address line 2", async () => {
  await expectPrivileged("mailLine2", "list");
});
// @relation(GSSC-BLLR-89, scope=range_end, role=Test)

// @relation(GSSC-BLLR-90, scope=range_start, role=Test)
test("GSSC-BLLR-90 User List Mailing Address line 3", async () => {
  await expectPrivileged("mailLine3", "list");
});
// @relation(GSSC-BLLR-90, scope=range_end, role=Test)

// @relation(GSSC-BLLR-91, scope=range_start, role=Test)
test("GSSC-BLLR-91 User List Mailing Address city", async () => {
  await expectPrivileged("mailCity", "list");
});
// @relation(GSSC-BLLR-91, scope=range_end, role=Test)

// @relation(GSSC-BLLR-92, scope=range_start, role=Test)
test("GSSC-BLLR-92 User List Mailing Address state", async () => {
  await expectPrivileged("mailState", "list");
});
// @relation(GSSC-BLLR-92, scope=range_end, role=Test)

// @relation(GSSC-BLLR-93, scope=range_start, role=Test)
test("GSSC-BLLR-93 User List Mailing Address zip code", async () => {
  await expectPrivileged("mailZip", "list");
});
// @relation(GSSC-BLLR-93, scope=range_end, role=Test)

// @relation(GSSC-BLLR-94, scope=range_start, role=Test)
test("GSSC-BLLR-94 User List Mailing Address zip extension", async () => {
  await expectPrivileged("mailZipExt", "list");
});
// @relation(GSSC-BLLR-94, scope=range_end, role=Test)

// @relation(GSSC-BLLR-95, scope=range_start, role=Test)
test("GSSC-BLLR-95 User List Secondary Email display", async () => {
  await expectPrivileged("secondaryEmailDisplay", "list");
});
// @relation(GSSC-BLLR-95, scope=range_end, role=Test)

// @relation(GSSC-BLLR-96, scope=range_start, role=Test)
test("GSSC-BLLR-96 User List Secondary Phone Number display", async () => {
  await expectPrivileged("secondaryPhoneDisplay", "list");
});
// @relation(GSSC-BLLR-96, scope=range_end, role=Test)

// @relation(GSSC-BLLR-97, scope=range_start, role=Test)
test("GSSC-BLLR-97 User List isAdmin", async () => {
  await expectPrivileged("isAdmin", "list");
});
// @relation(GSSC-BLLR-97, scope=range_end, role=Test)

// @relation(GSSC-BLLR-98, scope=range_start, role=Test)
test("GSSC-BLLR-98 User List isUserMod", async () => {
  await expectPrivileged("isUserMod", "list");
});
// @relation(GSSC-BLLR-98, scope=range_end, role=Test)

// @relation(GSSC-BLLR-99, scope=range_start, role=Test)
test("GSSC-BLLR-99 User List Membership Status", async () => {
  await expectPrivileged("membershipStatus", "list");
});
// @relation(GSSC-BLLR-99, scope=range_end, role=Test)

// @relation(GSSC-BLLR-277, scope=range_start, role=Test)
test("GSSC-BLLR-277 User List Position", async () => {
  await expectPrivileged("position", "list");
});
// @relation(GSSC-BLLR-277, scope=range_end, role=Test)

// @relation(GSSC-BLLR-100, scope=range_start, role=Test)
test("GSSC-BLLR-100 User List Password Hash Omitted", async () => {
  const hashes = (await allRows()).map((row) => cell(row, "passwordHash")).filter((value): value is string => !!value);
  expect(hashes.length).toBeGreaterThan(0);
  for (const viewer of [admin, moderator, emailMember]) {
    const result = await call("GET", "/users", viewer.token);
    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
    for (const entry of result.entries) expect(locate(entry, "passwordHash")).toBeUndefined();
    for (const hash of hashes) expect(result.text.includes(hash)).toBe(false);
  }
});
// @relation(GSSC-BLLR-100, scope=range_end, role=Test)

// @relation(GSSC-BLLR-44, scope=range_start, role=Test)
test("GSSC-BLLR-44 User List First Name Filter", async () => {
  await expectSubstringFilter("firstName", emailMember, phoneMember);
});
// @relation(GSSC-BLLR-44, scope=range_end, role=Test)

// @relation(GSSC-BLLR-101, scope=range_start, role=Test)
test("GSSC-BLLR-101 User List Middle Name Filter", async () => {
  await expectSubstringFilter("middleName", admin, emailMember);
});
// @relation(GSSC-BLLR-101, scope=range_end, role=Test)

// @relation(GSSC-BLLR-102, scope=range_start, role=Test)
test("GSSC-BLLR-102 User List Last Name Filter", async () => {
  await expectSubstringFilter("lastName", admin, emailMember);
});
// @relation(GSSC-BLLR-102, scope=range_end, role=Test)

// @relation(GSSC-BLLR-103, scope=range_start, role=Test)
test("GSSC-BLLR-103 User List Username Filter", async () => {
  await expectSubstringFilter("username", admin, emailMember);
  await expectSubstringFilter("username", emailMember, emailMember);
});
// @relation(GSSC-BLLR-103, scope=range_end, role=Test)

// @relation(GSSC-BLLR-104, scope=range_start, role=Test)
test("GSSC-BLLR-104 User List Membership Status Filter", async () => {
  await expectSubstringFilter("membershipStatus", admin, emailMember);
  await expectSubstringFilter("membershipStatus", emailMember, emailMember);
});
// @relation(GSSC-BLLR-104, scope=range_end, role=Test)

// @relation(GSSC-BLLR-105, scope=range_start, role=Test)
test("GSSC-BLLR-105 User List Home Address line 1 Filter", async () => {
  await expectSubstringFilter("homeLine1", admin, emailMember);
});
// @relation(GSSC-BLLR-105, scope=range_end, role=Test)

// @relation(GSSC-BLLR-106, scope=range_start, role=Test)
test("GSSC-BLLR-106 User List Home Address line 2 Filter", async () => {
  await expectSubstringFilter("homeLine2", admin, emailMember);
});
// @relation(GSSC-BLLR-106, scope=range_end, role=Test)

// @relation(GSSC-BLLR-107, scope=range_start, role=Test)
test("GSSC-BLLR-107 User List Home Address line 3 Filter", async () => {
  await expectSubstringFilter("homeLine3", admin, emailMember);
});
// @relation(GSSC-BLLR-107, scope=range_end, role=Test)

// @relation(GSSC-BLLR-108, scope=range_start, role=Test)
test("GSSC-BLLR-108 User List Home Address city Filter", async () => {
  await expectSubstringFilter("homeCity", emailMember, emailMember);
});
// @relation(GSSC-BLLR-108, scope=range_end, role=Test)

// @relation(GSSC-BLLR-109, scope=range_start, role=Test)
test("GSSC-BLLR-109 User List Home Address state Filter", async () => {
  await expectSubstringFilter("homeState", emailMember, emailMember);
});
// @relation(GSSC-BLLR-109, scope=range_end, role=Test)

// @relation(GSSC-BLLR-110, scope=range_start, role=Test)
test("GSSC-BLLR-110 User List Home Address zip code Filter", async () => {
  emailMember.values.homeZip = "95354";
  const matched = await listEntries(admin.token, { [queryKey("homeZip")]: "95354" });
  expect(idsOf(matched)).toContain(emailMember.id);
  const missed = await listEntries(admin.token, { [queryKey("homeZip")]: "00000" });
  expect(idsOf(missed)).not.toContain(emailMember.id);
  const folded = await listEntries(admin.token, { [queryKey("homeZip")]: "953" });
  expect(idsOf(folded)).toContain(emailMember.id);
});
// @relation(GSSC-BLLR-110, scope=range_end, role=Test)

// @relation(GSSC-BLLR-111, scope=range_start, role=Test)
test("GSSC-BLLR-111 User List Home Address zip extension Filter", async () => {
  const matched = await listEntries(admin.token, { [queryKey("homeZipExt")]: "0101" });
  expect(idsOf(matched)).toContain(emailMember.id);
  const missed = await listEntries(admin.token, { [queryKey("homeZipExt")]: "9999" });
  expect(idsOf(missed)).not.toContain(emailMember.id);
});
// @relation(GSSC-BLLR-111, scope=range_end, role=Test)

// @relation(GSSC-BLLR-112, scope=range_start, role=Test)
test("GSSC-BLLR-112 User List Mailing Address line 1 Filter", async () => {
  await expectSubstringFilter("mailLine1", admin, emailMember);
});
// @relation(GSSC-BLLR-112, scope=range_end, role=Test)

// @relation(GSSC-BLLR-113, scope=range_start, role=Test)
test("GSSC-BLLR-113 User List Mailing Address line 2 Filter", async () => {
  await expectSubstringFilter("mailLine2", admin, emailMember);
});
// @relation(GSSC-BLLR-113, scope=range_end, role=Test)

// @relation(GSSC-BLLR-114, scope=range_start, role=Test)
test("GSSC-BLLR-114 User List Mailing Address line 3 Filter", async () => {
  await expectSubstringFilter("mailLine3", admin, emailMember);
});
// @relation(GSSC-BLLR-114, scope=range_end, role=Test)

// @relation(GSSC-BLLR-115, scope=range_start, role=Test)
test("GSSC-BLLR-115 User List Mailing Address city Filter", async () => {
  await expectSubstringFilter("mailCity", admin, emailMember);
});
// @relation(GSSC-BLLR-115, scope=range_end, role=Test)

// @relation(GSSC-BLLR-116, scope=range_start, role=Test)
test("GSSC-BLLR-116 User List Mailing Address state Filter", async () => {
  await expectSubstringFilter("mailState", admin, emailMember);
});
// @relation(GSSC-BLLR-116, scope=range_end, role=Test)

// @relation(GSSC-BLLR-117, scope=range_start, role=Test)
test("GSSC-BLLR-117 User List Mailing Address zip code Filter", async () => {
  const matched = await listEntries(admin.token, { [queryKey("mailZip")]: "97201" });
  expect(idsOf(matched)).toContain(emailMember.id);
  const missed = await listEntries(admin.token, { [queryKey("mailZip")]: "00000" });
  expect(idsOf(missed)).not.toContain(emailMember.id);
});
// @relation(GSSC-BLLR-117, scope=range_end, role=Test)

// @relation(GSSC-BLLR-118, scope=range_start, role=Test)
test("GSSC-BLLR-118 User List Mailing Address zip extension Filter", async () => {
  const matched = await listEntries(admin.token, { [queryKey("mailZipExt")]: "0202" });
  expect(idsOf(matched)).toContain(emailMember.id);
  const missed = await listEntries(admin.token, { [queryKey("mailZipExt")]: "9999" });
  expect(idsOf(missed)).not.toContain(emailMember.id);
});
// @relation(GSSC-BLLR-118, scope=range_end, role=Test)

// @relation(GSSC-BLLR-45, scope=range_start, role=Test)
test("GSSC-BLLR-45 User List Email Filter", async () => {
  const primary = await listEntries(admin.token, { email: "EMAIL.PRIMARY" });
  expect(idsOf(primary)).toContain(emailMember.id);
  expect(idsOf(primary)).not.toContain(phoneMember.id);
  const secondary = await listEntries(admin.token, { email: "PHONE.SECONDARY" });
  expect(idsOf(secondary)).toContain(phoneMember.id);
  expect(idsOf(secondary)).not.toContain(emailMember.id);
});
// @relation(GSSC-BLLR-45, scope=range_end, role=Test)

// @relation(GSSC-BLLR-119, scope=range_start, role=Test)
test("GSSC-BLLR-119 User List Phone Filter", async () => {
  const primary = await listEntries(admin.token, { phone: String(emailMember.values.primaryPhone).slice(0, 7) });
  expect(idsOf(primary)).toContain(emailMember.id);
  const secondary = await listEntries(admin.token, { phone: String(phoneMember.values.secondaryPhone) });
  expect(idsOf(secondary)).toContain(phoneMember.id);
  expect(idsOf(secondary)).not.toContain(emailMember.id);
});
// @relation(GSSC-BLLR-119, scope=range_end, role=Test)

// @relation(GSSC-BLLR-46, scope=range_start, role=Test)
test("GSSC-BLLR-46 User List Preferred Contact Method Filter", async () => {
  await expectFullValueFilter("preferredContactMethod", emailMember, phoneMember);
});
// @relation(GSSC-BLLR-46, scope=range_end, role=Test)

// @relation(GSSC-BLLR-120, scope=range_start, role=Test)
test("GSSC-BLLR-120 User List Home Address display Filter", async () => {
  await expectFullValueFilter("homeDisplay", emailMember, redactedMember);
});
// @relation(GSSC-BLLR-120, scope=range_end, role=Test)

// @relation(GSSC-BLLR-121, scope=range_start, role=Test)
test("GSSC-BLLR-121 User List Secondary Email display Filter", async () => {
  await expectFlagFilter("secondaryEmailDisplay", emailMember, redactedMember, true);
});
// @relation(GSSC-BLLR-121, scope=range_end, role=Test)

// @relation(GSSC-BLLR-122, scope=range_start, role=Test)
test("GSSC-BLLR-122 User List Secondary Phone Number display Filter", async () => {
  await expectFlagFilter("secondaryPhoneDisplay", emailMember, redactedMember, true);
});
// @relation(GSSC-BLLR-122, scope=range_end, role=Test)

// @relation(GSSC-BLLR-123, scope=range_start, role=Test)
test("GSSC-BLLR-123 User List isAdmin Filter", async () => {
  await expectFlagFilter("isAdmin", otherAdmin, emailMember, false);
});
// @relation(GSSC-BLLR-123, scope=range_end, role=Test)

// @relation(GSSC-BLLR-124, scope=range_start, role=Test)
test("GSSC-BLLR-124 User List isUserMod Filter", async () => {
  await expectFlagFilter("isUserMod", moderator, emailMember, false);
});
// @relation(GSSC-BLLR-124, scope=range_end, role=Test)

// @relation(GSSC-BLLR-47, scope=range_start, role=Test)
test("GSSC-BLLR-47 User List Filter Match", async () => {
  const matched = await listEntries(emailMember.token, {
    [queryKey("firstName")]: "quillan",
    [queryKey("homeCity")]: "emailville",
  });
  expect(idsOf(matched)).toContain(emailMember.id);
  expect(idsOf(matched)).not.toContain(phoneMember.id);
});
// @relation(GSSC-BLLR-47, scope=range_end, role=Test)

// @relation(GSSC-BLLR-125, scope=range_start, role=Test)
test("GSSC-BLLR-125 User List Hidden Filter Match", async () => {
  const hidden = emailMember.username;
  const asOther = await listEntries(phoneMember.token, { [queryKey("username")]: hidden });
  expect(idsOf(asOther)).not.toContain(emailMember.id);
  const asAdmin = await listEntries(admin.token, { [queryKey("username")]: hidden });
  expect(idsOf(asAdmin)).toContain(emailMember.id);
  const asModerator = await listEntries(moderator.token, { [queryKey("username")]: hidden });
  expect(idsOf(asModerator)).toContain(emailMember.id);
});
// @relation(GSSC-BLLR-125, scope=range_end, role=Test)

// @relation(GSSC-BLLR-42, scope=range_start, role=Test)
test("GSSC-BLLR-42 User List Missing Login Token", async () => {
  await expectStatus(403, "GET", "/users", undefined);
});
// @relation(GSSC-BLLR-42, scope=range_end, role=Test)

// @relation(GSSC-BLLR-67, scope=range_start, role=Test)
test("GSSC-BLLR-67 User List Unknown Login Token", async () => {
  await expectStatus(403, "GET", "/users", `unknown-${randomUUID()}`);
});
// @relation(GSSC-BLLR-67, scope=range_end, role=Test)

// @relation(GSSC-BLLR-68, scope=range_start, role=Test)
test("GSSC-BLLR-68 User List Logged-Out Login Token", async () => {
  const token = await establishedLogin(app.backend, { password: PASSWORD, username: emailMember.username });
  expect(token).toEqual(expect.any(String));
  await logout(app.backend, token ?? "");
  await expectStatus(403, "GET", "/users", token ?? "");
});
// @relation(GSSC-BLLR-68, scope=range_end, role=Test)

// @relation(GSSC-BLLR-69, scope=range_start, role=Test)
test("GSSC-BLLR-69 User List Expired Login Token", async () => {
  try {
    await expectStatus(403, "GET", "/users", await expiredToken());
  } finally {
    setSystemTime();
  }
});
// @relation(GSSC-BLLR-69, scope=range_end, role=Test)

// @relation(GSSC-BLLR-126, scope=range_start, role=Test)
test("GSSC-BLLR-126 User List Primary Email Filter Rejected", async () => {
  await expectStatus(422, "GET", "/users", admin.token, undefined, {
    [queryKey("primaryEmail")]: String(emailMember.values.primaryEmail),
  });
});
// @relation(GSSC-BLLR-126, scope=range_end, role=Test)

// @relation(GSSC-BLLR-127, scope=range_start, role=Test)
test("GSSC-BLLR-127 User List Secondary Email Filter Rejected", async () => {
  await expectStatus(422, "GET", "/users", admin.token, undefined, {
    [queryKey("secondaryEmail")]: String(emailMember.values.secondaryEmail),
  });
});
// @relation(GSSC-BLLR-127, scope=range_end, role=Test)

// @relation(GSSC-BLLR-128, scope=range_start, role=Test)
test("GSSC-BLLR-128 User List Primary Phone Filter Rejected", async () => {
  await expectStatus(422, "GET", "/users", admin.token, undefined, {
    [queryKey("primaryPhone")]: String(emailMember.values.primaryPhone),
  });
});
// @relation(GSSC-BLLR-128, scope=range_end, role=Test)

// @relation(GSSC-BLLR-129, scope=range_start, role=Test)
test("GSSC-BLLR-129 User List Secondary Phone Filter Rejected", async () => {
  await expectStatus(422, "GET", "/users", admin.token, undefined, {
    [queryKey("secondaryPhone")]: String(emailMember.values.secondaryPhone),
  });
});
// @relation(GSSC-BLLR-129, scope=range_end, role=Test)

// @relation(GSSC-BLLR-130, scope=range_start, role=Test)
test("GSSC-BLLR-130 User List Hidden Field Filter", async () => {
  await expectStatus(422, "GET", "/users", emailMember.token, undefined, { position: "chair" });
});
// @relation(GSSC-BLLR-130, scope=range_end, role=Test)

// @relation(GSSC-BLLR-131, scope=range_start, role=Test)
test("GSSC-BLLR-131 User List Cuid Filter", async () => {
  await expectStatus(422, "GET", "/users", admin.token, undefined, { [queryKey("cuid")]: emailMember.id });
});
// @relation(GSSC-BLLR-131, scope=range_end, role=Test)

// @relation(GSSC-BLLR-132, scope=range_start, role=Test)
test("GSSC-BLLR-132 User List Password Hash Filter", async () => {
  await expectStatus(422, "GET", "/users", admin.token, undefined, {
    [queryKey("passwordHash")]: "hash",
  });
});
// @relation(GSSC-BLLR-132, scope=range_end, role=Test)

// @relation(GSSC-BLLR-49, scope=range_start, role=Test)
test("GSSC-BLLR-49 User Read Subject", async () => {
  const entry = await readEntry(phoneMember.token, emailMember.id);
  expect(idOf(entry)).toBe(emailMember.id);
  expect(locate(entry, "firstName")?.value).toBe(emailMember.values.firstName);
  expect(locate(entry, "firstName")?.value).not.toBe(phoneMember.values.firstName);
});
// @relation(GSSC-BLLR-49, scope=range_end, role=Test)

// @relation(GSSC-BLLR-136, scope=range_start, role=Test)
test("GSSC-BLLR-136 User Read cuid", async () => {
  await expectEveryone("cuid", "read");
});
// @relation(GSSC-BLLR-136, scope=range_end, role=Test)

// @relation(GSSC-BLLR-137, scope=range_start, role=Test)
test("GSSC-BLLR-137 User Read First Name", async () => {
  await expectEveryone("firstName", "read");
});
// @relation(GSSC-BLLR-137, scope=range_end, role=Test)

// @relation(GSSC-BLLR-138, scope=range_start, role=Test)
test("GSSC-BLLR-138 User Read Middle Name", async () => {
  await expectEveryone("middleName", "read");
});
// @relation(GSSC-BLLR-138, scope=range_end, role=Test)

// @relation(GSSC-BLLR-139, scope=range_start, role=Test)
test("GSSC-BLLR-139 User Read Last Name", async () => {
  await expectEveryone("lastName", "read");
});
// @relation(GSSC-BLLR-139, scope=range_end, role=Test)

// @relation(GSSC-BLLR-140, scope=range_start, role=Test)
test("GSSC-BLLR-140 User Read Username", async () => {
  await expectPrivileged("username", "read");
});
// @relation(GSSC-BLLR-140, scope=range_end, role=Test)

// @relation(GSSC-BLLR-141, scope=range_start, role=Test)
test("GSSC-BLLR-141 User Read Primary Email", async () => {
  await expectConditional("primaryEmail", "read");
});
// @relation(GSSC-BLLR-141, scope=range_end, role=Test)

// @relation(GSSC-BLLR-142, scope=range_start, role=Test)
test("GSSC-BLLR-142 User Read Secondary Email", async () => {
  await expectConditional("secondaryEmail", "read");
});
// @relation(GSSC-BLLR-142, scope=range_end, role=Test)

// @relation(GSSC-BLLR-143, scope=range_start, role=Test)
test("GSSC-BLLR-143 User Read Primary Phone Number", async () => {
  await expectConditional("primaryPhone", "read");
});
// @relation(GSSC-BLLR-143, scope=range_end, role=Test)

// @relation(GSSC-BLLR-144, scope=range_start, role=Test)
test("GSSC-BLLR-144 User Read Secondary Phone Number", async () => {
  await expectConditional("secondaryPhone", "read");
});
// @relation(GSSC-BLLR-144, scope=range_end, role=Test)

// @relation(GSSC-BLLR-145, scope=range_start, role=Test)
test("GSSC-BLLR-145 User Read Preferred Contact Method", async () => {
  await expectPrivileged("preferredContactMethod", "read");
});
// @relation(GSSC-BLLR-145, scope=range_end, role=Test)

// @relation(GSSC-BLLR-146, scope=range_start, role=Test)
test("GSSC-BLLR-146 User Read Home Address line 1", async () => {
  await expectConditional("homeLine1", "read");
});
// @relation(GSSC-BLLR-146, scope=range_end, role=Test)

// @relation(GSSC-BLLR-147, scope=range_start, role=Test)
test("GSSC-BLLR-147 User Read Home Address line 2", async () => {
  await expectConditional("homeLine2", "read");
});
// @relation(GSSC-BLLR-147, scope=range_end, role=Test)

// @relation(GSSC-BLLR-148, scope=range_start, role=Test)
test("GSSC-BLLR-148 User Read Home Address line 3", async () => {
  await expectConditional("homeLine3", "read");
});
// @relation(GSSC-BLLR-148, scope=range_end, role=Test)

// @relation(GSSC-BLLR-149, scope=range_start, role=Test)
test("GSSC-BLLR-149 User Read Home Address city", async () => {
  await expectEveryone("homeCity", "read");
});
// @relation(GSSC-BLLR-149, scope=range_end, role=Test)

// @relation(GSSC-BLLR-150, scope=range_start, role=Test)
test("GSSC-BLLR-150 User Read Home Address state", async () => {
  await expectEveryone("homeState", "read");
});
// @relation(GSSC-BLLR-150, scope=range_end, role=Test)

// @relation(GSSC-BLLR-151, scope=range_start, role=Test)
test("GSSC-BLLR-151 User Read Home Address zip code", async () => {
  await expectConditional("homeZip", "read");
});
// @relation(GSSC-BLLR-151, scope=range_end, role=Test)

// @relation(GSSC-BLLR-152, scope=range_start, role=Test)
test("GSSC-BLLR-152 User Read Home Address zip extension", async () => {
  await expectConditional("homeZipExt", "read");
});
// @relation(GSSC-BLLR-152, scope=range_end, role=Test)

// @relation(GSSC-BLLR-153, scope=range_start, role=Test)
test("GSSC-BLLR-153 User Read Home Address display", async () => {
  await expectPrivileged("homeDisplay", "read");
});
// @relation(GSSC-BLLR-153, scope=range_end, role=Test)

// @relation(GSSC-BLLR-154, scope=range_start, role=Test)
test("GSSC-BLLR-154 User Read Mailing Address line 1", async () => {
  await expectPrivileged("mailLine1", "read");
});
// @relation(GSSC-BLLR-154, scope=range_end, role=Test)

// @relation(GSSC-BLLR-155, scope=range_start, role=Test)
test("GSSC-BLLR-155 User Read Mailing Address line 2", async () => {
  await expectPrivileged("mailLine2", "read");
});
// @relation(GSSC-BLLR-155, scope=range_end, role=Test)

// @relation(GSSC-BLLR-156, scope=range_start, role=Test)
test("GSSC-BLLR-156 User Read Mailing Address line 3", async () => {
  await expectPrivileged("mailLine3", "read");
});
// @relation(GSSC-BLLR-156, scope=range_end, role=Test)

// @relation(GSSC-BLLR-157, scope=range_start, role=Test)
test("GSSC-BLLR-157 User Read Mailing Address city", async () => {
  await expectPrivileged("mailCity", "read");
});
// @relation(GSSC-BLLR-157, scope=range_end, role=Test)

// @relation(GSSC-BLLR-158, scope=range_start, role=Test)
test("GSSC-BLLR-158 User Read Mailing Address state", async () => {
  await expectPrivileged("mailState", "read");
});
// @relation(GSSC-BLLR-158, scope=range_end, role=Test)

// @relation(GSSC-BLLR-159, scope=range_start, role=Test)
test("GSSC-BLLR-159 User Read Mailing Address zip code", async () => {
  await expectPrivileged("mailZip", "read");
});
// @relation(GSSC-BLLR-159, scope=range_end, role=Test)

// @relation(GSSC-BLLR-160, scope=range_start, role=Test)
test("GSSC-BLLR-160 User Read Mailing Address zip extension", async () => {
  await expectPrivileged("mailZipExt", "read");
});
// @relation(GSSC-BLLR-160, scope=range_end, role=Test)

// @relation(GSSC-BLLR-161, scope=range_start, role=Test)
test("GSSC-BLLR-161 User Read Secondary Email display", async () => {
  await expectPrivileged("secondaryEmailDisplay", "read");
});
// @relation(GSSC-BLLR-161, scope=range_end, role=Test)

// @relation(GSSC-BLLR-162, scope=range_start, role=Test)
test("GSSC-BLLR-162 User Read Secondary Phone Number display", async () => {
  await expectPrivileged("secondaryPhoneDisplay", "read");
});
// @relation(GSSC-BLLR-162, scope=range_end, role=Test)

// @relation(GSSC-BLLR-163, scope=range_start, role=Test)
test("GSSC-BLLR-163 User Read isAdmin", async () => {
  await expectPrivileged("isAdmin", "read");
});
// @relation(GSSC-BLLR-163, scope=range_end, role=Test)

// @relation(GSSC-BLLR-164, scope=range_start, role=Test)
test("GSSC-BLLR-164 User Read isUserMod", async () => {
  await expectPrivileged("isUserMod", "read");
});
// @relation(GSSC-BLLR-164, scope=range_end, role=Test)

// @relation(GSSC-BLLR-165, scope=range_start, role=Test)
test("GSSC-BLLR-165 User Read Membership Status", async () => {
  await expectPrivileged("membershipStatus", "read");
});
// @relation(GSSC-BLLR-165, scope=range_end, role=Test)

// @relation(GSSC-BLLR-278, scope=range_start, role=Test)
test("GSSC-BLLR-278 User Read Position", async () => {
  await expectPrivileged("position", "read");
});
// @relation(GSSC-BLLR-278, scope=range_end, role=Test)

// @relation(GSSC-BLLR-54, scope=range_start, role=Test)
test("GSSC-BLLR-54 Password Hash Omitted", async () => {
  const hash = cell(await rowById(emailMember.id), "passwordHash");
  expect(hash).toEqual(expect.any(String));
  for (const viewer of [admin, moderator, emailMember, phoneMember]) {
    const result = await call("GET", `/users/${encodeURIComponent(emailMember.id)}`, viewer.token);
    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
    expect(locate(result.user ?? {}, "passwordHash")).toBeUndefined();
    expect(result.text.includes(hash ?? "missing-hash")).toBe(false);
  }
});
// @relation(GSSC-BLLR-54, scope=range_end, role=Test)

// @relation(GSSC-BLLR-48, scope=range_start, role=Test)
test("GSSC-BLLR-48 User Read Missing Login Token", async () => {
  await expectStatus(403, "GET", `/users/${encodeURIComponent(emailMember.id)}`, undefined);
});
// @relation(GSSC-BLLR-48, scope=range_end, role=Test)

// @relation(GSSC-BLLR-133, scope=range_start, role=Test)
test("GSSC-BLLR-133 User Read Unknown Login Token", async () => {
  await expectStatus(403, "GET", `/users/${encodeURIComponent(emailMember.id)}`, `unknown-${randomUUID()}`);
});
// @relation(GSSC-BLLR-133, scope=range_end, role=Test)

// @relation(GSSC-BLLR-134, scope=range_start, role=Test)
test("GSSC-BLLR-134 User Read Logged-Out Login Token", async () => {
  const token = await establishedLogin(app.backend, { password: PASSWORD, username: emailMember.username });
  expect(token).toEqual(expect.any(String));
  await logout(app.backend, token ?? "");
  await expectStatus(403, "GET", `/users/${encodeURIComponent(emailMember.id)}`, token ?? "");
});
// @relation(GSSC-BLLR-134, scope=range_end, role=Test)

// @relation(GSSC-BLLR-135, scope=range_start, role=Test)
test("GSSC-BLLR-135 User Read Expired Login Token", async () => {
  try {
    await expectStatus(403, "GET", `/users/${encodeURIComponent(emailMember.id)}`, await expiredToken());
  } finally {
    setSystemTime();
  }
});
// @relation(GSSC-BLLR-135, scope=range_end, role=Test)

// @relation(GSSC-BLLR-55, scope=range_start, role=Test)
test("GSSC-BLLR-55 User Not Found", async () => {
  const missing = `missing-${randomUUID()}`;
  const reports: Array<{ status: number; text: string }> = [];
  for (const viewer of [admin, emailMember, moderator]) {
    const result = await call("GET", `/users/${encodeURIComponent(missing)}`, viewer.token);
    reports.push({ status: result.status, text: result.text });
  }
  expect(reports[0]?.status).toBe(404);
  expect(reports[1]).toEqual(reports[0]);
  expect(reports[2]).toEqual(reports[0]);
});
// @relation(GSSC-BLLR-55, scope=range_end, role=Test)

// @relation(GSSC-BLLR-58, scope=range_start, role=Test)
test("GSSC-BLLR-58 Administrator User Update", async () => {
  await withRow(otherAdmin.id, async () => {
    await expectStored(admin, otherAdmin, "firstName", "Admin Edited Other");
  });
  await withRow(admin.id, async () => {
    await expectStored(admin, admin, "firstName", "Admin Edited Self");
  });
});
// @relation(GSSC-BLLR-58, scope=range_end, role=Test)

// @relation(GSSC-BLLR-169, scope=range_start, role=Test)
test("GSSC-BLLR-169 Own User Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(mutable, mutable, "firstName", "Member Edited Self");
  });
});
// @relation(GSSC-BLLR-169, scope=range_end, role=Test)

// @relation(GSSC-BLLR-170, scope=range_start, role=Test)
test("GSSC-BLLR-170 User Moderator User Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(moderator, mutable, "firstName", "Moderator Edited Member");
  });
  await withRow(moderator.id, async () => {
    await expectStored(moderator, moderator, "firstName", "Moderator Edited Self");
  });
});
// @relation(GSSC-BLLR-170, scope=range_end, role=Test)

// @relation(GSSC-BLLR-172, scope=range_start, role=Test)
test("GSSC-BLLR-172 User Update Omitted Fields", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    await expectStored(admin, mutable, "firstName", "Only First Name");
    const after = await snapshot(mutable.id);
    const firstName = columnOf.get("firstName") ?? "";
    for (const [column, value] of Object.entries(before)) {
      if (column === firstName) continue;
      if (normalize(column) === "updatedat" || normalize(column) === "createdat") continue;
      expect(after[column]).toBe(value);
    }
  });
});
// @relation(GSSC-BLLR-172, scope=range_end, role=Test)

// @relation(GSSC-BLLR-174, scope=range_start, role=Test)
test("GSSC-BLLR-174 User Update First Name", async () => {
  await expectStoredByEachCaller("firstName", "Posted First", false);
});
// @relation(GSSC-BLLR-174, scope=range_end, role=Test)

// @relation(GSSC-BLLR-176, scope=range_start, role=Test)
test("GSSC-BLLR-176 User Update Middle Name", async () => {
  await expectStoredByEachCaller("middleName", "Posted Middle", true);
});
// @relation(GSSC-BLLR-176, scope=range_end, role=Test)

// @relation(GSSC-BLLR-177, scope=range_start, role=Test)
test("GSSC-BLLR-177 User Update Last Name", async () => {
  await expectStoredByEachCaller("lastName", "Posted Last", false);
});
// @relation(GSSC-BLLR-177, scope=range_end, role=Test)

// @relation(GSSC-BLLR-179, scope=range_start, role=Test)
test("GSSC-BLLR-179 User Update Primary Email", async () => {
  await expectStoredByEachCaller("primaryEmail", "posted.primary@seed.test", false);
});
// @relation(GSSC-BLLR-179, scope=range_end, role=Test)

// @relation(GSSC-BLLR-181, scope=range_start, role=Test)
test("GSSC-BLLR-181 User Update Secondary Email", async () => {
  await expectStoredByEachCaller("secondaryEmail", "posted.secondary@seed.test", true);
});
// @relation(GSSC-BLLR-181, scope=range_end, role=Test)

// @relation(GSSC-BLLR-182, scope=range_start, role=Test)
test("GSSC-BLLR-182 User Update Primary Phone Number", async () => {
  await expectStoredByEachCaller("primaryPhone", "2095557777", false);
});
// @relation(GSSC-BLLR-182, scope=range_end, role=Test)

// @relation(GSSC-BLLR-184, scope=range_start, role=Test)
test("GSSC-BLLR-184 User Update Secondary Phone Number", async () => {
  await expectStoredByEachCaller("secondaryPhone", "2095558888", true);
});
// @relation(GSSC-BLLR-184, scope=range_end, role=Test)

// @relation(GSSC-BLLR-185, scope=range_start, role=Test)
test("GSSC-BLLR-185 User Update Preferred Contact Method", async () => {
  await expectStoredByEachCaller("preferredContactMethod", "Phone", false);
});
// @relation(GSSC-BLLR-185, scope=range_end, role=Test)

// @relation(GSSC-BLLR-187, scope=range_start, role=Test)
test("GSSC-BLLR-187 User Update Home Address line 1", async () => {
  await expectStoredByEachCaller("homeLine1", "Posted home line one", false);
});
// @relation(GSSC-BLLR-187, scope=range_end, role=Test)

// @relation(GSSC-BLLR-189, scope=range_start, role=Test)
test("GSSC-BLLR-189 User Update Home Address line 2", async () => {
  await expectStoredByEachCaller("homeLine2", "Posted home line two", true);
});
// @relation(GSSC-BLLR-189, scope=range_end, role=Test)

// @relation(GSSC-BLLR-190, scope=range_start, role=Test)
test("GSSC-BLLR-190 User Update Home Address line 3", async () => {
  await expectStoredByEachCaller("homeLine3", "Posted home line three", true);
});
// @relation(GSSC-BLLR-190, scope=range_end, role=Test)

// @relation(GSSC-BLLR-191, scope=range_start, role=Test)
test("GSSC-BLLR-191 User Update Home Address city", async () => {
  await expectStoredByEachCaller("homeCity", "Posted City", false);
});
// @relation(GSSC-BLLR-191, scope=range_end, role=Test)

// @relation(GSSC-BLLR-193, scope=range_start, role=Test)
test("GSSC-BLLR-193 User Update Home Address state", async () => {
  await expectStoredByEachCaller("homeState", "Posted State", false);
});
// @relation(GSSC-BLLR-193, scope=range_end, role=Test)

// @relation(GSSC-BLLR-195, scope=range_start, role=Test)
test("GSSC-BLLR-195 User Update Home Address zip code", async () => {
  await expectStoredByEachCaller("homeZip", "12345", false);
});
// @relation(GSSC-BLLR-195, scope=range_end, role=Test)

// @relation(GSSC-BLLR-197, scope=range_start, role=Test)
test("GSSC-BLLR-197 User Update Home Address zip extension", async () => {
  await expectStoredByEachCaller("homeZipExt", "1234", true);
});
// @relation(GSSC-BLLR-197, scope=range_end, role=Test)

// @relation(GSSC-BLLR-198, scope=range_start, role=Test)
test("GSSC-BLLR-198 User Update Mailing Address line 1", async () => {
  await expectStoredByEachCaller("mailLine1", "Posted mail line one", false);
});
// @relation(GSSC-BLLR-198, scope=range_end, role=Test)

// @relation(GSSC-BLLR-200, scope=range_start, role=Test)
test("GSSC-BLLR-200 User Update Mailing Address line 2", async () => {
  await expectStoredByEachCaller("mailLine2", "Posted mail line two", true);
});
// @relation(GSSC-BLLR-200, scope=range_end, role=Test)

// @relation(GSSC-BLLR-201, scope=range_start, role=Test)
test("GSSC-BLLR-201 User Update Mailing Address line 3", async () => {
  await expectStoredByEachCaller("mailLine3", "Posted mail line three", true);
});
// @relation(GSSC-BLLR-201, scope=range_end, role=Test)

// @relation(GSSC-BLLR-202, scope=range_start, role=Test)
test("GSSC-BLLR-202 User Update Mailing Address city", async () => {
  await expectStoredByEachCaller("mailCity", "Posted Mail City", false);
});
// @relation(GSSC-BLLR-202, scope=range_end, role=Test)

// @relation(GSSC-BLLR-204, scope=range_start, role=Test)
test("GSSC-BLLR-204 User Update Mailing Address state", async () => {
  await expectStoredByEachCaller("mailState", "Posted Mail State", false);
});
// @relation(GSSC-BLLR-204, scope=range_end, role=Test)

// @relation(GSSC-BLLR-206, scope=range_start, role=Test)
test("GSSC-BLLR-206 User Update Mailing Address zip code", async () => {
  await expectStoredByEachCaller("mailZip", "54321", false);
});
// @relation(GSSC-BLLR-206, scope=range_end, role=Test)

// @relation(GSSC-BLLR-208, scope=range_start, role=Test)
test("GSSC-BLLR-208 User Update Mailing Address zip extension", async () => {
  await expectStoredByEachCaller("mailZipExt", "4321", true);
});
// @relation(GSSC-BLLR-208, scope=range_end, role=Test)

// @relation(GSSC-BLLR-209, scope=range_start, role=Test)
test("GSSC-BLLR-209 User Update Home Address Display", async () => {
  await expectStoredByEachCaller("homeDisplay", "redacted", false);
  await expectStoredByEachCaller("homeDisplay", "full", false);
});
// @relation(GSSC-BLLR-209, scope=range_end, role=Test)

// @relation(GSSC-BLLR-211, scope=range_start, role=Test)
test("GSSC-BLLR-211 User Update Secondary Email Display", async () => {
  await expectStoredByEachCaller("secondaryEmailDisplay", false, false);
  await expectStoredByEachCaller("secondaryEmailDisplay", true, false);
});
// @relation(GSSC-BLLR-211, scope=range_end, role=Test)

// @relation(GSSC-BLLR-212, scope=range_start, role=Test)
test("GSSC-BLLR-212 User Update Secondary Phone Number Display", async () => {
  await expectStoredByEachCaller("secondaryPhoneDisplay", false, false);
  await expectStoredByEachCaller("secondaryPhoneDisplay", true, false);
});
// @relation(GSSC-BLLR-212, scope=range_end, role=Test)

// @relation(GSSC-BLLR-65, scope=range_start, role=Test)
test("GSSC-BLLR-65 Username Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "username", "posted-by-admin");
    await expectStored(mutable, mutable, "username", "posted-by-self");
    await expectStored(moderator, mutable, "username", "posted-by-moderator");
  });
});
// @relation(GSSC-BLLR-65, scope=range_end, role=Test)

// @relation(GSSC-BLLR-61, scope=range_start, role=Test)
test("GSSC-BLLR-61 Permission Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "isAdmin", true);
    await expectStored(admin, mutable, "isAdmin", false);
  });
});
// @relation(GSSC-BLLR-61, scope=range_end, role=Test)

// @relation(GSSC-BLLR-220, scope=range_start, role=Test)
test("GSSC-BLLR-220 User Is User Mod Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "isUserMod", true);
    await expectStored(admin, mutable, "isUserMod", false);
  });
});
// @relation(GSSC-BLLR-220, scope=range_end, role=Test)

// @relation(GSSC-BLLR-353, scope=range_start, role=Test)
test("GSSC-BLLR-353 Administrator Sets Tool Editor", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "isToolEditor", true);
    await expectStored(admin, mutable, "isToolEditor", false);
  });
});
// @relation(GSSC-BLLR-353, scope=range_end, role=Test)

// @relation(GSSC-BLLR-364, scope=range_start, role=Test)
test("GSSC-BLLR-364 Administrator Sets Publication Editor", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "isPublicationEditor", true);
    await expectStored(admin, mutable, "isPublicationEditor", false);
  });
});
// @relation(GSSC-BLLR-364, scope=range_end, role=Test)

// @relation(GSSC-BLLR-66, scope=range_start, role=Test)
test("GSSC-BLLR-66 Membership Status Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "membershipStatus", "posted-status");
    await expectStored(moderator, mutable, "membershipStatus", "moderator-status");
    await expectStored(admin, mutable, "membershipStatus", "");
  });
  await withRow(otherAdmin.id, async () => {
    await expectStored(admin, otherAdmin, "membershipStatus", "admin-target-status");
  });
});
// @relation(GSSC-BLLR-66, scope=range_end, role=Test)

// @relation(GSSC-BLLR-279, scope=range_start, role=Test)
test("GSSC-BLLR-279 Administrator Position Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "position", "President");
  });
  await withRow(admin.id, async () => {
    await expectStored(admin, admin, "position", "Admin Office");
  });
  await withRow(otherAdmin.id, async () => {
    await expectStored(admin, otherAdmin, "position", "Other Admin Office");
  });
});
// @relation(GSSC-BLLR-279, scope=range_end, role=Test)

// @relation(GSSC-BLLR-280, scope=range_start, role=Test)
test("GSSC-BLLR-280 User Moderator Position Update", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(moderator, mutable, "position", "Secretary");
  });
});
// @relation(GSSC-BLLR-280, scope=range_end, role=Test)

// @relation(GSSC-BLLR-281, scope=range_start, role=Test)
test("GSSC-BLLR-281 Position Clear", async () => {
  await withRow(mutable.id, async () => {
    await expectStored(admin, mutable, "position", "Treasurer");
    await expectStored(admin, mutable, "position", "");
    expect(storedIsUnset(logical(await rowById(mutable.id), "position"))).toBe(true);
  });
});
// @relation(GSSC-BLLR-281, scope=range_end, role=Test)

// @relation(GSSC-BLLR-56, scope=range_start, role=Test)
test("GSSC-BLLR-56 User Update Missing Login Token", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    await expectStatus(403, "POST", `/users/${encodeURIComponent(mutable.id)}`, undefined, {
      firstName: "Missing Token",
    });
    await expectUnchanged(mutable.id, before);
  });
});
// @relation(GSSC-BLLR-56, scope=range_end, role=Test)

// @relation(GSSC-BLLR-166, scope=range_start, role=Test)
test("GSSC-BLLR-166 User Update Unknown Login Token", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    await expectStatus(403, "POST", `/users/${encodeURIComponent(mutable.id)}`, `unknown-${randomUUID()}`, {
      firstName: "Unknown Token",
    });
    await expectUnchanged(mutable.id, before);
  });
});
// @relation(GSSC-BLLR-166, scope=range_end, role=Test)

// @relation(GSSC-BLLR-167, scope=range_start, role=Test)
test("GSSC-BLLR-167 User Update Logged-Out Login Token", async () => {
  const token = await establishedLogin(app.backend, { password: PASSWORD, username: emailMember.username });
  expect(token).toEqual(expect.any(String));
  await logout(app.backend, token ?? "");
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    await expectStatus(403, "POST", `/users/${encodeURIComponent(mutable.id)}`, token ?? "", {
      firstName: "Logged Out",
    });
    await expectUnchanged(mutable.id, before);
  });
});
// @relation(GSSC-BLLR-167, scope=range_end, role=Test)

// @relation(GSSC-BLLR-168, scope=range_start, role=Test)
test("GSSC-BLLR-168 User Update Expired Login Token", async () => {
  try {
    const token = await expiredToken();
    await withRow(mutable.id, async () => {
      const before = await snapshot(mutable.id);
      await expectStatus(403, "POST", `/users/${encodeURIComponent(mutable.id)}`, token, {
        firstName: "Expired",
      });
      await expectUnchanged(mutable.id, before);
    });
  } finally {
    setSystemTime();
  }
});
// @relation(GSSC-BLLR-168, scope=range_end, role=Test)

// @relation(GSSC-BLLR-57, scope=range_start, role=Test)
test("GSSC-BLLR-57 User Update Not Found", async () => {
  const before = (await allRows()).length;
  await expectStatus(404, "POST", `/users/${encodeURIComponent(`missing-${randomUUID()}`)}`, admin.token, {
    firstName: "Nobody",
  });
  expect((await allRows()).length).toBe(before);
});
// @relation(GSSC-BLLR-57, scope=range_end, role=Test)

// @relation(GSSC-BLLR-59, scope=range_start, role=Test)
test("GSSC-BLLR-59 Is Admin User Update", async () => {
  for (const caller of [emailMember, moderator]) {
    for (const target of [admin, otherAdmin]) {
      await withRow(target.id, async () => {
        const before = await snapshot(target.id);
        const result = await postField(caller, target, "firstName", "Forbidden Admin Edit");
        expect(result.status).toBe(403);
        await expectUnchanged(target.id, before);
      });
    }
  }
});
// @relation(GSSC-BLLR-59, scope=range_end, role=Test)

// @relation(GSSC-BLLR-171, scope=range_start, role=Test)
test("GSSC-BLLR-171 User Update Forbidden", async () => {
  await withRow(phoneMember.id, async () => {
    const before = await snapshot(phoneMember.id);
    const result = await postField(emailMember, phoneMember, "firstName", "Forbidden Other");
    expect(result.status).toBe(403);
    await expectUnchanged(phoneMember.id, before);
  });
});
// @relation(GSSC-BLLR-171, scope=range_end, role=Test)

// @relation(GSSC-BLLR-173, scope=range_start, role=Test)
test("GSSC-BLLR-173 User Update Cuid", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const result = await call("POST", `/users/${encodeURIComponent(mutable.id)}`, admin.token, {
      cuid: `other-${randomUUID()}`,
      firstName: "ShouldNotStick",
    });
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
  });
});
// @relation(GSSC-BLLR-173, scope=range_end, role=Test)

// @relation(GSSC-BLLR-175, scope=range_start, role=Test)
test("GSSC-BLLR-175 User Update First Name Empty", async () => {
  await expectEmptyRejected("firstName");
});
// @relation(GSSC-BLLR-175, scope=range_end, role=Test)

// @relation(GSSC-BLLR-178, scope=range_start, role=Test)
test("GSSC-BLLR-178 User Update Last Name Empty", async () => {
  await expectEmptyRejected("lastName");
});
// @relation(GSSC-BLLR-178, scope=range_end, role=Test)

// @relation(GSSC-BLLR-180, scope=range_start, role=Test)
test("GSSC-BLLR-180 User Update Primary Email Empty", async () => {
  await expectEmptyRejected("primaryEmail");
});
// @relation(GSSC-BLLR-180, scope=range_end, role=Test)

// @relation(GSSC-BLLR-183, scope=range_start, role=Test)
test("GSSC-BLLR-183 User Update Primary Phone Number Empty", async () => {
  await expectEmptyRejected("primaryPhone");
});
// @relation(GSSC-BLLR-183, scope=range_end, role=Test)

// @relation(GSSC-BLLR-186, scope=range_start, role=Test)
test("GSSC-BLLR-186 User Update Preferred Contact Method Empty", async () => {
  await expectEmptyRejected("preferredContactMethod");
});
// @relation(GSSC-BLLR-186, scope=range_end, role=Test)

// @relation(GSSC-BLLR-188, scope=range_start, role=Test)
test("GSSC-BLLR-188 User Update Home Address line 1 Empty", async () => {
  await expectEmptyRejected("homeLine1");
});
// @relation(GSSC-BLLR-188, scope=range_end, role=Test)

// @relation(GSSC-BLLR-192, scope=range_start, role=Test)
test("GSSC-BLLR-192 User Update Home Address city Empty", async () => {
  await expectEmptyRejected("homeCity");
});
// @relation(GSSC-BLLR-192, scope=range_end, role=Test)

// @relation(GSSC-BLLR-194, scope=range_start, role=Test)
test("GSSC-BLLR-194 User Update Home Address state Empty", async () => {
  await expectEmptyRejected("homeState");
});
// @relation(GSSC-BLLR-194, scope=range_end, role=Test)

// @relation(GSSC-BLLR-196, scope=range_start, role=Test)
test("GSSC-BLLR-196 User Update Home Address zip code Empty", async () => {
  await expectEmptyRejected("homeZip");
});
// @relation(GSSC-BLLR-196, scope=range_end, role=Test)

// @relation(GSSC-BLLR-199, scope=range_start, role=Test)
test("GSSC-BLLR-199 User Update Mailing Address line 1 Empty", async () => {
  await expectEmptyRejected("mailLine1");
});
// @relation(GSSC-BLLR-199, scope=range_end, role=Test)

// @relation(GSSC-BLLR-203, scope=range_start, role=Test)
test("GSSC-BLLR-203 User Update Mailing Address city Empty", async () => {
  await expectEmptyRejected("mailCity");
});
// @relation(GSSC-BLLR-203, scope=range_end, role=Test)

// @relation(GSSC-BLLR-205, scope=range_start, role=Test)
test("GSSC-BLLR-205 User Update Mailing Address state Empty", async () => {
  await expectEmptyRejected("mailState");
});
// @relation(GSSC-BLLR-205, scope=range_end, role=Test)

// @relation(GSSC-BLLR-207, scope=range_start, role=Test)
test("GSSC-BLLR-207 User Update Mailing Address zip code Empty", async () => {
  await expectEmptyRejected("mailZip");
});
// @relation(GSSC-BLLR-207, scope=range_end, role=Test)

// @relation(GSSC-BLLR-210, scope=range_start, role=Test)
test("GSSC-BLLR-210 User Update Home Address Display Value", async () => {
  await expectShapeRejected("homeDisplay", "partial");
});
// @relation(GSSC-BLLR-210, scope=range_end, role=Test)

// @relation(GSSC-BLLR-213, scope=range_start, role=Test)
test("GSSC-BLLR-213 User Update Home Address zip code Shape", async () => {
  await expectShapeRejected("homeZip", "1234");
});
// @relation(GSSC-BLLR-213, scope=range_end, role=Test)

// @relation(GSSC-BLLR-214, scope=range_start, role=Test)
test("GSSC-BLLR-214 User Update Mailing Address zip code Shape", async () => {
  await expectShapeRejected("mailZip", "123456");
});
// @relation(GSSC-BLLR-214, scope=range_end, role=Test)

// @relation(GSSC-BLLR-215, scope=range_start, role=Test)
test("GSSC-BLLR-215 User Update Home Address zip extension Shape", async () => {
  await expectShapeRejected("homeZipExt", "123");
});
// @relation(GSSC-BLLR-215, scope=range_end, role=Test)

// @relation(GSSC-BLLR-216, scope=range_start, role=Test)
test("GSSC-BLLR-216 User Update Mailing Address zip extension Shape", async () => {
  await expectShapeRejected("mailZipExt", "12a4");
});
// @relation(GSSC-BLLR-216, scope=range_end, role=Test)

// @relation(GSSC-BLLR-217, scope=range_start, role=Test)
test("GSSC-BLLR-217 User Update Preferred Contact Method Value", async () => {
  await expectShapeRejected("preferredContactMethod", "Fax");
});
// @relation(GSSC-BLLR-217, scope=range_end, role=Test)

// @relation(GSSC-BLLR-218, scope=range_start, role=Test)
test("GSSC-BLLR-218 Username Empty", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const result = await postField(admin, mutable, "username", "");
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
  });
  await withRow(admin.id, async () => {
    const before = await snapshot(admin.id);
    const result = await postField(admin, admin, "username", "");
    expect(result.status).toBe(422);
    await expectUnchanged(admin.id, before);
  });
});
// @relation(GSSC-BLLR-218, scope=range_end, role=Test)

// @relation(GSSC-BLLR-219, scope=range_start, role=Test)
test("GSSC-BLLR-219 Username Already Stored", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const result = await postField(admin, mutable, "username", emailMember.username);
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
  });
});
// @relation(GSSC-BLLR-219, scope=range_end, role=Test)

// @relation(GSSC-BLLR-63, scope=range_start, role=Test)
test("GSSC-BLLR-63 Primary Email Still Unique", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const result = await postField(admin, mutable, "primaryEmail", emailMember.values.primaryEmail);
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
  });
});
// @relation(GSSC-BLLR-63, scope=range_end, role=Test)

// @relation(GSSC-BLLR-221, scope=range_start, role=Test)
test("GSSC-BLLR-221 Permission Update Forbidden", async () => {
  for (const caller of [emailMember, moderator]) {
    await withRow(caller.id, async () => {
      const before = await snapshot(caller.id);
      const result = await postField(caller, caller, "isAdmin", true);
      expect(result.status).toBe(403);
      await expectUnchanged(caller.id, before);
    });
  }
});
// @relation(GSSC-BLLR-221, scope=range_end, role=Test)

// @relation(GSSC-BLLR-222, scope=range_start, role=Test)
test("GSSC-BLLR-222 User Is User Mod Update Forbidden", async () => {
  for (const caller of [emailMember, moderator]) {
    await withRow(caller.id, async () => {
      const before = await snapshot(caller.id);
      const result = await postField(caller, caller, "isUserMod", true);
      expect(result.status).toBe(403);
      await expectUnchanged(caller.id, before);
    });
  }
});
// @relation(GSSC-BLLR-222, scope=range_end, role=Test)

// @relation(GSSC-BLLR-223, scope=range_start, role=Test)
test("GSSC-BLLR-223 Own Membership Status Update", async () => {
  for (const caller of [mutable, admin]) {
    await withRow(caller.id, async () => {
      const before = await snapshot(caller.id);
      const result = await postField(caller, caller, "membershipStatus", "own-status");
      expect(result.status).toBe(422);
      await expectUnchanged(caller.id, before);
    });
  }
});
// @relation(GSSC-BLLR-223, scope=range_end, role=Test)

// @relation(GSSC-BLLR-282, scope=range_start, role=Test)
test("GSSC-BLLR-282 Own Position Update", async () => {
  for (const caller of [mutable, moderator]) {
    await withRow(caller.id, async () => {
      const before = await snapshot(caller.id);
      const result = await call("POST", `/users/${encodeURIComponent(caller.id)}`, caller.token, {
        position: "Should Not Stick",
        firstName: "Also Should Not Stick",
      });
      expect(result.status).toBe(422);
      await expectUnchanged(caller.id, before);
    });
  }
});
// @relation(GSSC-BLLR-282, scope=range_end, role=Test)

// @relation(GSSC-BLLR-62, scope=range_start, role=Test)
test("GSSC-BLLR-62 Password Hash Unchanged", async () => {
  await withRow(mutable.id, async () => {
    const before = await snapshot(mutable.id);
    const result = await call("POST", `/users/${encodeURIComponent(mutable.id)}`, admin.token, {
      passwordHash: "replacement-hash",
      firstName: "ShouldNotStick",
    });
    expect(result.status).toBe(422);
    await expectUnchanged(mutable.id, before);
    expect(cell(await rowById(mutable.id), "passwordHash")).toBe(before[columnOf.get("passwordHash") ?? ""]);
  });
});
// @relation(GSSC-BLLR-62, scope=range_end, role=Test)

// @relation(GSSC-BLLR-25, scope=range_start, role=Test)
test("GSSC-BLLR-25 User Cuid", async () => {
  expect(admin.id).not.toBe("");
  expect(idsOf(await listEntries(admin.token))).toContain(admin.id);
  expect(idOf(await readEntry(admin.token, admin.id))).toBe(admin.id);
  await withRow(admin.id, async () => {
    await expectStored(admin, admin, "middleName", "Cuid Path");
    expect(cell(await rowById(admin.id), "middleName")).toBe("Cuid Path");
  });
});
// @relation(GSSC-BLLR-25, scope=range_end, role=Test)

// @relation(GSSC-BLLR-31, scope=range_start, role=Test)
test("GSSC-BLLR-31 Secondary Phone Number Display", async () => {
  expect(columnOf.get("secondaryPhoneDisplay")).toBeDefined();
  expect(logical(await rowById(phoneMember.id), "secondaryPhoneDisplay")).toBe(true);
  expect(logical(await rowById(redactedMember.id), "secondaryPhoneDisplay")).toBe(false);
  expectPresent(await viewed(emailMember, phoneMember, "read"), phoneMember, "secondaryPhone");
  expectAbsent(await viewed(emailMember, redactedMember, "read"), redactedMember, "secondaryPhone");
  expect(otherSees("secondaryPhone", emailMember)).toBe(false);
  expectAbsent(await viewed(phoneMember, emailMember, "read"), emailMember, "secondaryPhone");
});
// @relation(GSSC-BLLR-31, scope=range_end, role=Test)

// @relation(GSSC-BLLR-32, scope=range_start, role=Test)
test("GSSC-BLLR-32 Secondary Email Display", async () => {
  expect(columnOf.get("secondaryEmailDisplay")).toBeDefined();
  expect(logical(await rowById(emailMember.id), "secondaryEmailDisplay")).toBe(true);
  expectPresent(await viewed(phoneMember, emailMember, "read"), emailMember, "secondaryEmail");
  expectAbsent(await viewed(emailMember, redactedMember, "read"), redactedMember, "secondaryEmail");
  expectAbsent(await viewed(emailMember, phoneMember, "read"), phoneMember, "secondaryEmail");
});
// @relation(GSSC-BLLR-32, scope=range_end, role=Test)

// @relation(GSSC-BLLR-33, scope=range_start, role=Test)
test("GSSC-BLLR-33 User Preferred Contact Method", async () => {
  expect(columnOf.get("preferredContactMethod")).toBeDefined();
  for (const subject of [emailMember, phoneMember, noneMember]) {
    const stored = logical(await rowById(subject.id), "preferredContactMethod");
    expect(["Email", "Phone", "None"]).toContain(stored);
  }
  expectPresent(await viewed(phoneMember, emailMember, "read"), emailMember, "primaryEmail");
  expectAbsent(await viewed(phoneMember, emailMember, "read"), emailMember, "primaryPhone");
  expectPresent(await viewed(emailMember, phoneMember, "read"), phoneMember, "primaryPhone");
  expectAbsent(await viewed(emailMember, phoneMember, "read"), phoneMember, "primaryEmail");
  expectPresent(await viewed(emailMember, noneMember, "read"), noneMember, "primaryEmail");
  expectPresent(await viewed(emailMember, noneMember, "read"), noneMember, "primaryPhone");

  await withRow(admin.id, async () => {
    const phoneColumn = columnOf.get("primaryPhone") ?? "";
    const methodColumn = columnOf.get("preferredContactMethod") ?? "";
    await app.sql.execute(
      `UPDATE ${quote(app.table)} SET ${quote(phoneColumn)} = ${sqlLiteral("2095550199")}, ${quote(methodColumn)} = NULL WHERE ${quote(columnOf.get("cuid") ?? "")} = ${sqlLiteral(admin.id)}`,
    );
    const entry = await viewed(emailMember, { ...admin, values: { ...admin.values, primaryPhone: "2095550199", primaryEmail: admin.values.primaryEmail, preferredContactMethod: null } }, "read");
    expect(locate(entry, "primaryEmail")).toBeUndefined();
    expect(locate(entry, "primaryPhone")).toBeUndefined();
    expect(JSON.stringify(entry).includes("2095550199")).toBe(false);
    expect(JSON.stringify(entry).includes(String(admin.values.primaryEmail))).toBe(false);
  });
});
// @relation(GSSC-BLLR-33, scope=range_end, role=Test)

// @relation(GSSC-BLLR-35, scope=range_start, role=Test)
test("GSSC-BLLR-35 Home Address Display", async () => {
  expect(columnOf.get("homeDisplay")).toBeDefined();
  expect(logical(await rowById(emailMember.id), "homeDisplay")).toBe("full");
  expect(logical(await rowById(redactedMember.id), "homeDisplay")).toBe("redacted");
  const full = await viewed(phoneMember, emailMember, "read");
  for (const concept of ["homeLine1", "homeLine2", "homeLine3", "homeCity", "homeState", "homeZip", "homeZipExt"] as const) {
    expectPresent(full, emailMember, concept);
  }
  const redacted = await viewed(emailMember, redactedMember, "read");
  expectPresent(redacted, redactedMember, "homeCity");
  expectPresent(redacted, redactedMember, "homeState");
  expectAbsent(redacted, redactedMember, "homeLine1");
  expectAbsent(redacted, redactedMember, "homeZip");

  await withRow(mutable.id, async () => {
    const display = columnOf.get("homeDisplay") ?? "";
    await app.sql.execute(
      `UPDATE ${quote(app.table)} SET ${quote(display)} = NULL WHERE ${quote(columnOf.get("cuid") ?? "")} = ${sqlLiteral(mutable.id)}`,
    );
    const absent = await viewed(emailMember, mutable, "read");
    expect(locate(absent, "homeCity")?.value).toBe(mutable.values.homeCity);
    expect(locate(absent, "homeState")?.value).toBe(mutable.values.homeState);
    expect(locate(absent, "homeLine1")).toBeUndefined();
  });
});
// @relation(GSSC-BLLR-35, scope=range_end, role=Test)

// @relation(GSSC-BLLR-275, scope=range_start, role=Test)
test("GSSC-BLLR-275 User Position", async () => {
  expect(columnOf.get("position")).toBeDefined();
  const column = app.columns.find((item) => normalize(item.name) === "position");
  expect(column?.notnull).toBe(false);
  expect(logical(await rowById(emailMember.id), "position")).toBeNull();
});
// @relation(GSSC-BLLR-275, scope=range_end, role=Test)

// @relation(GSSC-BLLR-276, scope=range_start, role=Test)
test("GSSC-BLLR-276 User Account Photo", async () => {
  const column = app.columns.find((item) => normalize(item.name) === "accountphoto");
  expect(column).toBeDefined();
  expect(column?.notnull).toBe(false);
  expect(cellText((await rowById(emailMember.id))[column?.name ?? ""])).toBeNull();
});
// @relation(GSSC-BLLR-276, scope=range_end, role=Test)

