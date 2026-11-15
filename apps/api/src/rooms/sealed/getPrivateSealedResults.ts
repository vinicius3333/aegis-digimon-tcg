import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AccountStore } from "#api/accounts/AccountStore";
import { logDirectory } from "#api/logger";
import { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";
type Params = { accounts: AccountStore };
const services = new WeakMap<AccountStore, PrivateSealedResults>();
export function getPrivateSealedResults({ accounts }: Params): PrivateSealedResults {
  const current = services.get(accounts);
  if (current) {
    return current;
  }
  const testing = process.env.VITEST !== undefined || process.env.NODE_ENV === "test";
  const directory = testing
    ? mkdtempSync(join(tmpdir(), "aegis-private-sealed-results-"))
    : (process.env.AEGIS_PRIVATE_SEALED_RESULT_DIR ?? join(logDirectory, "private-sealed-results"));
  const service = new PrivateSealedResults({ accounts, directory });
  services.set(accounts, service);
  return service;
}
