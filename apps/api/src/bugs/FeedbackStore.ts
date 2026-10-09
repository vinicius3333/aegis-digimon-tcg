import type { AccountStore } from "../accounts/AccountStore.js";
import type { ReplayRecord } from "../replay/types.js";
import type { FiledBugReport, NewBugReport } from "./GitHubIssueTracker.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REPLAY_RETENTION_DAYS = 30;

/** `AEGIS_REPLAY_RETENTION_DAYS`, or 30 days when it is unset or not a positive number. */
export function replayRetentionMs(env: NodeJS.ProcessEnv = process.env): number {
  const days = Number(env.AEGIS_REPLAY_RETENTION_DAYS);
  return (Number.isFinite(days) && days > 0 ? days : DEFAULT_REPLAY_RETENTION_DAYS) * DAY_MS;
}

export type FeedbackRecord = {
  id: number;
  report: NewBugReport & { serverRevision?: string; publicVersion?: string };
  createdAt: number;
  githubStatus: "pending" | "sent" | "failed" | "disabled";
  githubNumber: number | null;
  githubUrl: string | null;
  /** Whether a private replay of the reported match is stored with the report. */
  hasReplay: boolean;
  replayInputs: number | null;
};

export type FeedbackStoreOptions = {
  /** How long a saved replay is kept; defaults to {@link replayRetentionMs}. */
  replayRetentionMs?: number;
  now?: () => number;
};

export class FeedbackStore {
  private readonly replayRetentionMs: number;
  private readonly now: () => number;

  constructor(
    private readonly accounts: AccountStore,
    options: FeedbackStoreOptions = {},
  ) {
    this.replayRetentionMs = options.replayRetentionMs ?? replayRetentionMs();
    this.now = options.now ?? Date.now;
  }

  async save(report: NewBugReport, accountId: string | undefined, mirror: boolean): Promise<number> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ id: number }>(
      "INSERT INTO feedback_reports (reporter_account_id, report, created_at, github_status) VALUES ($1,$2,$3,$4) RETURNING id",
      [
        accountId ?? null,
        JSON.stringify({
          ...report,
          serverRevision: process.env.AEGIS_REVISION,
          publicVersion: process.env.AEGIS_PUBLIC_VERSION,
        }),
        Date.now(),
        mirror ? "pending" : "disabled",
      ],
    );
    return rows[0]!.id;
  }

  async recordMirror(id: number, issue?: FiledBugReport): Promise<void> {
    await this.accounts.pool.query(
      "UPDATE feedback_reports SET github_status=$1, github_number=$2, github_url=$3 WHERE id=$4",
      [issue ? "sent" : "failed", issue?.number ?? null, issue?.url ?? null, id],
    );
  }

  async list(before?: number): Promise<{ items: FeedbackRecord[]; nextBefore: number | null }> {
    await this.accounts.ensureReady();
    // An expired replay must not be listed as available; downloading it would 404.
    await this.pruneReplays();
    const { rows } = await this.accounts.pool.query<{
      id: number;
      report: FeedbackRecord["report"];
      created_at: string;
      github_status: FeedbackRecord["githubStatus"];
      github_number: number | null;
      github_url: string | null;
      input_count: number | null;
    }>(
      `SELECT f.id, f.report, f.created_at, f.github_status, f.github_number, f.github_url, r.input_count
       FROM feedback_reports f LEFT JOIN feedback_report_replays r ON r.report_id = f.id
       ${before === undefined ? "" : "WHERE f.id < $1"}
       ORDER BY f.id DESC LIMIT 51`,
      before === undefined ? [] : [before],
    );
    const items = rows.slice(0, 50).map((row) => ({
      id: row.id,
      report: row.report,
      createdAt: Number(row.created_at),
      githubStatus: row.github_status,
      githubNumber: row.github_number,
      githubUrl: row.github_url,
      hasReplay: row.input_count !== null,
      replayInputs: row.input_count,
    }));
    return { items, nextBefore: rows.length > 50 ? items.at(-1)!.id : null };
  }

  /**
   * Keeps the replay of the reported match with the report. Expired replays are pruned here, at
   * save time: captures only happen for accepted, rate-limited reports, so this runs rarely and
   * needs no timer of its own.
   */
  async saveReplay(reportId: number, record: ReplayRecord): Promise<void> {
    await this.accounts.pool.query(
      "INSERT INTO feedback_report_replays (report_id, record, input_count, created_at) VALUES ($1,$2,$3,$4)",
      [reportId, JSON.stringify(record), record.inputs.length, this.now()],
    );
    await this.pruneReplays();
  }

  /** The stored replay of a report, or undefined when it has none (or it has expired). */
  async replay(reportId: number): Promise<ReplayRecord | undefined> {
    await this.accounts.ensureReady();
    await this.pruneReplays();
    const { rows } = await this.accounts.pool.query<{ record: ReplayRecord | string }>(
      "SELECT record FROM feedback_report_replays WHERE report_id=$1",
      [reportId],
    );
    const record = rows[0]?.record;
    return typeof record === "string" ? (JSON.parse(record) as ReplayRecord) : record;
  }

  /** Deletes replays older than the retention window; returns how many went. */
  async pruneReplays(): Promise<number> {
    const { rowCount } = await this.accounts.pool.query("DELETE FROM feedback_report_replays WHERE created_at < $1", [
      this.now() - this.replayRetentionMs,
    ]);
    return rowCount ?? 0;
  }
}
