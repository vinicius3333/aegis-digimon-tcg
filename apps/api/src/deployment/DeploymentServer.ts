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

  override async listen(
    port: number | string,
    hostname?: string,
    backlog?: number,
    listeningListener?: Function,
  ): Promise<unknown> {
    // Colyseus binds its matchmaking route inside the transport's listen callback, right
    // before it calls `listeningListener`, so the gate is in front of it before any request.
    return super.listen(port, hostname, backlog, (error?: Error) => {
      if (!error) this.gateMatchmaking();
      listeningListener?.(error);
    });
  }

  private gateMatchmaking(): void {
    const server = this.transport.server;
    if (!server) return;
    const listeners = server.listeners("request") as ((request: IncomingMessage, response: ServerResponse) => void)[];
    server.removeAllListeners("request");
    server.on("request", (request: IncomingMessage, response: ServerResponse) => {
      if (this.rejectWhileDraining(request, response)) return;
      for (const listener of listeners) listener.call(server, request, response);
    });
  }

  private rejectWhileDraining(request: IncomingMessage, response: ServerResponse): boolean {
    const method = matchmakingMethod(request.url);
    if (request.method !== "POST" || !method || this.deploymentRuntime.allowMatchmaking(method)) return false;
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
    return true;
  }
}

function matchmakingMethod(requestUrl: string | undefined): string | undefined {
  const pathname = new URL(requestUrl ?? "/", "http://localhost").pathname;
  const segments = pathname.split("/").filter(Boolean);
  const matchmakeIndex = segments.indexOf("matchmake");
  return matchmakeIndex === -1 ? undefined : segments[matchmakeIndex + 1];
}
