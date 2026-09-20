import type { IncomingMessage, ServerResponse } from "node:http";
import { Server, type ServerOptions } from "colyseus";
import type { DeploymentRuntime } from "./runtime.js";

export type LogicalReconnectHandler = (body: unknown) => Promise<{
  status: number;
  body: Record<string, unknown>;
}>;

/**
 * Colyseus installs matchmaking directly on the raw HTTP server and deliberately
 * bypasses pre-existing Express listeners. The deployment gate therefore belongs
 * at this framework seam rather than only in Express middleware.
 */
export class DeploymentServer extends Server {
  constructor(
    private readonly deploymentRuntime: DeploymentRuntime,
    options: ServerOptions,
    private readonly logicalReconnectHandler?: LogicalReconnectHandler,
  ) {
    super(options);
  }

  protected override async handleMatchMakeRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const method = matchmakingMethod(request.url);
    if (request.method === "POST" && method && !this.deploymentRuntime.allowMatchmaking(method)) {
      response.writeHead(503, {
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": request.headers.origin ?? "*",
        "Content-Type": "application/json",
      });
      response.end(
        JSON.stringify({
          code: "AEGIS_DEPLOYMENT_DRAINING",
          error: "This game server is draining; retry on the active slot.",
        }),
      );
      return;
    }
    if (request.method === "POST" && isLogicalReconnectPath(request.url)) {
      await this.handleLogicalReconnect(request, response);
      return;
    }
    await super.handleMatchMakeRequest(request, response);
  }

  private async handleLogicalReconnect(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const headers = {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": request.headers.origin ?? "*",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json",
    };
    if (!this.logicalReconnectHandler) {
      response.writeHead(404, headers);
      response.end(JSON.stringify({ error: "ROOM_HANDOFF_UNAVAILABLE" }));
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    request.on("data", (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > 8_192) {
        tooLarge = true;
        return;
      }
      chunks.push(bytes);
    });
    request.on("end", () => {
      if (tooLarge) {
        response.writeHead(413, headers);
        response.end(JSON.stringify({ error: "ROOM_RECONNECT_REQUEST_INVALID" }));
        return;
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        response.writeHead(400, headers);
        response.end(JSON.stringify({ error: "ROOM_RECONNECT_REQUEST_INVALID" }));
        return;
      }
      void this.logicalReconnectHandler!(body)
        .then((result) => {
          response.writeHead(result.status, headers);
          response.end(JSON.stringify(result.body));
        })
        .catch(() => {
          response.writeHead(503, headers);
          response.end(JSON.stringify({ error: "ROOM_RECONNECT_UNAVAILABLE" }));
        });
    });
    request.on("error", () => {
      if (response.headersSent) return;
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "ROOM_RECONNECT_REQUEST_INVALID" }));
    });
  }
}

function matchmakingMethod(requestUrl: string | undefined): string | undefined {
  const pathname = new URL(requestUrl ?? "/", "http://localhost").pathname;
  const segments = pathname.split("/").filter(Boolean);
  const matchmakeIndex = segments.indexOf("matchmake");
  return matchmakeIndex === -1 ? undefined : segments[matchmakeIndex + 1];
}

function isLogicalReconnectPath(requestUrl: string | undefined): boolean {
  const pathname = new URL(requestUrl ?? "/", "http://localhost").pathname;
  return pathname === "/matchmake/reconnect";
}
