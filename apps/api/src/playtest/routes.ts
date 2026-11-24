import { MAX_STUDY_BLURB, MAX_STUDY_LINK, MAX_STUDY_TITLE, type PlaytestStudyFailure } from "@aegis/shared";
import type { Express, NextFunction, Request, Response } from "express";
import type { AuthSession } from "../accounts/AccountStore.js";
import type { NewStudy, PlaytestStore } from "./PlaytestStore.js";

export type PlaytestRouteDeps = {
  app: Express;
  store: PlaytestStore;
  session: (req: Request) => Promise<AuthSession | undefined>;
};

export type NewStudyInput = Omit<NewStudy, "createdBy">;

type Handler = (req: Request, res: Response, auth: AuthSession) => Promise<void>;

export function installPlaytestRoutes({ app, store, session }: PlaytestRouteDeps): void {
  const route =
    (handler: Handler, { admin = false } = {}) =>
    (req: Request, res: Response, next: NextFunction): void => {
      res.set("Cache-Control", "no-store");
      void (async () => {
        const auth = await session(req);
        if (!auth) {
          res.status(401).json({ error: "authentication_required" });
          return;
        }
        if (admin && !auth.account.isAdmin) {
          res.status(403).json({ error: "admin_required" });
          return;
        }
        await handler(req, res, auth);
      })().catch(next);
    };

  app.get(
    "/account/playtest",
    route(async (_req, res, auth) => {
      res.json(await store.membership(auth.account.id));
    }),
  );

  app.put(
    "/account/playtest",
    route(async (req, res, auth) => {
      const member = (req.body as { member?: unknown } | undefined)?.member;
      if (typeof member !== "boolean") {
        res.status(400).json({ error: "invalid_member" });
        return;
      }
      res.json(await store.setMembership(auth.account.id, member));
    }),
  );

  app.get(
    ["/admin/playtest/members", "/account/admin/playtest/members"],
    route(
      async (_req, res) => {
        res.json({ members: await store.members() });
      },
      { admin: true },
    ),
  );

  app.get(
    ["/admin/playtest/studies", "/account/admin/playtest/studies"],
    route(
      async (_req, res) => {
        res.json(await store.studies());
      },
      { admin: true },
    ),
  );

  app.post(
    ["/admin/playtest/studies", "/account/admin/playtest/studies"],
    route(
      async (req, res, auth) => {
        const now = Date.now();
        const input = validateStudy(req.body, now);
        if ("error" in input) {
          res.status(400).json({ error: input.error });
          return;
        }
        res.status(201).json(await store.createStudy({ ...input, createdBy: auth.account.id }, now));
      },
      { admin: true },
    ),
  );
}

export function validateStudy(body: unknown, now: number): NewStudyInput | { error: PlaytestStudyFailure } {
  const input = (body ?? {}) as Record<string, unknown>;
  const title = text(input.title);
  if (!title || title.length > MAX_STUDY_TITLE) return { error: "invalid_title" };
  const blurb = text(input.blurb);
  if (!blurb || blurb.length > MAX_STUDY_BLURB) return { error: "invalid_blurb" };
  const link = text(input.link);
  if (!link || link.length > MAX_STUDY_LINK || !isHttpsUrl(link)) return { error: "invalid_link" };
  const opensAt = input.opensAt === undefined ? now : epoch(input.opensAt);
  const closesAt = epoch(input.closesAt);
  if (opensAt === undefined || closesAt === undefined || closesAt <= opensAt || closesAt <= now || opensAt > now) {
    return { error: "invalid_window" };
  }
  return { title, blurb, link, opensAt, closesAt };
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function epoch(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.floor(value))
    ? Math.floor(value)
    : undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
