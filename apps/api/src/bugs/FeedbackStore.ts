import type { AccountStore } from "../accounts/AccountStore.js";
import type { FiledBugReport, NewBugReport } from "./GitHubIssueTracker.js";

export type FeedbackRecord = {
  id: number;
  report: NewBugReport & { serverRevision?: string; publicVersion?: string };
  createdAt: number;
  githubStatus: "pending" | "sent" | "failed" | "disabled";
  githubNumber: number | null;
  githubUrl: string | null;
};

export class FeedbackStore {
  constructor(private readonly accounts: AccountStore) {}

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
    const { rows } = await this.accounts.pool.query<{
      id: number;
      report: FeedbackRecord["report"];
      created_at: string;
      github_status: FeedbackRecord["githubStatus"];
      github_number: number | null;
      github_url: string | null;
    }>(
      `SELECT id, report, created_at, github_status, github_number, github_url
       FROM feedback_reports ${before === undefined ? "" : "WHERE id < $1"}
       ORDER BY id DESC LIMIT 51`,
      before === undefined ? [] : [before],
    );
    const items = rows.slice(0, 50).map((row) => ({
      id: row.id,
      report: row.report,
      createdAt: Number(row.created_at),
      githubStatus: row.github_status,
      githubNumber: row.github_number,
      githubUrl: row.github_url,
    }));
    return { items, nextBefore: rows.length > 50 ? items.at(-1)!.id : null };
  }
}
