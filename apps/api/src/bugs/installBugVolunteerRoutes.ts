import { MAX_BUG_VOLUNTEER_NOTE } from "@aegis/shared/feedback/limits";
import type { BugVolunteerFailure, OpenBugDetail } from "@aegis/shared/feedback/OpenBug";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "#api/accounts/AccountStore";
import type { BugVolunteerStore } from "#api/bugs/BugVolunteerStore";
import { parseId } from "#api/http/parseId";
import { tokenBucketLimiter, type TokenBucketOptions } from "#api/http/rateLimit";

export type BugVolunteerRouteDeps = {
  app: Express;
  store: BugVolunteerStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
};

type Handler = (req: Request, res: Response, auth: AuthSession, id: number) => Promise<void>;

const NOTE_RATE_LIMIT: TokenBucketOptions = { capacity: 10, refillMs: 60_000 };
const FAILURE_STATUS: Record<BugVolunteerFailure, number> = {
  not_found: 404,
  closed: 409,
  empty_note: 400,
  note_too_long: 400,
};

export function installBugVolunteerRoutes({ app, store, session }: BugVolunteerRouteDeps): void {
  const limitNotes = tokenBucketLimiter(NOTE_RATE_LIMIT);

  async function signedIn(req: Request, res: Response): Promise<AuthSession | undefined> {
    res.set("Cache-Control", "no-store");
    const auth = await session(req);
    if (!auth) res.status(401).json({ error: "authentication_required" });
    return auth;
  }

  const onBug =
    (handler: Handler) =>
    (req: Request, res: Response, next: NextFunction): void => {
      void (async () => {
        const auth = await signedIn(req, res);
        if (!auth) return;
        const id = parseId(req.params.id);
        if (id === undefined) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        await handler(req, res, auth, id);
      })().catch(next);
    };

  const reply = (res: Response, result: OpenBugDetail | { error: BugVolunteerFailure } | undefined) => {
    if (!result) res.status(404).json({ error: "not_found" });
    else if ("error" in result) res.status(FAILURE_STATUS[result.error]).json(result);
    else res.json(result);
  };

  app.get(["/feedback/open-bugs", "/account/feedback/open-bugs"], (req, res, next) => {
    void (async () => {
      const auth = await signedIn(req, res);
      if (!auth) return;
      const raw = req.query.before;
      const before = raw === undefined ? undefined : parseId(raw);
      if (raw !== undefined && before === undefined) {
        res.status(400).json({ error: "invalid_cursor" });
        return;
      }
      res.json(await store.listOpen(auth.account.id, before));
    })().catch(next);
  });

  app.get(
    ["/feedback/open-bugs/:id", "/account/feedback/open-bugs/:id"],
    onBug(async (_req, res, auth, id) => reply(res, await store.detail(auth.account.id, id))),
  );

  app.put(
    ["/feedback/open-bugs/:id/claim", "/account/feedback/open-bugs/:id/claim"],
    onBug(async (_req, res, auth, id) => reply(res, await store.claim(auth.account.id, id))),
  );

  app.delete(
    ["/feedback/open-bugs/:id/claim", "/account/feedback/open-bugs/:id/claim"],
    onBug(async (_req, res, auth, id) => reply(res, await store.release(auth.account.id, id))),
  );

  app.post(
    ["/feedback/open-bugs/:id/notes", "/account/feedback/open-bugs/:id/notes"],
    onBug(async (req, res, auth, id) => {
      if (!limitNotes(auth.account.id)) {
        res.status(429).json({ error: "too_many_requests" });
        return;
      }
      const raw = (req.body as { body?: unknown } | undefined)?.body;
      const body = typeof raw === "string" ? raw.trim() : "";
      if (!body) return reply(res, { error: "empty_note" });
      if (body.length > MAX_BUG_VOLUNTEER_NOTE) return reply(res, { error: "note_too_long" });
      reply(res, await store.addNote(auth.account.id, id, body));
    }),
  );
}
