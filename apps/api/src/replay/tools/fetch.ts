import type { ReplayRecord } from "../types.js";
import { asReplayRecord, ReplayRecordError } from "./records.js";

/** The one `pg` method `fetch` uses, so a test can pass an in-memory pool. */
export interface Queryable {
  query(text: string, values: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface FetchedReplay {
  record: ReplayRecord;
  /** A note for the user when the stored row disagrees with itself. */
  warning?: string;
}

/**
 * Read the replay saved with bug report `reportId` from `feedback_report_replays`.
 *
 * Read-only: it runs no migrations, so pointing it at production cannot change the schema. Rows
 * saved before `notBefore` (the retention window) are treated as gone, as the API treats them.
 */
export async function fetchReplayFromDb(db: Queryable, reportId: number, notBefore = 0): Promise<FetchedReplay> {
  const { rows } = await db.query(
    "SELECT record, input_count FROM feedback_report_replays WHERE report_id = $1 AND created_at >= $2",
    [reportId, notBefore],
  );
  const row = rows[0];
  if (!row) throw new ReplayRecordError(`No replay is saved with report #${reportId}.`);
  // `pg` parses jsonb; a driver or proxy that hands back text is parsed here.
  const raw = typeof row.record === "string" ? (JSON.parse(row.record) as unknown) : row.record;
  const record = asReplayRecord(raw, `The replay of report #${reportId}`);
  const stored = Number(row.input_count);
  return {
    record,
    ...(Number.isFinite(stored) && stored !== record.inputs.length
      ? { warning: `report #${reportId} lists ${stored} inputs but its record has ${record.inputs.length}` }
      : {}),
  };
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}>;

/** The admin endpoint's cookie name (`SESSION_COOKIE` in `accounts/routes.ts`). */
export const SESSION_COOKIE = "aegis_session";

/** Read the replay through the API's admin endpoint `GET /account/feedback/:id/replay`. */
export async function fetchReplayFromApi(
  baseUrl: string,
  session: string | undefined,
  reportId: number,
  fetchImpl: FetchLike = fetch,
): Promise<FetchedReplay> {
  if (!session)
    throw new ReplayRecordError(
      `--url needs an admin session: set AEGIS_SESSION to the value of your ${SESSION_COOKIE} cookie.`,
    );
  const url = `${baseUrl.replace(/\/+$/, "")}/account/feedback/${reportId}/replay`;
  const response = await fetchImpl(url, { headers: { cookie: `${SESSION_COOKIE}=${session}` } });
  if (!response.ok) {
    const hint =
      response.status === 404
        ? "no replay is saved with that report"
        : response.status === 401 || response.status === 403
          ? "the session is missing, expired or not an admin's"
          : response.statusText;
    throw new ReplayRecordError(`GET ${url} answered ${response.status}: ${hint}.`);
  }
  return { record: asReplayRecord(await response.json(), `The replay of report #${reportId}`) };
}

/** Whether the environment configures a database the way the API reads it (`AccountStore`). */
export function hasDatabaseConfig(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.DATABASE_URL || env.PGHOST || env.PGDATABASE || env.PGSERVICE);
}
