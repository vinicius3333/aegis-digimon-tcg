import { findBoosterProduct } from "@aegis/shared/packOpening/findBoosterProduct";
import { isSealedProductAvailable } from "@aegis/shared/sealed/isSealedProductAvailable";
import { getPrivateSealedResults } from "#api/rooms/sealed/getPrivateSealedResults";
import { reconcilePrivateSealedResult } from "#api/rooms/sealed/reconcilePrivateSealedResult";
import { closePrivateSealedRoom } from "#api/rooms/sealed/closePrivateSealedRoom";
import { tokenBucketLimiter } from "#api/http/rateLimit";
import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { matchMaker } from "colyseus";
import type { AccountStore } from "#api/accounts/AccountStore";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import { createPrivateSealedRoom } from "#api/rooms/sealed/createPrivateSealedRoom";

const cookieName = "aegis_private_sealed";
type Params = { app: Express; accounts: AccountStore };
export function installPrivateSealedRoutes({ app, accounts }: Params): void {
  const store = new PrivateSealedStore(accounts);
  const results = getPrivateSealedResults({ accounts });
  const createSeries = tokenBucketLimiter({ capacity: 6, refillMs: 60000 });
  const admit = tokenBucketLimiter({ capacity: 60, refillMs: 1000 });
  app.use("/private-sealed", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" && (!req.is("application/json") || req.headers["sec-fetch-site"] === "cross-site")) {
      res.status(403).json({ error: "private_transport_required" });
      return;
    }
    if (req.method !== "GET" && !admit(req.ip ?? "unknown")) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    next();
  });
  app.post("/private-sealed", async (req, res) => {
    if (!createSeries(req.ip ?? "unknown")) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    const body = req.body;
    if (
      !isName(body?.name) ||
      typeof body?.requestId !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.requestId)
    ) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const product = findBoosterProduct(body.setId);
    if (!product || !isSealedProductAvailable({ product })) {
      res.status(400).json({ error: "sealed_product_unavailable" });
      return;
    }
    await respond(res, async () =>
      store.create({
        credential: getCredential(req, res, true)!,
        name: body.name.trim(),
        requestId: body.requestId,
        setId: product.value,
      }),
    );
  });
  app.post("/private-sealed/:code/join", async (req, res) => {
    if (
      req.body?.setId !== undefined ||
      req.body?.configuration !== undefined ||
      req.body?.sealedConfiguration !== undefined
    ) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    if (!isName(req.body?.name)) {
      res.status(400).json({ error: "invalid_name" });
      return;
    }
    await respond(res, async () =>
      store.join({ code: getCode(req), credential: getCredential(req, res, true)!, name: req.body.name.trim() }),
    );
  });
  app.use("/private-sealed/:code", async (req, res, next) => {
    try {
      await reconcilePrivateSealedResult({
        store,
        results,
        owner: { code: getCode(req), credential: getRequiredCredential(req, res) },
      });
      next();
    } catch (error) {
      await respond(res, async () => {
        throw error;
      });
    }
  });
  app.get("/private-sealed/:code", async (req, res) => {
    await respond(res, async () => store.view({ code: getCode(req), credential: getRequiredCredential(req, res) }));
  });
  app.post("/private-sealed/:code/ready", async (req, res) => {
    const body = req.body;
    if (!body || !isDeckInput(body) || typeof body.window !== "string" || body.window.length > 80) {
      res.status(400).json({ error: "invalid_deck" });
      return;
    }
    await respond(res, async () =>
      store.ready({
        code: getCode(req),
        credential: getRequiredCredential(req, res),
        mainDeck: body.mainDeck,
        eggDeck: body.eggDeck,
        revision: body.revision,
        window: body.window,
      }),
    );
  });
  app.post("/private-sealed/:code/start", async (req, res) => {
    await respond(res, async () =>
      store.start({
        code: getCode(req),
        credential: getRequiredCredential(req, res),
        createRoom: (input) => createPrivateSealedRoom({ accounts, ...input }),
        roomExists: async (roomId) => (await matchMaker.query({ roomId })).length > 0,
        isRoomFinished: async (roomId) => matchMaker.remoteRoomCall(roomId, "hasFinishedPrivateSealedGame", []),
        closeRoom: (roomId) => closePrivateSealedRoom({ roomId }),
      }),
    );
  });
  app.post("/private-sealed/:code/cancel", async (req, res) => {
    await respond(res, async () =>
      store.cancel({
        code: getCode(req),
        credential: getRequiredCredential(req, res),
        closeRoom: (roomId) => closePrivateSealedRoom({ roomId }),
      }),
    );
  });
}
function isName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 40;
}
function getCode(req: Request): string {
  const code = req.params.code;
  if (typeof code !== "string" || !/^[A-F0-9]{18}$/i.test(code)) {
    throw new Error("series_not_found");
  }
  return code.toUpperCase();
}
function getCredential(req: Request, res: Response, create = false): string | null {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (cookie && /^[a-f0-9]{64}$/.test(cookie)) {
    return cookie;
  }
  if (!create) {
    return null;
  }
  const credential = randomBytes(32).toString("hex");
  res.cookie(cookieName, credential, {
    httpOnly: true,
    secure: req.secure || process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return credential;
}
function getRequiredCredential(req: Request, res: Response): string {
  const credential = getCredential(req, res);
  if (!credential) {
    throw new Error("seat_required");
  }
  return credential;
}
async function respond(res: Response, run: () => Promise<unknown>): Promise<void> {
  try {
    res.json(await run());
  } catch (error) {
    const message = error instanceof Error ? error.message : "private_sealed_error";
    const expected = new Set([
      "creation_conflict",
      "sealed_configuration_invalid",
      "sealed_product_unavailable",
      "sealed_pool_insufficient_main",
      "seat_required",
      "series_not_found",
      "room_full",
      "series_closed",
      "window_closed",
      "stale_revision",
      "not_ready",
      "game_interrupted",
      "game_starting",
      "result_pending",
      "main_deck_size",
      "egg_deck_size",
      "pool_exceeded",
      "invalid_card",
      "wrong_zone",
      "invalid_sealed_deck",
      "sealed_deck_size",
      "sealed_card_not_owned",
      "sealed_card_zone",
    ]);
    if (!expected.has(message)) {
      throw error;
    }
    res.status(message === "seat_required" ? 403 : 409).json({ error: message });
  }
}

function isDeckInput(body: Record<string, unknown>): boolean {
  return (
    Number.isSafeInteger(body.revision) &&
    Number(body.revision) >= 0 &&
    [body.mainDeck, body.eggDeck].every(
      (cards) =>
        Array.isArray(cards) &&
        cards.length <= 72 &&
        cards.every((card) => typeof card === "string" && card.length <= 100),
    )
  );
}
