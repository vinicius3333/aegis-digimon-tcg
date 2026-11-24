import { BugForumState, type BugForumDetail, type BugForumFailure } from "@aegis/shared/feedback/BugForum";
import { isBugVerdict } from "@aegis/shared/feedback/isBugVerdict";
import { MAX_BUG_FORUM_COMMENT, MAX_BUG_VOTE_REASON, MIN_BUG_VOTE_REASON } from "@aegis/shared/feedback/limits";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "#api/accounts/AccountStore";
import type { BugForumStore } from "#api/bugs/BugForumStore";
import { hasBlockedCommunityText } from "#api/community/hasBlockedCommunityText";
import { parseId } from "#api/http/parseId";
import { tokenBucketLimiter, type TokenBucketOptions } from "#api/http/rateLimit";

export type BugForumRouteDeps = {
  app: Express;
  store: BugForumStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
};

type Handler = (req: Request, res: Response, auth: AuthSession, id: number) => Promise<void>;

const WRITE_RATE_LIMIT: TokenBucketOptions = { capacity: 20, refillMs: 60_000 };
const FAILURE_STATUS: Record<BugForumFailure, number> = {
  not_found: 404,
  closed: 409,
  own_report: 403,
  invalid_verdict: 400,
  reason_too_short: 400,
  reason_too_long: 400,
  empty_comment: 400,
  comment_too_long: 400,
  blocked_text: 400,
};
const BASE = ["/feedback/bugs", "/account/feedback/bugs"];
const at = (suffix: string) => BASE.map((base) => `${base}${suffix}`);

export function installBugForumRoutes({ app, store, session }: BugForumRouteDeps): void {
  const limitWrites = tokenBucketLimiter(WRITE_RATE_LIMIT);

  const run =
    (work: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction): void => {
      res.set("Cache-Control", "no-store");
      work(req, res).catch(next);
    };

  async function signedIn(req: Request, res: Response): Promise<AuthSession | undefined> {
    const auth = await session(req);
    if (!auth) res.status(401).json({ error: "authentication_required" });
    return auth;
  }

  const onBug = (handler: Handler, { write = false } = {}) =>
    run(async (req, res) => {
      const auth = await signedIn(req, res);
      if (!auth) return;
      if (write && !limitWrites(auth.account.id)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      const id = parseId(req.params.id);
      if (id === undefined) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      await handler(req, res, auth, id);
    });

  const reply = (res: Response, result: BugForumDetail | { error: BugForumFailure } | undefined) => {
    if (!result) res.status(404).json({ error: "not_found" });
    else if ("error" in result) res.status(FAILURE_STATUS[result.error]).json(result);
    else res.json(result);
  };

  app.get(
    at("/summary"),
    run(async (req, res) => {
      const auth = await session(req);
      res.json(await store.summary(auth?.account.id));
    }),
  );

  app.get(
    BASE,
    run(async (req, res) => {
      const auth = await signedIn(req, res);
      if (!auth) return;
      const state = req.query.state ?? BugForumState.OPEN.value;
      if (state !== BugForumState.OPEN.value && state !== BugForumState.DECIDED.value) {
        res.status(400).json({ error: "invalid_state" });
        return;
      }
      const raw = req.query.before;
      const before = raw === undefined ? undefined : parseId(raw);
      if (raw !== undefined && before === undefined) {
        res.status(400).json({ error: "invalid_cursor" });
        return;
      }
      res.json(await store.list(auth.account.id, state, before));
    }),
  );

  app.get(
    at("/:id"),
    onBug(async (_req, res, auth, id) => reply(res, await store.detail(auth.account.id, id, auth.account.isAdmin))),
  );

  app.put(
    at("/:id/vote"),
    onBug(
      async (req, res, auth, id) => {
        const body = (req.body ?? {}) as { verdict?: unknown; reason?: unknown };
        if (!isBugVerdict(body.verdict)) return reply(res, { error: "invalid_verdict" });
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (reason.length < MIN_BUG_VOTE_REASON) return reply(res, { error: "reason_too_short" });
        if (reason.length > MAX_BUG_VOTE_REASON) return reply(res, { error: "reason_too_long" });
        if (hasBlockedCommunityText(reason)) return reply(res, { error: "blocked_text" });
        reply(res, await store.vote(auth.account.id, id, { verdict: body.verdict, reason }));
      },
      { write: true },
    ),
  );

  app.delete(
    at("/:id/vote"),
    onBug(async (_req, res, auth, id) => reply(res, await store.retract(auth.account.id, id)), { write: true }),
  );

  app.post(
    at("/:id/comments"),
    onBug(
      async (req, res, auth, id) => {
        const raw = (req.body as { body?: unknown } | undefined)?.body;
        const body = typeof raw === "string" ? raw.trim() : "";
        if (!body) return reply(res, { error: "empty_comment" });
        if (body.length > MAX_BUG_FORUM_COMMENT) return reply(res, { error: "comment_too_long" });
        if (hasBlockedCommunityText(body)) return reply(res, { error: "blocked_text" });
        reply(res, await store.comment(auth.account.id, id, body));
      },
      { write: true },
    ),
  );
}
