import { startSocialOwnedBrowserServer } from "../../api/test-support/startSocialOwnedBrowserServer.js";

export async function startSocialBrowserServer() {
  return startSocialOwnedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
}
