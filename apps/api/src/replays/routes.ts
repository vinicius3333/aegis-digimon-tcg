import { MAX_SAVED_REPLAYS } from "@aegis/shared";
import type { Express, Request, Response, NextFunction } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import { tokenBucketLimiter } from "../http/rateLimit.js";
import { ReplayLibraryError, type ReplayLibrary } from "./ReplayLibrary.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function installReplayRoutes({
  app,
  library,
  session,
}: {
  app: Express;
  library: ReplayLibrary;
  session: (req: Request) => Promise<AuthSession | undefined>;
}): void {
  const limit = tokenBucketLimiter({ capacity: 30, refillMs: 2000 });
  const route =
    (work: (req: Request, res: Response, owner: string) => Promise<void>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        const current = await session(req);
        if (!current) {
          res.sendStatus(401);
          return;
        }
        if (!limit(current.account.id)) {
          res.status(429).json({ error: "too_many_requests" });
          return;
        }
        await work(req, res, current.account.id);
      } catch (error) {
        if (error instanceof ReplayLibraryError) res.status(503).json({ error: error.code });
        else next(error);
      }
    };
  app.get(
    "/account/replays",
    route(async (_req, res, owner) => {
      res.json({ enabled: library.enabled, limit: MAX_SAVED_REPLAYS, replays: await library.list(owner) });
    }),
  );
  app.get(
    "/account/replays/:id/file",
    route(async (req, res, owner) => {
      const id = String(req.params.id ?? "");
      if (!UUID.test(id)) {
        res.sendStatus(404);
        return;
      }
      const file = await library.file(owner, id);
      if (!file) {
        res.sendStatus(404);
        return;
      }
      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `attachment; filename="aegis-${id}.aegis-replay"`);
      res.send(file.bytes);
    }),
  );
  app.delete(
    "/account/replays/:id",
    route(async (req, res, owner) => {
      const id = String(req.params.id ?? "");
      if (!UUID.test(id)) {
        res.sendStatus(404);
        return;
      }
      res.status((await library.remove(owner, id)) ? 200 : 404).json({ ok: true });
    }),
  );
}
