import { createServer, connect, type Server, type Socket } from "node:net";

/** TCP stand-in for the production Caddy. `stop()` cuts every connection like a restart. */
export class Edge {
  private server: Server | undefined;
  private readonly sockets = new Set<Socket>();

  constructor(
    readonly port: number,
    private readonly targetPort: number,
  ) {}

  async start(): Promise<void> {
    if (this.server) return;
    const server = createServer((client) => {
      const upstream = connect(this.targetPort, "127.0.0.1");
      for (const socket of [client, upstream]) {
        this.sockets.add(socket);
        socket.on("close", () => this.sockets.delete(socket));
        socket.on("error", () => {
          client.destroy();
          upstream.destroy();
        });
      }
      client.pipe(upstream).pipe(client);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.port, "127.0.0.1", resolve);
    });
    this.server = server;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = undefined;
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    await closed;
  }
}
