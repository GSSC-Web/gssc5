import { Elysia, t } from "elysia";

import { loadConfig, type Config } from "../config";
import { getPrisma } from "../db";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { UserPlain, UserPlainInputUpdate } from "../generated/prismabox/User";
import {
  loginTokenCookie,
  resolveLoginSessionUser,
  type CookieJar,
  type LoginSessionFailure,
} from "./login-session";

const userSelect = {
  // @relation(GSSC-BLLR-54, GSSC-BLLR-100, scope=range_start, role=Implementation)
  id: true,
  username: true,
  primaryEmail: true,
  secondaryEmail: true,
  firstName: true,
  middleName: true,
  lastName: true,
  primaryPhone: true,
  secondaryPhone: true,
  preferredContactMethod: true,
  secondaryEmailDisplay: true,
  secondaryPhoneDisplay: true,
  homeLine1: true,
  homeLine2: true,
  homeLine3: true,
  homeCity: true,
  homeState: true,
  homeZip: true,
  homeZipExtension: true,
  homeAddressDisplay: true,
  mailingLine1: true,
  mailingLine2: true,
  mailingLine3: true,
  mailingCity: true,
  mailingState: true,
  mailingZip: true,
  mailingZipExtension: true,
  isAdmin: true,
  isUserMod: true,
  isToolEditor: true,
  isPublicationEditor: true,
  isNewsletterEditor: true,
  membershipStatus: true,
  // @relation(GSSC-BLLR-275, GSSC-BLLR-277, GSSC-BLLR-278, scope=range_start, role=Implementation)
  position: true,
  // @relation(GSSC-BLLR-275, GSSC-BLLR-277, GSSC-BLLR-278, scope=range_end, role=Implementation)
  // @relation(GSSC-BLLR-54, GSSC-BLLR-100, scope=range_end, role=Implementation)
} as const;

type StoredUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

type AccountView = {
  cuid: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  homeCity: string | null;
  homeState: string | null;
  username?: string;
  primaryEmail?: string | null;
  secondaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  preferredContactMethod?: string | null;
  homeLine1?: string | null;
  homeLine2?: string | null;
  homeLine3?: string | null;
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
  secondaryEmailDisplay?: boolean;
  secondaryPhoneDisplay?: boolean;
  isAdmin?: boolean;
  isUserMod?: boolean;
  isToolEditor?: boolean;
  isPublicationEditor?: boolean;
  isNewsletterEditor?: boolean;
  membershipStatus?: string | null;
  position?: string | null;
};

type Session = { failure: LoginSessionFailure } | { user: StoredUser };

/**
 * Public account projection: Prismabox `UserPlain` field types with intentional
 * `cuid` (not `id`) and visibility optionals — not a blind `UserPlain` drop-in.
 */
const PublicUser = t.Object({
  cuid: UserPlain.properties.id,
  firstName: UserPlain.properties.firstName,
  middleName: UserPlain.properties.middleName,
  lastName: UserPlain.properties.lastName,
  homeCity: UserPlain.properties.homeCity,
  homeState: UserPlain.properties.homeState,
  username: t.Optional(UserPlain.properties.username),
  primaryEmail: t.Optional(UserPlain.properties.primaryEmail),
  secondaryEmail: t.Optional(UserPlain.properties.secondaryEmail),
  primaryPhone: t.Optional(UserPlain.properties.primaryPhone),
  secondaryPhone: t.Optional(UserPlain.properties.secondaryPhone),
  preferredContactMethod: t.Optional(UserPlain.properties.preferredContactMethod),
  homeLine1: t.Optional(UserPlain.properties.homeLine1),
  homeLine2: t.Optional(UserPlain.properties.homeLine2),
  homeLine3: t.Optional(UserPlain.properties.homeLine3),
  homeZip: t.Optional(UserPlain.properties.homeZip),
  homeZipExtension: t.Optional(UserPlain.properties.homeZipExtension),
  homeAddressDisplay: t.Optional(UserPlain.properties.homeAddressDisplay),
  mailingLine1: t.Optional(UserPlain.properties.mailingLine1),
  mailingLine2: t.Optional(UserPlain.properties.mailingLine2),
  mailingLine3: t.Optional(UserPlain.properties.mailingLine3),
  mailingCity: t.Optional(UserPlain.properties.mailingCity),
  mailingState: t.Optional(UserPlain.properties.mailingState),
  mailingZip: t.Optional(UserPlain.properties.mailingZip),
  mailingZipExtension: t.Optional(UserPlain.properties.mailingZipExtension),
  secondaryEmailDisplay: t.Optional(UserPlain.properties.secondaryEmailDisplay),
  secondaryPhoneDisplay: t.Optional(UserPlain.properties.secondaryPhoneDisplay),
  isAdmin: t.Optional(UserPlain.properties.isAdmin),
  isUserMod: t.Optional(UserPlain.properties.isUserMod),
  isToolEditor: t.Optional(UserPlain.properties.isToolEditor),
  isPublicationEditor: t.Optional(UserPlain.properties.isPublicationEditor),
  isNewsletterEditor: t.Optional(UserPlain.properties.isNewsletterEditor),
  membershipStatus: t.Optional(UserPlain.properties.membershipStatus),
  position: t.Optional(UserPlain.properties.position),
});

