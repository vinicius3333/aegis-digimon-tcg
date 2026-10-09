import {
  isClosedFeedbackStatus,
  isFeedbackStatus,
  MAX_FEEDBACK_FINAL_REPLY,
  MAX_FEEDBACK_INTERNAL_NOTE,
  MAX_FEEDBACK_REOPEN_COMMENT,
  MAX_FEEDBACK_SEARCH,
  type FeedbackReopenFailure,
  type FeedbackTriageFailure,
  type FeedbackTriageUpdate,
} from "@aegis/shared";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import { parseId } from "../http/parseId.js";
import { tokenBucketLimiter, type TokenBucketOptions } from "../http/rateLimit.js";
import type { FeedbackFilter, FeedbackStore } from "./FeedbackStore.js";
import { FEEDBACK_KINDS, type FeedbackKind } from "./GitHubIssueTracker.js";

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
  app.get("/admin/feedback", list);
  // The address the first admin inbox used; kept so an open tab from before the triage release still loads.
  app.get("/account/feedback", list);

  app.get(
    "/admin/feedback/:id",
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

  app.patch(
    "/admin/feedback/:id",
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
    "/feedback/mine",
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
    "/feedback/mine/:id",
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
    "/feedback/mine/:id/reopen",
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

export function validateReopenComment(raw: unknown): string | { error: FeedbackReopenFailure } {
  const comment = typeof raw === "string" ? raw.trim() : "";
  if (!comment) return { error: "empty_comment" };
  if (comment.length > MAX_FEEDBACK_REOPEN_COMMENT) return { error: "comment_too_long" };
  return comment;
}

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

type TriageBody = {
  revision?: unknown;
  status?: unknown;
  finalReply?: unknown;
  internalNote?: unknown;
  duplicateOfId?: unknown;
  confirmedBug?: unknown;
};

export function validateTriage(body: unknown): FeedbackTriageUpdate | { error: FeedbackTriageFailure } {
  const input = (body ?? {}) as TriageBody;
  if (!isFeedbackStatus(input.status)) return { error: "invalid_status" };
  const revision = input.revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
    return { error: "invalid_revision" };
  }
  const finalReply = typeof input.finalReply === "string" ? input.finalReply.trim() : "";
  if (finalReply.length > MAX_FEEDBACK_FINAL_REPLY) return { error: "final_reply_too_long" };
  if (isClosedFeedbackStatus(input.status) && !finalReply) return { error: "final_reply_required" };
  const internalNote = typeof input.internalNote === "string" ? input.internalNote.trim() : "";
  if (internalNote.length > MAX_FEEDBACK_INTERNAL_NOTE) return { error: "internal_note_too_long" };

  let duplicateOfId: number | null = null;
  if (input.status === "duplicate") {
    if (input.duplicateOfId === undefined || input.duplicateOfId === null)
      return { error: "duplicate_target_required" };
    duplicateOfId = parseId(input.duplicateOfId) ?? null;
    if (duplicateOfId === null) return { error: "invalid_duplicate_target" };
  }
  return {
    revision,
    status: input.status,
    finalReply,
    internalNote,
    duplicateOfId,
    ...(typeof input.confirmedBug === "boolean" ? { confirmedBug: input.confirmedBug } : {}),
  };
}
