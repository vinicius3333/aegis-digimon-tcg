import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import { parseId } from "../http/parseId.js";
import { MAX_MARK_READ_IDS, type NotificationStore } from "./NotificationStore.js";

export type NotificationRouteDeps = {
  app: Express;
  store: NotificationStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
};

type Handler = (req: Request, res: Response, auth: AuthSession) => Promise<void>;

/**
 * The signed-in player's inbox. Clients poll `unread-count`, so it stays a single indexed count
 * and never returns the notifications themselves.
 */
export function installNotificationRoutes({ app, store, session }: NotificationRouteDeps): void {
  const route =
    (handler: Handler) =>
    (req: Request, res: Response, next: NextFunction): void => {
      res.set("Cache-Control", "no-store");
      void (async () => {
        const auth = await session(req);
        if (!auth) {
          res.status(401).json({ error: "authentication_required" });
          return;
        }
        await handler(req, res, auth);
      })().catch(next);
    };

  app.get(
    ["/notifications", "/account/notifications"],
    route(async (req, res, auth) => {
      const raw = req.query.before;
      const before = raw === undefined ? undefined : parseId(raw);
      if (raw !== undefined && before === undefined) {
        res.status(400).json({ error: "invalid_cursor" });
        return;
      }
      res.json(await store.list(auth.account.id, before));
    }),
  );

  app.get(
    ["/notifications/unread-count", "/account/notifications/unread-count"],
    route(async (_req, res, auth) => {
      res.json({ unread: await store.unreadCount(auth.account.id) });
    }),
  );

  app.post(
    ["/notifications/read", "/account/notifications/read"],
    route(async (req, res, auth) => {
      const body = (req.body ?? {}) as { ids?: unknown; all?: unknown };
      if (body.all === true) {
        res.json({ unread: await store.markRead(auth.account.id, "all") });
        return;
      }
      const ids = Array.isArray(body.ids) ? body.ids.map(parseId) : undefined;
      if (!ids || ids.length > MAX_MARK_READ_IDS || ids.some((id) => id === undefined)) {
        res.status(400).json({ error: "invalid_ids" });
        return;
      }
      res.json({ unread: await store.markRead(auth.account.id, ids as number[]) });
    }),
  );
}
