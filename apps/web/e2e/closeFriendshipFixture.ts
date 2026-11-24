import type { BrowserContext } from "@playwright/test";
import type { Server } from "node:http";

type Params = {
  contexts: Pick<BrowserContext, "close">[];
  server: Server | undefined;
  database: { close(): Promise<void> };
  errors: unknown[];
};

export async function closeFriendshipFixture({ contexts, server, database, errors }: Params) {
  async function attempt(operation: () => unknown) {
    try {
      await operation();
    } catch (error) {
      errors.push(error);
    }
  }
  for (const context of contexts) await attempt(() => context.close());
  if (server)
    await attempt(
      () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    );
  await attempt(() => database.close());
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1)
    throw new AggregateError(errors, "Friendship fixture and cleanup failed", { cause: errors[0] });
}
