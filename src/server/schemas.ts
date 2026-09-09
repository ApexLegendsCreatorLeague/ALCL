import "server-only";

import { z } from "zod";
import { isProhibitedSupporterCategory } from "@/config/community-tournament";

const uuid = z.uuid();
const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/);
const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/)
  .refine((value) => value !== "TR", "ALCL is unavailable in Turkey.");
const zeroMoney = z.coerce.number().finite().refine((value) => value === 0, {
  message: "Fees and cash prizes must be zero in community mode.",
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_]+$/)
    .optional(),
  countryCode: countryCode.optional(),
  bio: z.string().trim().max(500).optional(),
});

export const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  shortName: z.string().trim().min(2).max(8).toUpperCase(),
  slug,
});

export const tournamentSchema = z
  .object({
    seasonId: uuid,
    name: z.string().trim().min(3).max(120),
    slug,
    countryCode,
    entryFeeUsd: zeroMoney.default(0),
    registrationOpensAt: z.iso.datetime().optional(),
    registrationClosesAt: z.iso.datetime().optional(),
    startsAt: z.iso.datetime().optional(),
    endsAt: z.iso.datetime().optional(),
    maxTeams: z.coerce.number().int().min(2).max(200).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.registrationOpensAt &&
      value.registrationClosesAt &&
      Date.parse(value.registrationClosesAt) <= Date.parse(value.registrationOpensAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["registrationClosesAt"],
        message: "Registration must close after it opens.",
      });
    }
    if (
      value.startsAt &&
      value.endsAt &&
      Date.parse(value.endsAt) < Date.parse(value.startsAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Tournament must end after it starts.",
      });
    }
  });

export const rosterSchema = z
  .object({
    teamId: uuid,
    tournamentId: uuid,
    players: z
      .array(
        z.object({
          playerId: uuid,
          slot: z.coerce.number().int().min(1).max(5),
          isSubstitute: z.boolean().default(false),
        }),
      )
      .min(3)
      .max(5),
  })
  .superRefine((value, context) => {
    if (new Set(value.players.map(({ playerId }) => playerId)).size !== value.players.length) {
      context.addIssue({ code: "custom", path: ["players"], message: "Players must be unique." });
    }
    if (value.players.filter(({ isSubstitute }) => isSubstitute).length > 2) {
      context.addIssue({
        code: "custom",
        path: ["players"],
        message: "A roster may have at most two substitutes.",
      });
    }
  });

export const registrationSchema = z.object({
  tournamentId: uuid,
  teamId: uuid,
  rosterId: uuid,
  acceptedRuleId: uuid,
});

export const matchResultSchema = z.object({
  matchId: uuid,
  teamId: uuid,
  placement: z.coerce.number().int().positive().max(60),
  kills: z.coerce.number().int().nonnegative().max(200),
  bonusPoints: z.coerce.number().finite().min(-1000).max(1000).default(0),
  penaltyPoints: z.coerce.number().finite().nonnegative().max(1000).default(0),
  evidencePath: z.string().trim().max(500).optional(),
});

export const supporterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: slug.refine(
    (value) => !isProhibitedSupporterCategory(value),
    "This supporter category is prohibited in ALCL community mode.",
  ),
  websiteUrl: z
    .url()
    .refine((value) => value.startsWith("https://"), "Use an HTTPS URL.")
    .optional(),
  annualNonCashValueUsd: z.coerce.number().finite().nonnegative().max(10_000),
  startsOn: z.iso.date(),
  endsOn: z.iso.date().optional(),
});

export const prizeSchema = z.object({
  description: z.string().trim().min(3).max(500),
  kind: z.literal("non_cash").default("non_cash"),
  cashValueUsd: zeroMoney.default(0),
  fairMarketValueUsd: z.coerce.number().finite().nonnegative().max(10_000),
});

export const ruleSchema = z.object({
  leagueId: uuid.optional(),
  tournamentId: uuid.optional(),
  version: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(100).max(100_000),
  effectiveAt: z.iso.datetime(),
}).refine((value) => Boolean(value.leagueId) !== Boolean(value.tournamentId), {
  message: "Provide exactly one league or tournament.",
});
