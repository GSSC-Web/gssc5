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

async function uploadPhoto(
  token: string,
  bytes = "photo-bytes",
  userCuid?: string,
): Promise<Response> {
  const form = new FormData();
  form.append("file", new File([bytes], "face.png", { type: "image/png" }));
  if (userCuid !== undefined) form.append("userCuid", userCuid);
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
test("GSSC-BLLR-456 authenticated upload stores by user cuid and returns that cuid", async () => {
  const response = await uploadPhoto(memberTok, "named-photo", memberId);
  expect(response.status).toBe(200);
  const body = (await response.json()) as { cuid: string; path: string };
  expect(body.cuid).toBe(memberId);
  expect(body.path).toBe(`${ACCOUNT_PHOTOS_DIR}/${memberId}`);
  await access(path.resolve(loadConfig().FILE_STORAGE_ROOT, body.path));
});
// @relation(GSSC-BLLR-456, scope=range_end, role=Test)

// @relation(GSSC-BLLR-458, scope=range_start, role=Test)
test("GSSC-BLLR-458 upload for same user cuid overwrites existing photo", async () => {
  const first = await uploadPhoto(memberTok, "first-bytes", memberId);
  expect(first.status).toBe(200);
  const second = await uploadPhoto(memberTok, "second-bytes", memberId);
  expect(second.status).toBe(200);
  const body = (await second.json()) as { cuid: string; path: string };
  expect(body.cuid).toBe(memberId);
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  const folderId = await ensureAccountPhotosFolder();
  const rows = await prisma.storedFileEntry.findMany({
    where: { name: memberId, parentId: folderId, kind: "file", deletedAt: null },
  });
  expect(rows.length).toBe(1);
  const got = await getPhoto(memberId, memberTok);
  expect(got.status).toBe(200);
  expect(await got.text()).toBe("second-bytes");
});
// @relation(GSSC-BLLR-458, scope=range_end, role=Test)

// @relation(GSSC-BLLR-454, scope=range_start, role=Test)
test("GSSC-BLLR-454 GET account photo with valid token succeeds", async () => {
  const uploaded = await uploadPhoto(memberTok, "token-photo", memberId);
  expect(uploaded.status).toBe(200);
  const response = await getPhoto(memberId, memberTok);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("token-photo");
});
// @relation(GSSC-BLLR-454, scope=range_end, role=Test)

// @relation(GSSC-BLLR-455, scope=range_start, role=Test)
test("GSSC-BLLR-455 GET account photo without token depends on owner position", async () => {
  await uploadPhoto(memberTok, "leader-photo", memberId);
  const prisma = getPrisma(loadConfig().DATABASE_URL);
  await prisma.user.update({
    where: { id: memberId },
    data: { accountPhoto: memberId, position: "President" },
  });
  const leaderGet = await getPhoto(memberId);
  expect(leaderGet.status).toBe(200);
  expect(await leaderGet.text()).toBe("leader-photo");

  await prisma.user.update({
    where: { id: memberId },
    data: { position: null },
  });
  expect((await getPhoto(memberId)).status).toBe(403);
});
// @relation(GSSC-BLLR-455, scope=range_end, role=Test)

// @relation(GSSC-BLLR-457, scope=range_start, role=Test)
test("GSSC-BLLR-457 users API projects and persists accountPhoto", async () => {
  await uploadPhoto(memberTok, "saved-photo", memberId);
  const post = await backend(
    new Request(`http://127.0.0.1/users/${memberId}`, {
      method: "POST",
      headers: {
        cookie: cookieHeaderForToken(memberTok),
        "content-type": "application/json",
      },
      body: JSON.stringify({ accountPhoto: memberId }),
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
  expect(body.accountPhoto).toBe(memberId);
});
// @relation(GSSC-BLLR-457, scope=range_end, role=Test)
