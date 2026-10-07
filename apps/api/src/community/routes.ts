import {
  CardColor,
  COMMUNITY_MODERATION_ACTIONS,
  COMMUNITY_PERIODS,
  COMMUNITY_REPORT_DETAILS_MAX,
  COMMUNITY_REPORT_REASONS,
  COMMUNITY_SORTS,
  type CommunityPeriod,
  type CommunityReportInput,
  type CommunitySort,
} from "@aegis/shared";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import { tokenBucketLimiter, type TokenBucketOptions } from "../http/rateLimit.js";
import type { CommunityDeckStore } from "./CommunityDeckStore.js";
import type { DeckReportTracker } from "./deckReports.js";

// Generous for a person clicking hearts while browsing, tight for a script.
const LIKE_RATE_LIMIT: TokenBucketOptions = { capacity: 30, refillMs: 2_000 };
const PUBLISH_RATE_LIMIT: TokenBucketOptions = { capacity: 10, refillMs: 30_000 };
// Every accepted report becomes a public issue or comment, so the budget is a few per minute.
const REPORT_RATE_LIMIT: TokenBucketOptions = { capacity: 5, refillMs: 60_000 };
const MAX_SEARCH = 60;
const MAX_PAGE = 200;
const DECK_COLORS: readonly string[] = Object.values(CardColor).filter((color) => color !== CardColor.None);

export type CommunityDeckRouteDeps = {
  app: Express;
  store: CommunityDeckStore;
  /** The session lookup the account routes already own, so there is one cookie reader. */
  session: (req: Request) => Promise<AuthSession | undefined>;
  /** Absent when this deployment has no GitHub token; reporting then answers 503. */
  reports?: DeckReportTracker;
};

/**
 * Public decks. Reading is open to everyone, guests included; publishing, liking and counting a
 * copy need an account, because those are the numbers the ranking is built on.
 *
 * Reporting a deck also needs an account. Aegis keeps no report of its own: each one becomes a
 * GitHub issue, and an admin acts on it by hiding the deck through the moderation route.
 */
export function installCommunityDeckRoutes({ app, store, session, reports }: CommunityDeckRouteDeps): void {
  const limitLike = tokenBucketLimiter(LIKE_RATE_LIMIT);
  const limitPublish = tokenBucketLimiter(PUBLISH_RATE_LIMIT);
  const limitReport = tokenBucketLimiter(REPORT_RATE_LIMIT);
  const route =
    (handler: (req: Request<Record<string, string>>, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => {
      handler(req as Request<Record<string, string>>, res).catch(next);
    };
  const requireSession = async (req: Request, res: Response) => {
    const current = await session(req);
    if (!current) res.sendStatus(401);
    return current;
  };

  app.get(
    "/community/decks",
    route(async (req, res) => {
      const viewer = await session(req);
      res.json(await store.list({ ...parseListQuery(req.query), viewerId: viewer?.account.id }));
    }),
  );

  app.get(
    "/community/decks/:id",
    route(async (req, res) => {
      const viewer = await session(req);
      const deck = await store.deck(req.params.id!, viewer?.account.id, viewer?.account.isAdmin === true);
      if (deck) res.json(deck);
      else res.sendStatus(404);
    }),
  );

  for (const [method, liked] of [
    ["put", true],
    ["delete", false],
  ] as const)
    app[method](
      "/community/decks/:id/like",
      route(async (req, res) => {
        const current = await requireSession(req, res);
        if (!current) return;
        if (!limitLike(current.account.id)) {
          res.status(429).json({ error: "too_many_requests" });
          return;
        }
        const result = liked
          ? await store.like(current.account.id, req.params.id!)
          : await store.unlike(current.account.id, req.params.id!);
        if (result.ok) res.json(result.like);
        else res.status(result.error === "own_deck" ? 403 : 404).json({ error: result.error });
      }),
    );

  app.post(
    "/community/decks/:id/copies",
    route(async (req, res) => {
      const current = await requireSession(req, res);
      if (!current) return;
      res.sendStatus((await store.recordCopy(current.account.id, req.params.id!)) ? 204 : 404);
    }),
  );

  app.post(
    "/community/decks/:id/reports",
    route(async (req, res) => {
      if (!reports) {
        res.status(503).json({ error: "reports_unavailable" });
        return;
      }
      const current = await requireSession(req, res);
      if (!current) return;
      const input = parseReport(req.body);
      if (!input) {
        res.status(400).json({ error: "invalid_report" });
        return;
      }
      if (!limitReport(current.account.id)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      const target = await store.reportTarget(current.account.id, req.params.id!);
      if (!target.ok) {
        res.status(target.error === "own_deck" ? 403 : 404).json({ error: target.error });
        return;
      }
      await reports.report({
        deckId: target.deck.id,
        deckName: target.deck.name,
        authorName: target.deck.authorName,
        ...input,
      });
      res.sendStatus(204);
    }),
  );

  app.post(
    "/admin/community/decks/:id/moderation",
    route(async (req, res) => {
      const current = await requireSession(req, res);
      if (!current) return;
      if (!current.account.isAdmin) {
        res.status(403).json({ error: "admin_required" });
        return;
      }
      const action = COMMUNITY_MODERATION_ACTIONS.find((value) => value === req.body?.action);
      if (!action) {
        res.status(400).json({ error: "invalid_action" });
        return;
      }
      const status = await store.moderate(req.params.id!, action);
      if (status) res.json({ status });
      else res.sendStatus(404);
    }),
  );

  app.get(
    "/community/publications",
    route(async (req, res) => {
      const current = await requireSession(req, res);
      if (current) res.json(await store.publications(current.account.id));
    }),
  );

  app.put(
    "/community/publications/:deckId",
    route(async (req, res) => {
      const current = await requireSession(req, res);
      if (!current) return;
      if (!limitPublish(current.account.id)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      const result = await store.publish(current.account.id, req.params.deckId!);
      if (result.ok) res.json(result.publication);
      else res.status(result.error === "deck_not_found" ? 404 : 422).json({ error: result.error });
    }),
  );

  app.delete(
    "/community/publications/:deckId",
    route(async (req, res) => {
      const current = await requireSession(req, res);
      if (current) res.sendStatus((await store.unpublish(current.account.id, req.params.deckId!)) ? 204 : 404);
    }),
  );
}

function parseReport(body: unknown): CommunityReportInput | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { reason, details } = body as Record<string, unknown>;
  const knownReason = COMMUNITY_REPORT_REASONS.find((value) => value === reason);
  if (!knownReason) return undefined;
  if (details === undefined || details === null) return { reason: knownReason };
  if (typeof details !== "string") return undefined;
  const trimmed = details.trim();
  if (trimmed.length > COMMUNITY_REPORT_DETAILS_MAX) return undefined;
  return trimmed ? { reason: knownReason, details: trimmed } : { reason: knownReason };
}

function parseListQuery(query: Request["query"]): {
  sort: CommunitySort;
  period: CommunityPeriod;
  colors: string[];
  search: string;
  page: number;
} {
  const text = (key: string) => (typeof query[key] === "string" ? query[key] : "");
  const sort = COMMUNITY_SORTS.find((value) => value === text("sort")) ?? "top";
  const period = COMMUNITY_PERIODS.find((value) => value === text("period")) ?? "week";
  const colors = text("colors")
    .split(",")
    .filter((color) => DECK_COLORS.includes(color));
  const page = Math.min(MAX_PAGE, Math.max(0, Number.parseInt(text("page"), 10) || 0));
  return { sort, period, colors: [...new Set(colors)], search: text("q").slice(0, MAX_SEARCH), page };
}
