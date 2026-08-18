import type { IncomingMessage, ServerResponse } from "node:http";
import { Server, type ServerOptions } from "colyseus";
import type { DeploymentRuntime } from "./runtime.js";

/**
 * Colyseus installs matchmaking directly on the raw HTTP server and deliberately
 * bypasses pre-existing Express listeners. The deployment gate therefore belongs
 * at this framework seam rather than only in Express middleware.
 */
export class DeploymentServer extends Server {
  constructor(
    private readonly deploymentRuntime: DeploymentRuntime,
    options: ServerOptions,
  ) {
    super(options);
  }

  protected override async handleMatchMakeRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const method = matchmakingMethod(request.url);
    if (request.method === "POST" && method && !this.deploymentRuntime.allowMatchmaking(method)) {
      response.writeHead(503, {
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": request.headers.origin ?? "*",
        "Content-Type": "application/json",
      });
      response.end(JSON.stringify({
        code: "AEGIS_DEPLOYMENT_DRAINING",
        error: "This game server is draining; retry on the active slot.",
      }));
      return;
    }
    await super.handleMatchMakeRequest(request, response);
  }
}

function matchmakingMethod(requestUrl: string | undefined): string | undefined {
  const pathname = new URL(requestUrl ?? "/", "http://localhost").pathname;
  const segments = pathname.split("/").filter(Boolean);
  const matchmakeIndex = segments.indexOf("matchmake");
  return matchmakeIndex === -1 ? undefined : segments[matchmakeIndex + 1];
}
