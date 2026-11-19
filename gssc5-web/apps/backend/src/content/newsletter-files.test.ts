// Newsletter issue-file store checks. Each assertion is limited to that requirement's statement.

import { access } from "node:fs/promises";
import path from "node:path";

import { beforeAll, expect, test } from "bun:test";

import { loadConfig } from "../config";
import { getPrisma } from "../db";
import {
  bootInProcess,
  cookieHeaderForToken,
  establishedLogin,
  memberPassword,
  memberUsername,
  type BackendFetch,
  type InProcessApp,
} from "../test-harness";
import {
  ensureNewslettersFolder,
  NEWSLETTERS_DIR,
  newsletterIssueDisplayName,
  resetNewslettersInitForTests,
} from "./newsletter-files";

let app: InProcessApp;
let backend: BackendFetch;
let adminTok = "";
let editorTok = "";
let memberTok = "";

beforeAll(async () => {
  resetNewslettersInitForTests();
  app = await bootInProcess();
  backend = app.backend;
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const passwordHash = await Bun.password.hash("nl-file-editor-secret", "argon2id");

  await prisma.user.create({
    data: {
      username: "nl-file-editor",
      primaryEmail: "nl.file.editor@example.com",
      passwordHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: false,
      isNewsletterEditor: true,
      firstName: "Nl",
      lastName: "File",
      primaryPhone: "2095550501",
      preferredContactMethod: "Email",
      homeLine1: "1 Nl",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "1 Nl",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  const plainHash = await Bun.password.hash("plain-nl-file-secret", "argon2id");
  await prisma.user.create({
    data: {
      username: "plain-member-nl-file",
      primaryEmail: "plain.nl.file@example.com",
      passwordHash: plainHash,
      isAdmin: false,
      isUserMod: false,
      isPublicationEditor: false,
      isNewsletterEditor: false,
      firstName: "Plain",
      lastName: "Member",
      primaryPhone: "2095550502",
      preferredContactMethod: "Email",
      homeLine1: "2 Plain",
      homeCity: "Modesto",
      homeState: "CA",
      homeZip: "95350",
      mailingLine1: "2 Plain",
      mailingCity: "Modesto",
      mailingState: "CA",
      mailingZip: "95350",
    },
  });

  adminTok =
    (await establishedLogin(backend, {
      username: memberUsername,
      password: memberPassword,
    })) ?? "";
  editorTok =
    (await establishedLogin(backend, {
      username: "nl-file-editor",
      password: "nl-file-editor-secret",
    })) ?? "";
  memberTok =
    (await establishedLogin(backend, {
      username: "plain-member-nl-file",
      password: "plain-nl-file-secret",
    })) ?? "";
});

async function createNewsletter(token: string, suffix: string): Promise<string> {
  const response = await backend(
    new Request("http://127.0.0.1/newsletters", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeaderForToken(token),
      },
      body: JSON.stringify({
        volume: 1,
        number: 1,
        month: 1,
        year: 2026,
        filePath: `pending-${suffix}`,
        keywords: ["upload"],
      }),
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { cuid: string };
  return body.cuid;
}

async function uploadNewsletterFile(
  token: string,
  newsletterCuid: string,
  bytes = "%PDF-1.4 issue",
): Promise<Response> {
  const form = new FormData();
  form.append("file", new File([bytes], "issue.pdf", { type: "application/pdf" }));
  form.append("newsletterCuid", newsletterCuid);
  return backend(
    new Request("http://127.0.0.1/newsletter-files", {
      method: "POST",
      headers: { cookie: cookieHeaderForToken(token) },
      body: form,
    }),
  );
}

// @relation(GSSC-BLLR-493, scope=range_start, role=Test)
test("GSSC-BLLR-493 newsletters directory exists on init", async () => {
  const folderId = await ensureNewslettersFolder();
  expect(folderId.length).toBeGreaterThan(0);
  const root = path.resolve(loadConfig().FILE_STORAGE_ROOT, NEWSLETTERS_DIR);
  await access(root);
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.storedFileEntry.findUnique({ where: { id: folderId } });
  expect(row?.name).toBe(NEWSLETTERS_DIR);
  expect(row?.kind).toBe("folder");
});
// @relation(GSSC-BLLR-493, scope=range_end, role=Test)

// @relation(GSSC-BLLR-494, scope=range_start, role=Test)
test("GSSC-BLLR-494 authenticated upload stores by newsletter cuid and returns that cuid", async () => {
  const cuid = await createNewsletter(editorTok, `up-${Date.now()}`);
  const response = await uploadNewsletterFile(editorTok, cuid, "named-issue");
  expect(response.status).toBe(200);
  const body = (await response.json()) as { cuid: string; path: string };
  expect(body.cuid).toBe(cuid);
  expect(body.path).toBe(`${NEWSLETTERS_DIR}/${cuid}`);
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, body.path));

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.newsletter.findUnique({ where: { id: cuid } });
  expect(row?.filePath).toBe(cuid);

  const asAdmin = await uploadNewsletterFile(adminTok, cuid, "admin-issue");
  expect(asAdmin.status).toBe(200);
});
// @relation(GSSC-BLLR-494, scope=range_end, role=Test)

// @relation(GSSC-BLLR-494, scope=range_start, role=Test)
test("GSSC-BLLR-494 newsletter file upload forbidden for non-editors", async () => {
  const cuid = await createNewsletter(editorTok, `forbid-${Date.now()}`);
  const response = await uploadNewsletterFile(memberTok, cuid);
  expect(response.status).toBe(403);
});
// @relation(GSSC-BLLR-494, scope=range_end, role=Test)

// @relation(GSSC-BLLR-495, scope=range_start, role=Test)
test("GSSC-BLLR-495 newsletter file replace deletes prior file", async () => {
  const cuid = await createNewsletter(editorTok, `repl-${Date.now()}`);
  const first = await uploadNewsletterFile(editorTok, cuid, "first-bytes");
  expect(first.status).toBe(200);
  const firstBody = (await first.json()) as { path: string };
  const firstPath = path.resolve(loadConfig().FILE_STORAGE_ROOT, firstBody.path);
  await access(firstPath);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const legacy = await prisma.storedFileEntry.create({
    data: {
      name: "legacy-issue.pdf",
      kind: "file",
      parentId: null,
      storageKey: `legacy-${cuid}`,
      mimeType: "application/pdf",
      sizeBytes: 4,
      isPublic: true,
      readRoles: JSON.stringify([]),
      writeRoles: JSON.stringify([]),
    },
  });
  await prisma.newsletter.update({
    where: { id: cuid },
    data: { filePath: legacy.id },
  });
  await Bun.write(
    path.resolve(loadConfig().FILE_STORAGE_ROOT, legacy.storageKey!),
    "old",
  );

  const second = await uploadNewsletterFile(editorTok, cuid, "second-bytes");
  expect(second.status).toBe(200);
  const secondBody = (await second.json()) as { path: string };
  expect(secondBody.path).toBe(`${NEWSLETTERS_DIR}/${cuid}`);
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, secondBody.path));

  const legacyAfter = await prisma.storedFileEntry.findUnique({
    where: { id: legacy.id },
  });
  expect(legacyAfter?.deletedAt).not.toBeNull();

  const newsletter = await prisma.newsletter.findUnique({ where: { id: cuid } });
  expect(newsletter?.filePath).toBe(cuid);

  let legacyGone = false;
  try {
    await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, legacy.storageKey!));
  } catch {
    legacyGone = true;
  }
  expect(legacyGone).toBe(true);
});
// @relation(GSSC-BLLR-495, scope=range_end, role=Test)

// @relation(GSSC-BLLR-506, scope=range_start, role=Test)
test("GSSC-BLLR-506 newsletter issue display name is Vol{volume}No{number}.pdf", async () => {
  expect(newsletterIssueDisplayName(48, 1)).toBe("Vol48No1.pdf");

  const cuid = await createNewsletter(editorTok, `name-${Date.now()}`);
  const response = await uploadNewsletterFile(editorTok, cuid, "named-bytes");
  expect(response.status).toBe(200);

  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const entry = await prisma.storedFileEntry.findUnique({ where: { id: cuid } });
  expect(entry?.name).toBe("Vol1No1.pdf");

  const fileGet = await backend(
    new Request(`http://127.0.0.1/files/${cuid}`, { method: "GET" }),
  );
  expect(fileGet.status).toBe(200);
  expect(fileGet.headers.get("content-disposition")).toContain("Vol1No1.pdf");
});
// @relation(GSSC-BLLR-506, scope=range_end, role=Test)