/**
 * Update body keys from Prismabox `UserPlainInputUpdate`. Value types stay loose
 * (string | boolean | null) so empty-string clears and ignored `token` extras
 * still reach `buildPatch`; that helper owns privilege and format rules.
 * `UserPlainInputUpdate` itself is registered on the plugin for OpenAPI.
 */
const UserUpdateBody = t.Partial(
  t.Object(
    Object.fromEntries(
      Object.keys(UserPlainInputUpdate.properties).map((key) => [
        key,
        t.Union([t.String(), t.Boolean(), t.Null()]),
      ]),
    ),
    { additionalProperties: true },
  ),
);

const TEXT_FILTERS = new Set([
  "firstName",
  "middleName",
  "lastName",
  "username",
  "membershipStatus",
  "homeLine1",
  "homeLine2",
  "homeLine3",
  "homeCity",
  "homeState",
  "homeZip",
  "homeZipExtension",
  "mailingLine1",
  "mailingLine2",
  "mailingLine3",
  "mailingCity",
  "mailingState",
  "mailingZip",
  "mailingZipExtension",
]);

const STRING_LITERAL_FILTERS = new Set(["preferredContactMethod", "homeAddressDisplay"]);
const BOOLEAN_FILTERS = new Set([
  "isAdmin",
  "isUserMod",
  "isToolEditor",
  "isPublicationEditor",
  "isNewsletterEditor",
  "secondaryEmailDisplay",
  "secondaryPhoneDisplay",
]);

const REQUIRED_TEXT = new Set([
  "firstName",
  "lastName",
  "primaryEmail",
  "primaryPhone",
  "preferredContactMethod",
  "homeLine1",
  "homeCity",
  "homeState",
  "homeZip",
  "mailingLine1",
  "mailingCity",
  "mailingState",
  "mailingZip",
]);

const CLEARABLE_TEXT = new Set([
  "middleName",
  "secondaryEmail",
  "secondaryPhone",
  "homeLine2",
  "homeLine3",
  "homeZipExtension",
  "mailingLine2",
  "mailingLine3",
  "mailingZipExtension",
  "membershipStatus",
  "position",
]);

const WRITABLE_TEXT = new Set<string>([
  ...REQUIRED_TEXT,
  ...CLEARABLE_TEXT,
  "username",
  "homeAddressDisplay",
]);

const ZIP5 = new Set(["homeZip", "mailingZip"]);
const ZIP4 = new Set(["homeZipExtension", "mailingZipExtension"]);

