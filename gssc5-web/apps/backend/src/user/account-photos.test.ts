// Account photo store checks. Each assertion is limited to that requirement's statement.

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
  ACCOUNT_PHOTOS_DIR,
  ensureAccountPhotosFolder,
  resetAccountPhotosInitForTests,
} from "./account-photos";

let app: InProcessApp;
let backend: BackendFetch;
let memberTok = "";
let memberId = "";

beforeAll(async () => {
  resetAccountPhotosInitForTests();
  app = await bootInProcess();
  backend = app.backend;
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const member = await prisma.user.findUnique({
    where: { username: memberUsername },
    select: { id: true },
  });
  memberId = member?.id ?? "";
  memberTok =
    (await establishedLogin(backend, {
      username: memberUsername,
      password: memberPassword,
    })) ?? "";
});

async function uploadPhoto(token: string, bytes = "photo-bytes"): Promise<Response> {
  const form = new FormData();
  form.append("file", new File([bytes], "face.png", { type: "image/png" }));
  return backend(
    new Request("http://127.0.0.1/account-photos", {
      method: "POST",
      headers: { cookie: cookieHeaderForToken(token) },
      body: form,
    }),
  );
}

async function getPhoto(cuid: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = cookieHeaderForToken(token);
  return backend(
    new Request(`http://127.0.0.1/account-photos/${cuid}`, {
      method: "GET",
      headers,
    }),
  );
}

// @relation(GSSC-BLLR-453, scope=range_start, role=Test)
test("GSSC-BLLR-453 account-photos directory exists on init", async () => {
  const folderId = await ensureAccountPhotosFolder();
  expect(folderId.length).toBeGreaterThan(0);
  const root = path.resolve(loadConfig().FILE_STORAGE_ROOT, ACCOUNT_PHOTOS_DIR);
  await access(root);
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const row = await prisma.storedFileEntry.findUnique({ where: { id: folderId } });
  expect(row?.name).toBe(ACCOUNT_PHOTOS_DIR);
  expect(row?.kind).toBe("folder");
});
// @relation(GSSC-BLLR-453, scope=range_end, role=Test)

// @relation(GSSC-BLLR-456, scope=range_start, role=Test)
test("GSSC-BLLR-456 authenticated upload writes under account-photos and returns cuid", async () => {
  const response = await uploadPhoto(memberTok);
  expect(response.status).toBe(200);
  const body = (await response.json()) as { cuid: string; path: string };
  expect(body.cuid.length).toBeGreaterThan(0);
  expect(body.path.startsWith(`${ACCOUNT_PHOTOS_DIR}/`)).toBe(true);
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, body.path));
});
// @relation(GSSC-BLLR-456, scope=range_end, role=Test)

// @relation(GSSC-BLLR-454, scope=range_start, role=Test)
test("GSSC-BLLR-454 GET account photo with valid token succeeds", async () => {
  const uploaded = await uploadPhoto(memberTok, "token-photo");
  const { cuid } = (await uploaded.json()) as { cuid: string };
  const response = await getPhoto(cuid, memberTok);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("token-photo");
});
// @relation(GSSC-BLLR-454, scope=range_end, role=Test)

// @relation(GSSC-BLLR-455, scope=range_start, role=Test)
test("GSSC-BLLR-455 GET account photo without token depends on owner position", async () => {
  const withPosition = await uploadPhoto(memberTok, "leader-photo");
  const leaderCuid = ((await withPosition.json()) as { cuid: string }).cuid;
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  await prisma.user.update({
    where: { id: memberId },
    data: { accountPhoto: leaderCuid, position: "President" },
  });
  const leaderGet = await getPhoto(leaderCuid);
  expect(leaderGet.status).toBe(200);
  expect(await leaderGet.text()).toBe("leader-photo");

  const withoutPosition = await uploadPhoto(memberTok, "private-photo");
  const privateCuid = ((await withoutPosition.json()) as { cuid: string }).cuid;
  await prisma.user.update({
    where: { id: memberId },
    data: { accountPhoto: privateCuid, position: null },
  });
  expect((await getPhoto(privateCuid)).status).toBe(403);
});
// @relation(GSSC-BLLR-455, scope=range_end, role=Test)

// @relation(GSSC-BLLR-457, scope=range_start, role=Test)
test("GSSC-BLLR-457 users API projects and persists accountPhoto", async () => {
  const uploaded = await uploadPhoto(memberTok, "saved-photo");
  const { cuid } = (await uploaded.json()) as { cuid: string };
  const post = await backend(
    new Request(`http://127.0.0.1/users/${memberId}`, {
      method: "POST",
      headers: {
        cookie: cookieHeaderForToken(memberTok),
        "content-type": "application/json",
      },
      body: JSON.stringify({ accountPhoto: cuid }),
    }),
  );
  expect(post.status).toBe(204);
  const get = await backend(
    new Request(`http://127.0.0.1/users/${memberId}`, {
      method: "GET",
      headers: { cookie: cookieHeaderForToken(memberTok) },
    }),
  );
  expect(get.status).toBe(200);
  const body = (await get.json()) as { accountPhoto?: string | null };
  expect(body.accountPhoto).toBe(cuid);
});
// @relation(GSSC-BLLR-457, scope=range_end, role=Test)
