import { ForumState, type ForumDetail, type ForumFailure } from "@aegis/shared/feedback/Forum";
import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { ForumVerdict } from "@aegis/shared/feedback/ForumVerdict";
import { isForumVerdict } from "@aegis/shared/feedback/isForumVerdict";
import { MAX_FORUM_COMMENT, MAX_FORUM_VOTE_REASON, MIN_FORUM_VOTE_REASON } from "@aegis/shared/feedback/limits";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "#api/accounts/AccountStore";
import type { ForumStore } from "#api/bugs/ForumStore";
import { hasBlockedCommunityText } from "#api/community/hasBlockedCommunityText";
import { parseId } from "#api/http/parseId";
import { tokenBucketLimiter, type TokenBucketOptions } from "#api/http/rateLimit";
import type { ReplayRecord } from "#api/replays/inputs/types";

const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ForumReplaySource = {
  load: (id: number) => Promise<ReplayRecord | undefined>;
  render: (id: number, record: ReplayRecord) => Promise<Uint8Array>;
};

export type ForumRouteDeps = {
  app: Express;
  board: ForumBoard;
  store: ForumStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
  replays?: ForumReplaySource;
};

type Viewer = { accountId: string; isAdmin: boolean };
type Handler = (req: Request, res: Response, viewer: Viewer, id: number) => Promise<void>;

const WRITE_RATE_LIMIT: TokenBucketOptions = { capacity: 20, refillMs: 60_000 };
const REPLAY_RATE_LIMIT: TokenBucketOptions = { capacity: 4, refillMs: 60_000 };
const FAILURE_STATUS: Record<ForumFailure, number> = {
  not_found: 404,
  closed: 409,
  own_report: 403,
  invalid_verdict: 400,
  reason_too_short: 400,
  reason_too_long: 400,
  empty_comment: 400,
  comment_too_long: 400,
  blocked_text: 400,
  admin_required: 403,
  replay_not_found: 404,
  replay_unavailable: 422,
};

export function installForumRoutes({ app, board, store, session, replays }: ForumRouteDeps): void {
  const limitWrites = tokenBucketLimiter(WRITE_RATE_LIMIT);
  const limitReplays = tokenBucketLimiter(REPLAY_RATE_LIMIT);
  const at = (suffix: string) => [`/feedback/${board}${suffix}`, `/account/feedback/${board}${suffix}`];

  const run =
    (work: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction): void => {
      res.set("Cache-Control", "no-store");
      work(req, res).catch(next);
    };

  async function signedIn(req: Request, res: Response): Promise<Viewer | undefined> {
    const auth = await session(req);
    if (!auth) {
      res.status(401).json({ error: "authentication_required" });
      return undefined;
    }
    return { accountId: auth.account.id, isAdmin: auth.account.isAdmin };
  }

  const onReport = (handler: Handler, { write = false, admin = false } = {}) =>
    run(async (req, res) => {
      const viewer = await signedIn(req, res);
      if (!viewer) return;
      if (admin && !viewer.isAdmin) return reply(res, { error: "admin_required" });
      if (write && !limitWrites(viewer.accountId)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      const id = parseId(req.params.id);
      if (id === undefined) return reply(res, { error: "not_found" });
      await handler(req, res, viewer, id);
    });

  const reply = (res: Response, result: ForumDetail | { error: ForumFailure } | undefined) => {
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
    at(""),
    run(async (req, res) => {
      const viewer = await signedIn(req, res);
      if (!viewer) return;
      const state = req.query.state ?? ForumState.OPEN.value;
      if (state !== ForumState.OPEN.value && state !== ForumState.DECIDED.value) {
        res.status(400).json({ error: "invalid_state" });
        return;
      }
      const page = req.query.page === undefined ? 1 : parseId(req.query.page);
      if (page === undefined) {
        res.status(400).json({ error: "invalid_page" });
        return;
      }
      res.json(await store.list(viewer.accountId, state, page));
    }),
  );

  app.get(
    at("/:id"),
    onReport(async (_req, res, viewer, id) => reply(res, await store.detail(viewer, id))),
  );

  app.put(
    at("/:id/vote"),
    onReport(
      async (req, res, viewer, id) => {
        if (board === ForumBoard.IDEAS.value)
          return reply(res, await store.vote(viewer, id, { verdict: ForumVerdict.YES.value, reason: "" }));
        const body = (req.body ?? {}) as { verdict?: unknown; reason?: unknown };
        if (!isForumVerdict(body.verdict)) return reply(res, { error: "invalid_verdict" });
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (reason.length < MIN_FORUM_VOTE_REASON) return reply(res, { error: "reason_too_short" });
        if (reason.length > MAX_FORUM_VOTE_REASON) return reply(res, { error: "reason_too_long" });
        if (hasBlockedCommunityText(reason)) return reply(res, { error: "blocked_text" });
        reply(res, await store.vote(viewer, id, { verdict: body.verdict, reason }));
      },
      { write: true },
    ),
  );

  app.delete(
    at("/:id/vote"),
    onReport(async (_req, res, viewer, id) => reply(res, await store.retract(viewer, id)), { write: true }),
  );

  app.post(
    at("/:id/comments"),
    onReport(
      async (req, res, viewer, id) => {
        const raw = (req.body as { body?: unknown } | undefined)?.body;
        const body = typeof raw === "string" ? raw.trim() : "";
        if (!body) return reply(res, { error: "empty_comment" });
        if (body.length > MAX_FORUM_COMMENT) return reply(res, { error: "comment_too_long" });
        if (hasBlockedCommunityText(body)) return reply(res, { error: "blocked_text" });
        reply(res, await store.comment(viewer, id, body));
      },
      { write: true },
    ),
  );

  app.delete(
    at("/:id/comments/:commentId"),
    onReport(
      async (req, res, viewer, id) => {
        const commentId = parseId(req.params.commentId);
        if (commentId === undefined) return reply(res, { error: "not_found" });
        reply(res, await store.removeComment(viewer, id, commentId));
      },
      { admin: true },
    ),
  );

  app.delete(
    at("/:id/votes/:voterId"),
    onReport(
      async (req, res, viewer, id) => {
        const voterId = String(req.params.voterId);
        if (!ACCOUNT_ID.test(voterId)) return reply(res, { error: "not_found" });
        return reply(res, await store.removeVote(viewer, id, voterId));
      },
      { admin: true },
    ),
  );

  if (!replays) return;
  app.get(
    at("/:id/replay"),
    onReport(async (_req, res, viewer, id) => {
      if (!limitReplays(viewer.accountId)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      if (!(await store.exists(id))) return reply(res, { error: "not_found" });
      const record = await replays.load(id);
      if (!record) return reply(res, { error: "replay_not_found" });
      let file: Uint8Array;
      try {
        file = await replays.render(id, record);
      } catch (failure) {
        console.error("[forum] could not render replay", id, failure);
        return reply(res, { error: "replay_unavailable" });
      }
      res.type("application/gzip").send(Buffer.from(file));
    }),
  );
}
