import { Elysia, t } from "elysia";

import { loadConfig } from "../config";
import { getPrisma } from "../db";

const NullableText = t.Nullable(t.String());

const LeadershipEntry = t.Object({
  position: t.String(),
  firstName: NullableText,
  lastName: NullableText,
  preferredContactMethod: NullableText,
  primaryEmail: t.Optional(NullableText),
  primaryPhone: t.Optional(NullableText),
  accountPhoto: t.Optional(NullableText),
});

type LeaderRow = {
  position: string | null;
  firstName: string | null;
  lastName: string | null;
  preferredContactMethod: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  accountPhoto: string | null;
};

type LeadershipView = {
  position: string;
  firstName: string | null;
  lastName: string | null;
  preferredContactMethod: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  accountPhoto?: string | null;
};

export const leadership = new Elysia({
  name: "leadership",
  prefix: "/leadership",
  normalize: false,
})
  .get(
    "/",
    async ({ status }) => {
      // @relation(GSSC-BLLR-283, GSSC-BLLR-284, scope=range_start, role=Implementation)
      const prisma = getPrisma(loadConfig().DATABASE_URL);
      const rows = await prisma.user.findMany({
        where: { position: { not: null } },
        select: {
          position: true,
          firstName: true,
          lastName: true,
          preferredContactMethod: true,
          primaryEmail: true,
          primaryPhone: true,
          accountPhoto: true,
        },
        orderBy: { id: "asc" },
      });
      const leaders = rows
        .filter((row): row is LeaderRow & { position: string } => {
          return typeof row.position === "string" && row.position !== "";
        })
        .map(projectLeader);
      return status(200, leaders);
      // @relation(GSSC-BLLR-283, GSSC-BLLR-284, scope=range_end, role=Implementation)
    },
    {
      response: {
        200: t.Array(LeadershipEntry),
      },
    },
  );

// @relation(GSSC-BLLR-285, GSSC-BLLR-286, GSSC-BLLR-287, GSSC-BLLR-288, GSSC-BLLR-289, GSSC-BLLR-290, GSSC-BLLR-291, scope=range_start, role=Implementation)
function projectLeader(row: LeaderRow & { position: string }): LeadershipView {
  const view: LeadershipView = {
    position: row.position,
    firstName: row.firstName,
    lastName: row.lastName,
    preferredContactMethod: row.preferredContactMethod,
  };
  if (row.preferredContactMethod === "Email") view.primaryEmail = row.primaryEmail;
  if (row.preferredContactMethod === "Phone") view.primaryPhone = row.primaryPhone;
  if (row.accountPhoto !== null && row.accountPhoto !== "") view.accountPhoto = row.accountPhoto;
  return view;
}
// @relation(GSSC-BLLR-285, GSSC-BLLR-286, GSSC-BLLR-287, GSSC-BLLR-288, GSSC-BLLR-289, GSSC-BLLR-290, GSSC-BLLR-291, scope=range_end, role=Implementation)
