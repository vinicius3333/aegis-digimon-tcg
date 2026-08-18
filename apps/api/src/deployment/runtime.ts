import { timingSafeEqual } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";

export type DeploymentSlot = "blue" | "green" | "legacy";

export interface DeploymentRuntimeOptions {
  slot: DeploymentSlot;
  revision: string;
  adminToken: string;
  activeRooms: () => number;
  connectedClients: () => number;
  readiness: () => Promise<boolean>;
  acceptingNewRooms?: boolean;
}

export interface DeploymentStatus {
  slot: DeploymentSlot;
  revision: string;
  acceptingNewRooms: boolean;
  activeRooms: number;
  connectedClients: number;
}

export interface DeploymentRuntime {
  health: () => Pick<DeploymentStatus, "slot" | "revision" | "acceptingNewRooms"> & { status: "ok" };
  status: () => DeploymentStatus;
  isAuthorized: (authorization: string | undefined) => boolean;
  isReady: () => Promise<boolean>;
  drain: () => DeploymentStatus;
  activate: () => DeploymentStatus;
  allowMatchmaking: (method: string) => boolean;
}

const DRAIN_ALLOWED_METHODS = new Set(["reconnect", "join", "joinbyid"]);

export function createDeploymentRuntime(options: DeploymentRuntimeOptions): DeploymentRuntime {
  let acceptingNewRooms = options.acceptingNewRooms ?? true;

  const status = (): DeploymentStatus => ({
    slot: options.slot,
    revision: options.revision,
    acceptingNewRooms,
    activeRooms: options.activeRooms(),
    connectedClients: options.connectedClients(),
  });

  return {
    health: () => ({
      status: "ok",
      slot: options.slot,
      revision: options.revision,
      acceptingNewRooms,
    }),
    status,
    isAuthorized: (authorization) => bearerMatches(authorization, options.adminToken),
    isReady: options.readiness,
    drain: () => {
      acceptingNewRooms = false;
      return status();
    },
    activate: () => {
      acceptingNewRooms = true;
      return status();
    },
    allowMatchmaking: (method) => acceptingNewRooms || DRAIN_ALLOWED_METHODS.has(method.toLocaleLowerCase()),
  };
}

export function installDeploymentRoutes({
  app,
  runtime,
}: {
  app: Express;
  runtime: DeploymentRuntime;
}): void {
  app.get("/health", (_request, response) => {
    response.json(runtime.health());
  });

  app.get("/ready", async (_request, response) => {
    let ready = false;
    try {
      ready = await runtime.isReady();
    } catch {
      ready = false;
    }
    const health = runtime.health();
    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      slot: health.slot,
      revision: health.revision,
    });
  });

  app.get("/deployment/status", requireAdmin(runtime), (_request, response) => {
    response.json(runtime.status());
  });

  app.post("/deployment/drain", requireAdmin(runtime), (_request, response) => {
    response.json(runtime.drain());
  });

  app.post("/deployment/activate", requireAdmin(runtime), (_request, response) => {
    response.json(runtime.activate());
  });

  app.use("/matchmake", (request, response, next) => {
    const method = request.path.split("/").filter(Boolean)[0] ?? "";
    if (runtime.allowMatchmaking(method)) {
      next();
      return;
    }
    response.status(503).json({
      code: "AEGIS_DEPLOYMENT_DRAINING",
      error: "This game server is draining; retry on the active slot.",
    });
  });
}

function requireAdmin(runtime: DeploymentRuntime) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (runtime.isAuthorized(request.header("authorization"))) {
      next();
      return;
    }
    response.sendStatus(401);
  };
}

function bearerMatches(authorization: string | undefined, expectedToken: string): boolean {
  const prefix = "Bearer ";
  if (!authorization?.startsWith(prefix) || expectedToken.length === 0) return false;
  const provided = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