export const users = new Elysia({
  name: "users",
  prefix: "/users",
  normalize: false,
  sanitize: (value) => value.trim(),
})
  .model({
    user: UserPlain,
    userUpdate: UserPlainInputUpdate,
  })
  .onTransform(({ body }) => {
    trimStrings(body);
  })
  .get(
    "/",
    async ({ query, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) {
        return status(403, "Forbidden" as const);
      }
      const filters = readFilters(query);
      if (filters === "invalid") return status(422, "Invalid" as const);

      // @relation(GSSC-BLLR-41, scope=range_start, role=Implementation)
      const { prisma } = runtime();
      const rows = await prisma.user.findMany({ select: userSelect, orderBy: { id: "asc" } });
      const listed = rows
        .filter((user) => matchesAll(user, session.user, filters))
        .map((user) => project(user, session.user));
      return status(200, listed);
      // @relation(GSSC-BLLR-41, scope=range_end, role=Implementation)
    },
    {
      query: t.Record(t.String(), t.String()),
      cookie: loginTokenCookie,
      response: {
        200: t.Array(PublicUser),
        403: t.Literal("Forbidden"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .post(
    "/:cuid/clear-passwords",
    async ({ params, cookie, status }) => {
      // @relation(GSSC-BLLR-264, scope=range_start, role=Implementation)
      const session = await openSession(cookie);
      if ("failure" in session) {
        return status(403, "Forbidden" as const);
      }
      // @relation(GSSC-BLLR-264, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-265, GSSC-BLLR-266, scope=range_start, role=Implementation)
      if (!session.user.isAdmin && !session.user.isUserMod) {
        return status(403, "Forbidden" as const);
      }
      // @relation(GSSC-BLLR-265, GSSC-BLLR-266, scope=range_end, role=Implementation)

      const { prisma } = runtime();
      // @relation(GSSC-BLLR-267, scope=range_start, role=Implementation)
      const target = await prisma.user.findUnique({
        where: { id: params.cuid },
        select: { id: true },
      });
      if (!target) return status(404, "Not Found" as const);
      // @relation(GSSC-BLLR-267, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-263, scope=range_start, role=Implementation)
      await prisma.passwordHistory.deleteMany({ where: { userId: target.id } });
      return status(204, undefined);
      // @relation(GSSC-BLLR-263, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String() }),
      cookie: loginTokenCookie,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .get(
    "/:cuid",
    async ({ params, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) {
        return status(403, "Forbidden" as const);
      }

      // @relation(GSSC-BLLR-49, GSSC-BLLR-55, scope=range_start, role=Implementation)
      const { prisma } = runtime();
      const user = await prisma.user.findUnique({
        where: { id: params.cuid },
        select: userSelect,
      });
      if (!user) return status(404, "Not Found" as const);
      return status(200, project(user, session.user));
      // @relation(GSSC-BLLR-49, GSSC-BLLR-55, scope=range_end, role=Implementation)
    },
    {
      params: t.Object({ cuid: t.String() }),
      cookie: loginTokenCookie,
      response: {
        200: PublicUser,
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  )
  .post(
    "/:cuid",
    async ({ params, body, cookie, status }) => {
      const session = await openSession(cookie);
      if ("failure" in session) {
        return status(403, "Forbidden" as const);
      }

      // @relation(GSSC-BLLR-57, scope=range_start, role=Implementation)
      const { prisma, config } = runtime();
      const target = await prisma.user.findUnique({
        where: { id: params.cuid },
        select: userSelect,
      });
      if (!target) return status(404, "Not Found" as const);
      // @relation(GSSC-BLLR-57, scope=range_end, role=Implementation)

      // @relation(GSSC-BLLR-58, GSSC-BLLR-59, GSSC-BLLR-169, GSSC-BLLR-170, GSSC-BLLR-171, scope=range_start, role=Implementation)
      if (authorize(session.user, target) === "forbidden") return status(403, "Forbidden" as const);
      // @relation(GSSC-BLLR-58, GSSC-BLLR-59, GSSC-BLLR-169, GSSC-BLLR-170, GSSC-BLLR-171, scope=range_end, role=Implementation)

      const built = buildPatch(bodyRecord(body), session.user, target, config.ADMIN_USERNAME);
      if (built === "forbidden") return status(403, "Forbidden" as const);
      if (built === "invalid") return status(422, "Invalid" as const);
      if (!(await identifiersAvailable(prisma, target, built))) {
        return status(422, "Invalid" as const);
      }

      try {
        await saveUser(prisma, target.id, built);
      } catch (error) {
        if (isUniqueConflict(error) || isPrimaryEmailGuard(error)) {
          return status(422, "Invalid" as const);
        }
        throw error;
      }
      return status(204, undefined);
    },
    {
      params: t.Object({ cuid: t.String() }),
      body: t.Optional(UserUpdateBody),
      cookie: loginTokenCookie,
      response: {
        204: t.Void(),
        403: t.Literal("Forbidden"),
        404: t.Literal("Not Found"),
        422: t.Literal("Invalid"),
      },
    },
  );

function runtime(): { prisma: PrismaClient; config: Config } {
  const config = loadConfig();
  return { config, prisma: getPrisma(config.DATABASE_URL) };
}

async function openSession(cookie: CookieJar): Promise<Session> {
  return resolveLoginSessionUser(runtime().prisma, cookie, userSelect);
}

// @relation(GSSC-BLLR-58, GSSC-BLLR-59, GSSC-BLLR-169, GSSC-BLLR-170, GSSC-BLLR-171, scope=range_start, role=Implementation)
function authorize(caller: StoredUser, target: StoredUser): "ok" | "forbidden" {
  if (caller.isAdmin) return "ok";
  if (target.isAdmin) return "forbidden";
  if (caller.id === target.id) return "ok";
  if (caller.isUserMod) return "ok";
  return "forbidden";
}
// @relation(GSSC-BLLR-58, GSSC-BLLR-59, GSSC-BLLR-169, GSSC-BLLR-170, GSSC-BLLR-171, scope=range_end, role=Implementation)

// @relation(GSSC-BLLR-54, GSSC-BLLR-70, GSSC-BLLR-71, GSSC-BLLR-72, GSSC-BLLR-73, GSSC-BLLR-74, GSSC-BLLR-75, GSSC-BLLR-76, GSSC-BLLR-77, GSSC-BLLR-78, GSSC-BLLR-79, GSSC-BLLR-80, GSSC-BLLR-81, GSSC-BLLR-82, GSSC-BLLR-83, GSSC-BLLR-84, GSSC-BLLR-85, GSSC-BLLR-86, GSSC-BLLR-87, GSSC-BLLR-88, GSSC-BLLR-89, GSSC-BLLR-90, GSSC-BLLR-91, GSSC-BLLR-92, GSSC-BLLR-93, GSSC-BLLR-94, GSSC-BLLR-95, GSSC-BLLR-96, GSSC-BLLR-97, GSSC-BLLR-98, GSSC-BLLR-99, GSSC-BLLR-100, GSSC-BLLR-136, GSSC-BLLR-137, GSSC-BLLR-138, GSSC-BLLR-139, GSSC-BLLR-140, GSSC-BLLR-141, GSSC-BLLR-142, GSSC-BLLR-143, GSSC-BLLR-144, GSSC-BLLR-145, GSSC-BLLR-146, GSSC-BLLR-147, GSSC-BLLR-148, GSSC-BLLR-149, GSSC-BLLR-150, GSSC-BLLR-151, GSSC-BLLR-152, GSSC-BLLR-153, GSSC-BLLR-154, GSSC-BLLR-155, GSSC-BLLR-156, GSSC-BLLR-157, GSSC-BLLR-158, GSSC-BLLR-159, GSSC-BLLR-160, GSSC-BLLR-161, GSSC-BLLR-162, GSSC-BLLR-163, GSSC-BLLR-164, GSSC-BLLR-165, scope=range_start, role=Implementation)
function project(user: StoredUser, caller: StoredUser): AccountView {
  const view: AccountView = {
    cuid: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    homeCity: user.homeCity,
    homeState: user.homeState,
  };
  if (canSee(caller, user, "username")) view.username = user.username;
  if (canSee(caller, user, "primaryEmail")) view.primaryEmail = user.primaryEmail;
  if (canSee(caller, user, "secondaryEmail")) view.secondaryEmail = user.secondaryEmail;
  if (canSee(caller, user, "primaryPhone")) view.primaryPhone = user.primaryPhone;
  if (canSee(caller, user, "secondaryPhone")) view.secondaryPhone = user.secondaryPhone;
  if (canSee(caller, user, "preferredContactMethod")) {
    view.preferredContactMethod = user.preferredContactMethod;
  }
  if (canSee(caller, user, "homeLine1")) view.homeLine1 = user.homeLine1;
  if (canSee(caller, user, "homeLine2")) view.homeLine2 = user.homeLine2;
  if (canSee(caller, user, "homeLine3")) view.homeLine3 = user.homeLine3;
  if (canSee(caller, user, "homeZip")) view.homeZip = user.homeZip;
  if (canSee(caller, user, "homeZipExtension")) view.homeZipExtension = user.homeZipExtension;
  if (canSee(caller, user, "homeAddressDisplay")) view.homeAddressDisplay = user.homeAddressDisplay;
  if (canSee(caller, user, "mailingLine1")) view.mailingLine1 = user.mailingLine1;
  if (canSee(caller, user, "mailingLine2")) view.mailingLine2 = user.mailingLine2;
  if (canSee(caller, user, "mailingLine3")) view.mailingLine3 = user.mailingLine3;
  if (canSee(caller, user, "mailingCity")) view.mailingCity = user.mailingCity;
  if (canSee(caller, user, "mailingState")) view.mailingState = user.mailingState;
  if (canSee(caller, user, "mailingZip")) view.mailingZip = user.mailingZip;
  if (canSee(caller, user, "mailingZipExtension")) {
    view.mailingZipExtension = user.mailingZipExtension;
  }
  if (canSee(caller, user, "secondaryEmailDisplay")) {
    view.secondaryEmailDisplay = user.secondaryEmailDisplay;
  }
  if (canSee(caller, user, "secondaryPhoneDisplay")) {
    view.secondaryPhoneDisplay = user.secondaryPhoneDisplay;
  }
  if (canSee(caller, user, "isAdmin")) view.isAdmin = user.isAdmin;
  if (canSee(caller, user, "isUserMod")) view.isUserMod = user.isUserMod;
  if (canSee(caller, user, "isToolEditor")) view.isToolEditor = user.isToolEditor;
  if (canSee(caller, user, "isPublicationEditor")) {
    view.isPublicationEditor = user.isPublicationEditor;
  }
  if (canSee(caller, user, "isNewsletterEditor")) {
    view.isNewsletterEditor = user.isNewsletterEditor;
  }
  if (canSee(caller, user, "membershipStatus")) view.membershipStatus = user.membershipStatus;
  // @relation(GSSC-BLLR-277, GSSC-BLLR-278, scope=range_start, role=Implementation)
  if (canSee(caller, user, "position")) view.position = user.position;
  // @relation(GSSC-BLLR-277, GSSC-BLLR-278, scope=range_end, role=Implementation)
  return view;
}

function canSee(caller: StoredUser, user: StoredUser, field: string): boolean {
  if (
    field === "cuid" ||
    field === "firstName" ||
    field === "middleName" ||
    field === "lastName" ||
    field === "homeCity" ||
    field === "homeState"
  ) {
    return true;
  }
  if (caller.id === user.id || caller.isAdmin || caller.isUserMod) return true;
  if (field === "primaryEmail") {
    return user.preferredContactMethod === "Email" || user.preferredContactMethod === "None";
  }
  if (field === "secondaryEmail") {
    return (
      user.secondaryEmailDisplay &&
      (user.preferredContactMethod === "Email" || user.preferredContactMethod === "None")
    );
  }
  if (field === "primaryPhone") {
    return user.preferredContactMethod === "Phone" || user.preferredContactMethod === "None";
  }
  if (field === "secondaryPhone") {
    return (
      user.secondaryPhoneDisplay &&
      (user.preferredContactMethod === "Phone" || user.preferredContactMethod === "None")
    );
  }
  if (
    field === "homeLine1" ||
    field === "homeLine2" ||
    field === "homeLine3" ||
    field === "homeZip" ||
    field === "homeZipExtension"
  ) {
    return user.homeAddressDisplay === "full";
  }
  return false;
}
// @relation(GSSC-BLLR-54, GSSC-BLLR-70, GSSC-BLLR-71, GSSC-BLLR-72, GSSC-BLLR-73, GSSC-BLLR-74, GSSC-BLLR-75, GSSC-BLLR-76, GSSC-BLLR-77, GSSC-BLLR-78, GSSC-BLLR-79, GSSC-BLLR-80, GSSC-BLLR-81, GSSC-BLLR-82, GSSC-BLLR-83, GSSC-BLLR-84, GSSC-BLLR-85, GSSC-BLLR-86, GSSC-BLLR-87, GSSC-BLLR-88, GSSC-BLLR-89, GSSC-BLLR-90, GSSC-BLLR-91, GSSC-BLLR-92, GSSC-BLLR-93, GSSC-BLLR-94, GSSC-BLLR-95, GSSC-BLLR-96, GSSC-BLLR-97, GSSC-BLLR-98, GSSC-BLLR-99, GSSC-BLLR-100, GSSC-BLLR-136, GSSC-BLLR-137, GSSC-BLLR-138, GSSC-BLLR-139, GSSC-BLLR-140, GSSC-BLLR-141, GSSC-BLLR-142, GSSC-BLLR-143, GSSC-BLLR-144, GSSC-BLLR-145, GSSC-BLLR-146, GSSC-BLLR-147, GSSC-BLLR-148, GSSC-BLLR-149, GSSC-BLLR-150, GSSC-BLLR-151, GSSC-BLLR-152, GSSC-BLLR-153, GSSC-BLLR-154, GSSC-BLLR-155, GSSC-BLLR-156, GSSC-BLLR-157, GSSC-BLLR-158, GSSC-BLLR-159, GSSC-BLLR-160, GSSC-BLLR-161, GSSC-BLLR-162, GSSC-BLLR-163, GSSC-BLLR-164, GSSC-BLLR-165, scope=range_end, role=Implementation)

// @relation(GSSC-BLLR-44, GSSC-BLLR-45, GSSC-BLLR-46, GSSC-BLLR-47, GSSC-BLLR-101, GSSC-BLLR-102, GSSC-BLLR-103, GSSC-BLLR-104, GSSC-BLLR-105, GSSC-BLLR-106, GSSC-BLLR-107, GSSC-BLLR-108, GSSC-BLLR-109, GSSC-BLLR-110, GSSC-BLLR-111, GSSC-BLLR-112, GSSC-BLLR-113, GSSC-BLLR-114, GSSC-BLLR-115, GSSC-BLLR-116, GSSC-BLLR-117, GSSC-BLLR-118, GSSC-BLLR-119, GSSC-BLLR-120, GSSC-BLLR-121, GSSC-BLLR-122, GSSC-BLLR-123, GSSC-BLLR-124, GSSC-BLLR-125, scope=range_start, role=Implementation)
function matchesAll(
  user: StoredUser,
  caller: StoredUser,
  filters: ReadonlyArray<readonly [string, string]>,
): boolean {
  return filters.every(([name, needle]) => matchesOne(user, caller, name, needle));
}

function matchesOne(user: StoredUser, caller: StoredUser, name: string, needle: string): boolean {
  if (name === "email") {
    return (
      (canSee(caller, user, "primaryEmail") && includes(user.primaryEmail, needle)) ||
      (canSee(caller, user, "secondaryEmail") && includes(user.secondaryEmail, needle))
    );
  }
  if (name === "phone") {
    return (
      (canSee(caller, user, "primaryPhone") && includes(user.primaryPhone, needle)) ||
      (canSee(caller, user, "secondaryPhone") && includes(user.secondaryPhone, needle))
    );
  }
  if (!canSee(caller, user, name)) return false;
  if (BOOLEAN_FILTERS.has(name)) return booleanMatch(booleanField(user, name), needle);
  if (STRING_LITERAL_FILTERS.has(name)) return literalMatch(stringField(user, name), needle);
  return includes(stringField(user, name), needle);
}
// @relation(GSSC-BLLR-44, GSSC-BLLR-45, GSSC-BLLR-46, GSSC-BLLR-47, GSSC-BLLR-101, GSSC-BLLR-102, GSSC-BLLR-103, GSSC-BLLR-104, GSSC-BLLR-105, GSSC-BLLR-106, GSSC-BLLR-107, GSSC-BLLR-108, GSSC-BLLR-109, GSSC-BLLR-110, GSSC-BLLR-111, GSSC-BLLR-112, GSSC-BLLR-113, GSSC-BLLR-114, GSSC-BLLR-115, GSSC-BLLR-116, GSSC-BLLR-117, GSSC-BLLR-118, GSSC-BLLR-119, GSSC-BLLR-120, GSSC-BLLR-121, GSSC-BLLR-122, GSSC-BLLR-123, GSSC-BLLR-124, GSSC-BLLR-125, scope=range_end, role=Implementation)

// @relation(GSSC-BLLR-126, GSSC-BLLR-127, GSSC-BLLR-128, GSSC-BLLR-129, GSSC-BLLR-130, GSSC-BLLR-131, GSSC-BLLR-132, scope=range_start, role=Implementation)
function readFilters(
  query: Record<string, string>,
): ReadonlyArray<readonly [string, string]> | "invalid" {
  const filters: Array<readonly [string, string]> = [];
  for (const [key, value] of Object.entries(query)) {
    const name = key.trim();
    if (
      name === "primaryEmail" ||
      name === "secondaryEmail" ||
      name === "primaryPhone" ||
      name === "secondaryPhone" ||
      name === "cuid" ||
      name === "passwordHash" ||
      !(
        TEXT_FILTERS.has(name) ||
        STRING_LITERAL_FILTERS.has(name) ||
        BOOLEAN_FILTERS.has(name) ||
        name === "email" ||
        name === "phone"
      )
    ) {
      return "invalid";
    }
    filters.push([name, value.trim()]);
  }
  return filters;
}
// @relation(GSSC-BLLR-126, GSSC-BLLR-127, GSSC-BLLR-128, GSSC-BLLR-129, GSSC-BLLR-130, GSSC-BLLR-131, GSSC-BLLR-132, scope=range_end, role=Implementation)

// @relation(GSSC-BLLR-61, GSSC-BLLR-62, GSSC-BLLR-65, GSSC-BLLR-66, GSSC-BLLR-172, GSSC-BLLR-173, GSSC-BLLR-174, GSSC-BLLR-175, GSSC-BLLR-176, GSSC-BLLR-177, GSSC-BLLR-178, GSSC-BLLR-179, GSSC-BLLR-180, GSSC-BLLR-181, GSSC-BLLR-182, GSSC-BLLR-183, GSSC-BLLR-184, GSSC-BLLR-185, GSSC-BLLR-186, GSSC-BLLR-187, GSSC-BLLR-188, GSSC-BLLR-189, GSSC-BLLR-190, GSSC-BLLR-191, GSSC-BLLR-192, GSSC-BLLR-193, GSSC-BLLR-194, GSSC-BLLR-195, GSSC-BLLR-196, GSSC-BLLR-197, GSSC-BLLR-198, GSSC-BLLR-199, GSSC-BLLR-200, GSSC-BLLR-201, GSSC-BLLR-202, GSSC-BLLR-203, GSSC-BLLR-204, GSSC-BLLR-205, GSSC-BLLR-206, GSSC-BLLR-207, GSSC-BLLR-208, GSSC-BLLR-209, GSSC-BLLR-210, GSSC-BLLR-211, GSSC-BLLR-212, GSSC-BLLR-213, GSSC-BLLR-214, GSSC-BLLR-215, GSSC-BLLR-216, GSSC-BLLR-217, GSSC-BLLR-218, GSSC-BLLR-220, GSSC-BLLR-221, GSSC-BLLR-222, GSSC-BLLR-223, scope=range_start, role=Implementation)
function buildPatch(
  body: Record<string, unknown> | "missing" | "malformed",
  caller: StoredUser,
  target: StoredUser,
  adminUsername: string,
): Prisma.UserUpdateInput | "forbidden" | "invalid" {
  if (body === "missing" || body === "malformed") return "invalid";
  if (
    !caller.isAdmin &&
    (Object.prototype.hasOwnProperty.call(body, "isAdmin") ||
      Object.prototype.hasOwnProperty.call(body, "isUserMod") ||
      Object.prototype.hasOwnProperty.call(body, "isToolEditor") ||
      Object.prototype.hasOwnProperty.call(body, "isPublicationEditor") ||
      Object.prototype.hasOwnProperty.call(body, "isNewsletterEditor"))
  ) {
    return "forbidden";
  }

  const permanent = target.username === adminUsername;
  const data: Prisma.UserUpdateInput = {};
  for (const key of Object.keys(body)) {
    if (key === "token") continue;
    if (key === "cuid" || key === "passwordHash") return "invalid";
    const value = body[key];
    if (key === "isAdmin" || key === "isUserMod") {
      if (typeof value !== "boolean") return "invalid";
      data[key] = value;
      continue;
    }
    // @relation(GSSC-BLLR-353, scope=range_start, role=Implementation)
    if (key === "isToolEditor") {
      if (typeof value !== "boolean") return "invalid";
      data.isToolEditor = value;
      continue;
    }
    // @relation(GSSC-BLLR-353, scope=range_end, role=Implementation)
    // @relation(GSSC-BLLR-364, scope=range_start, role=Implementation)
    if (key === "isPublicationEditor") {
      if (typeof value !== "boolean") return "invalid";
      data.isPublicationEditor = value;
      continue;
    }
    // @relation(GSSC-BLLR-364, scope=range_end, role=Implementation)
    // @relation(GSSC-BLLR-398, scope=range_start, role=Implementation)
    if (key === "isNewsletterEditor") {
      if (typeof value !== "boolean") return "invalid";
      data.isNewsletterEditor = value;
      continue;
    }
    // @relation(GSSC-BLLR-398, scope=range_end, role=Implementation)
    if (key === "secondaryEmailDisplay" || key === "secondaryPhoneDisplay") {
      if (typeof value !== "boolean") return "invalid";
      data[key] = value;
      continue;
    }
    if (key === "membershipStatus") {
      if (caller.id === target.id) return "invalid";
      if (typeof value !== "string") return "invalid";
      data.membershipStatus = value === "" ? null : value;
      continue;
    }
    // @relation(GSSC-BLLR-279, GSSC-BLLR-280, GSSC-BLLR-281, GSSC-BLLR-282, scope=range_start, role=Implementation)
    if (key === "position") {
      if (!caller.isAdmin && caller.id === target.id) return "invalid";
      if (typeof value !== "string") return "invalid";
      data.position = value === "" ? null : value;
      continue;
    }
    // @relation(GSSC-BLLR-279, GSSC-BLLR-280, GSSC-BLLR-281, GSSC-BLLR-282, scope=range_end, role=Implementation)
    if (!WRITABLE_TEXT.has(key) || typeof value !== "string") return "invalid";
    const stored = storedText(key, value, permanent);
    if (stored === "invalid") return "invalid";
    assignText(data, key, stored);
  }
  return data;
}

function storedText(
  key: string,
  value: string,
  permanent: boolean,
): string | null | "invalid" {
  if (ZIP5.has(key) && value !== "" && !/^[0-9]{5}$/.test(value)) return "invalid";
  if (ZIP4.has(key) && value !== "" && !/^[0-9]{4}$/.test(value)) return "invalid";
  if (key === "username") return value === "" ? "invalid" : value;
  if (key === "homeAddressDisplay") {
    return value === "full" || value === "redacted" ? value : "invalid";
  }
  if (key === "preferredContactMethod") {
    if (value === "") return permanent ? null : "invalid";
    return value === "Email" || value === "Phone" || value === "None" ? value : "invalid";
  }
  if (value === "") {
    if (CLEARABLE_TEXT.has(key)) return null;
    if (REQUIRED_TEXT.has(key)) return permanent ? null : "invalid";
    return "invalid";
  }
  return value;
}

function assignText(data: Prisma.UserUpdateInput, key: string, value: string | null): void {
  switch (key) {
    case "firstName":
    case "middleName":
    case "lastName":
    case "primaryEmail":
    case "secondaryEmail":
    case "primaryPhone":
    case "secondaryPhone":
    case "preferredContactMethod":
    case "homeLine1":
    case "homeLine2":
    case "homeLine3":
    case "homeCity":
    case "homeState":
    case "homeZip":
    case "homeZipExtension":
    case "homeAddressDisplay":
    case "mailingLine1":
    case "mailingLine2":
    case "mailingLine3":
    case "mailingCity":
    case "mailingState":
    case "mailingZip":
    case "mailingZipExtension":
      data[key] = value;
      return;
    case "username":
      if (value !== null) data.username = value;
      return;
    default:
      return;
  }
}

// @relation(GSSC-BLLR-63, GSSC-BLLR-219, scope=range_start, role=Implementation)
async function identifiersAvailable(
  prisma: PrismaClient,
  target: StoredUser,
  data: Prisma.UserUpdateInput,
): Promise<boolean> {
  if (typeof data.username === "string" && data.username !== target.username) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
      select: { id: true },
    });
    if (existing && existing.id !== target.id) return false;
  }
  if (typeof data.primaryEmail === "string" && data.primaryEmail !== target.primaryEmail) {
    const existing = await prisma.user.findUnique({
      where: { primaryEmail: data.primaryEmail },
      select: { id: true },
    });
    if (existing && existing.id !== target.id) return false;
  }
  return true;
}
// @relation(GSSC-BLLR-63, GSSC-BLLR-219, scope=range_end, role=Implementation)

async function saveUser(
  prisma: PrismaClient,
  id: string,
  data: Prisma.UserUpdateInput,
): Promise<void> {
  if (Object.keys(data).length === 0) return;
  const username = typeof data.username === "string" ? data.username : undefined;
  const clearsEmail = Object.prototype.hasOwnProperty.call(data, "primaryEmail") && data.primaryEmail === null;
  if (clearsEmail && username !== undefined) {
    const rest: Prisma.UserUpdateInput = { ...data };
    delete rest.username;
    await prisma.$transaction(async (tx) => {
      if (Object.keys(rest).length > 0) await tx.user.update({ where: { id }, data: rest });
      await tx.user.update({ where: { id }, data: { username } });
    });
    return;
  }
  await prisma.user.update({ where: { id }, data });
}
// @relation(GSSC-BLLR-61, GSSC-BLLR-62, GSSC-BLLR-65, GSSC-BLLR-66, GSSC-BLLR-172, GSSC-BLLR-173, GSSC-BLLR-174, GSSC-BLLR-175, GSSC-BLLR-176, GSSC-BLLR-177, GSSC-BLLR-178, GSSC-BLLR-179, GSSC-BLLR-180, GSSC-BLLR-181, GSSC-BLLR-182, GSSC-BLLR-183, GSSC-BLLR-184, GSSC-BLLR-185, GSSC-BLLR-186, GSSC-BLLR-187, GSSC-BLLR-188, GSSC-BLLR-189, GSSC-BLLR-190, GSSC-BLLR-191, GSSC-BLLR-192, GSSC-BLLR-193, GSSC-BLLR-194, GSSC-BLLR-195, GSSC-BLLR-196, GSSC-BLLR-197, GSSC-BLLR-198, GSSC-BLLR-199, GSSC-BLLR-200, GSSC-BLLR-201, GSSC-BLLR-202, GSSC-BLLR-203, GSSC-BLLR-204, GSSC-BLLR-205, GSSC-BLLR-206, GSSC-BLLR-207, GSSC-BLLR-208, GSSC-BLLR-209, GSSC-BLLR-210, GSSC-BLLR-211, GSSC-BLLR-212, GSSC-BLLR-213, GSSC-BLLR-214, GSSC-BLLR-215, GSSC-BLLR-216, GSSC-BLLR-217, GSSC-BLLR-218, GSSC-BLLR-220, GSSC-BLLR-221, GSSC-BLLR-222, GSSC-BLLR-223, scope=range_end, role=Implementation)

function stringField(user: StoredUser, name: string): string | null {
  switch (name) {
    case "firstName":
      return user.firstName;
    case "middleName":
      return user.middleName;
    case "lastName":
      return user.lastName;
    case "username":
      return user.username;
    case "membershipStatus":
      return user.membershipStatus;
    case "preferredContactMethod":
      return user.preferredContactMethod;
    case "homeAddressDisplay":
      return user.homeAddressDisplay;
    case "homeLine1":
      return user.homeLine1;
    case "homeLine2":
      return user.homeLine2;
    case "homeLine3":
      return user.homeLine3;
    case "homeCity":
      return user.homeCity;
    case "homeState":
      return user.homeState;
    case "homeZip":
      return user.homeZip;
    case "homeZipExtension":
      return user.homeZipExtension;
    case "mailingLine1":
      return user.mailingLine1;
    case "mailingLine2":
      return user.mailingLine2;
    case "mailingLine3":
      return user.mailingLine3;
    case "mailingCity":
      return user.mailingCity;
    case "mailingState":
      return user.mailingState;
    case "mailingZip":
      return user.mailingZip;
    case "mailingZipExtension":
      return user.mailingZipExtension;
    default:
      return null;
  }
}

function booleanField(user: StoredUser, name: string): boolean {
  switch (name) {
    case "isAdmin":
      return user.isAdmin;
    case "isUserMod":
      return user.isUserMod;
    case "isToolEditor":
      return user.isToolEditor;
    case "isPublicationEditor":
      return user.isPublicationEditor;
    case "isNewsletterEditor":
      return user.isNewsletterEditor;
    case "secondaryEmailDisplay":
      return user.secondaryEmailDisplay;
    case "secondaryPhoneDisplay":
      return user.secondaryPhoneDisplay;
    default:
      return false;
  }
}

function includes(stored: string | null, needle: string): boolean {
  if (stored === null) return false;
  return stored.toLowerCase().includes(needle.toLowerCase());
}

function literalMatch(stored: string | null, needle: string): boolean {
  if (stored === null) return false;
  return stored.toLowerCase() === needle.toLowerCase();
}

function booleanMatch(stored: boolean, needle: string): boolean {
  const text = needle.toLowerCase();
  if (text !== "true" && text !== "false") return false;
  return stored === (text === "true");
}

function bodyRecord(value: unknown): Record<string, unknown> | "missing" | "malformed" {
  if (value === undefined) return "missing";
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "malformed";
  }
  return value as Record<string, unknown>;
}

function trimStrings(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === "string") (value as Record<string, unknown>)[key] = item.trim();
  }
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isPrimaryEmailGuard(error: unknown): boolean {
  return error instanceof Error && error.message.includes("primary email");
}
