import { CardColor, COMMUNITY_PERIODS, COMMUNITY_SORTS, type CommunityPeriod, type CommunitySort } from "@aegis/shared";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import { tokenBucketLimiter, type TokenBucketOptions } from "../http/rateLimit.js";
import type { CommunityDeckStore } from "./CommunityDeckStore.js";

// Generous for a person clicking hearts while browsing, tight for a script.
const LIKE_RATE_LIMIT: TokenBucketOptions = { capacity: 30, refillMs: 2_000 };
const PUBLISH_RATE_LIMIT: TokenBucketOptions = { capacity: 10, refillMs: 30_000 };
const MAX_SEARCH = 60;
const MAX_PAGE = 200;
const DECK_COLORS: readonly string[] = Object.values(CardColor).filter((color) => color !== CardColor.None);

export type CommunityDeckRouteDeps = {
  app: Express;
  store: CommunityDeckStore;
  /** The session lookup the account routes already own, so there is one cookie reader. */
  session: (req: Request) => Promise<AuthSession | undefined>;
};

/**
 * Public decks. Reading is open to everyone, guests included; publishing, liking and counting a
 * copy need an account, because those are the numbers the ranking is built on.
 */
export function installCommunityDeckRoutes({ app, store, session }: CommunityDeckRouteDeps): void {
  const limitLike = tokenBucketLimiter(LIKE_RATE_LIMIT);
  const limitPublish = tokenBucketLimiter(PUBLISH_RATE_LIMIT);
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
      const deck = await store.deck(req.params.id!, viewer?.account.id);
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
