import { isFeedbackStatus } from "@aegis/shared/feedback/isFeedbackStatus";
import { FEEDBACK_KINDS, type FeedbackKind } from "@aegis/shared/feedback/types";
import { MAX_FEEDBACK_SEARCH } from "@aegis/shared/feedback/limits";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "#api/accounts/AccountStore";
import { parseId } from "#api/http/parseId";
import { tokenBucketLimiter, type TokenBucketOptions } from "#api/http/rateLimit";
import type { FeedbackFilter, FeedbackStore } from "#api/bugs/FeedbackStore";
import { validateReopenComment } from "#api/bugs/validateReopenComment";
import { validateTriage } from "#api/bugs/validateTriage";

export type FeedbackTriageRouteDeps = {
  app: Express;
  store: FeedbackStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
};

type Handler = (req: Request, res: Response) => Promise<void>;

/** Admin triage of every report, and each reporter's view of their own with a one-time reopen. */
export function installFeedbackTriageRoutes({ app, store, session }: FeedbackTriageRouteDeps): void {
  const limitReopen = tokenBucketLimiter(REOPEN_RATE_LIMIT);
  const route =
    (handler: Handler) =>
    (req: Request, res: Response, next: NextFunction): void => {
      res.set("Cache-Control", "no-store");
      handler(req, res).catch(next);
    };

  async function signedIn(req: Request, res: Response): Promise<AuthSession | undefined> {
    const auth = await session(req);
    if (!auth) res.status(401).json({ error: "authentication_required" });
    return auth;
  }

  // The flag is read from the session on every request, so a revoked admin loses access at once.
  async function admin(req: Request, res: Response): Promise<AuthSession | undefined> {
    const auth = await signedIn(req, res);
    if (auth && !auth.account.isAdmin) {
      res.status(403).json({ error: "admin_required" });
      return undefined;
    }
    return auth;
  }

  const list = route(async (req, res) => {
    if (!(await admin(req, res))) return;
    const filter = parseFilter(req.query);
    if ("error" in filter) {
      res.status(400).json({ error: filter.error });
      return;
    }
    res.json(await store.list(filter));
  });
  app.get(["/admin/feedback", "/account/admin/feedback"], list);
  // The address the first admin inbox used; kept so an open tab from before the triage release still loads.
  app.get("/account/feedback", list);

  app.get(
    ["/admin/feedback/:id", "/account/admin/feedback/:id"],
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      const id = parseId(req.params.id);
      const detail = id === undefined ? undefined : await store.detail(id);
      if (!detail) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(detail);
    }),
  );

  // The private replay saved with a report: both decks and every action, so admins only.
  app.get(
    ["/admin/feedback/:id/replay", "/account/admin/feedback/:id/replay"],
    route(async (req, res) => {
      if (!(await admin(req, res))) return;
      const id = parseId(req.params.id);
      if (id === undefined) {
        res.status(400).json({ error: "invalid_id" });
        return;
      }
      const record = await store.replay(id);
      if (!record) {
        res.status(404).json({ error: "replay_not_found" });
        return;
      }
      res.json(record);
    }),
  );

  app.patch(
    ["/admin/feedback/:id", "/account/admin/feedback/:id"],
    route(async (req, res) => {
      const auth = await admin(req, res);
      if (!auth) return;
      const id = parseId(req.params.id);
      if (id === undefined) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const update = validateTriage(req.body);
      if ("error" in update) {
        res.status(400).json({ error: update.error });
        return;
      }
      const result = await store.triage(id, auth.account.id, update);
      if ("error" in result) {
        if (result.error === "stale_revision") {
          res.status(409).json({ error: result.error, current: await store.detail(id) });
          return;
        }
        res.status(result.error === "not_found" ? 404 : 400).json({ error: result.error });
        return;
      }
      res.json(result);
    }),
  );

  app.get(
    ["/feedback/mine", "/account/feedback/mine"],
    route(async (req, res) => {
      const auth = await signedIn(req, res);
      if (!auth) return;
      const raw = req.query.before;
      const before = raw === undefined ? undefined : parseId(raw);
      if (raw !== undefined && before === undefined) {
        res.status(400).json({ error: "invalid_cursor" });
        return;
      }
      res.json(await store.listOwn(auth.account.id, before));
    }),
  );

  app.get(
    ["/feedback/mine/:id", "/account/feedback/mine/:id"],
    route(async (req, res) => {
      const auth = await signedIn(req, res);
      if (!auth) return;
      const id = parseId(req.params.id);
      // Someone else's report answers exactly like a missing one, so ids cannot be probed.
      const report = id === undefined ? undefined : await store.readOwn(auth.account.id, id);
      if (!report) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(report);
    }),
  );

  app.post(
    ["/feedback/mine/:id/reopen", "/account/feedback/mine/:id/reopen"],
    route(async (req, res) => {
      const auth = await signedIn(req, res);
      if (!auth) return;
      if (!limitReopen(auth.account.id)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      const id = parseId(req.params.id);
      if (id === undefined) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const comment = validateReopenComment((req.body as { comment?: unknown } | undefined)?.comment);
      if (typeof comment !== "string") {
        res.status(400).json(comment);
        return;
      }
      const result = await store.reopen(auth.account.id, id, comment);
      if ("error" in result) {
        res.status(result.error === "not_found" ? 404 : 409).json({ error: result.error });
        return;
      }
      res.json(result);
    }),
  );
}

// Each report reopens at most once, so this only guards against a client stuck in a retry loop.
const REOPEN_RATE_LIMIT: TokenBucketOptions = { capacity: 5, refillMs: 60_000 };

function parseFilter(query: Request["query"]): FeedbackFilter | { error: string } {
  const filter: FeedbackFilter = {};
  const { status, reopened, kind, q, before } = query;
  if (status !== undefined && status !== "") {
    if (!isFeedbackStatus(status)) return { error: "invalid_status" };
    filter.status = status;
  }
  if (reopened !== undefined && reopened !== "") {
    if (reopened !== "1") return { error: "invalid_reopened" };
    filter.reopened = true;
  }
  if (kind !== undefined && kind !== "") {
    if (!FEEDBACK_KINDS.includes(kind as FeedbackKind)) return { error: "invalid_kind" };
    filter.kind = kind as FeedbackKind;
  }
  if (q !== undefined) {
    if (typeof q !== "string") return { error: "invalid_search" };
    const search = q.trim().slice(0, MAX_FEEDBACK_SEARCH);
    if (search) filter.search = search;
  }
  if (before !== undefined) {
    const cursor = parseId(before);
    if (cursor === undefined) return { error: "invalid_cursor" };
    filter.before = cursor;
  }
  return filter;
}
