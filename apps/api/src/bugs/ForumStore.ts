import {
  FORUM_PAGE_SIZE,
  ForumState,
  type ForumComment,
  type ForumDetail,
  type ForumFailure,
  type ForumItem,
  type ForumPage,
  type ForumSummary,
  type ForumTally,
  type ForumVote,
} from "@aegis/shared/feedback/Forum";
import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { ForumVerdict } from "@aegis/shared/feedback/ForumVerdict";
import { CLOSED_FEEDBACK_STATUSES, type FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { getForumBoardKind } from "@aegis/shared/feedback/getForumBoardKind";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import type { PoolClient } from "pg";
import type { AccountStore } from "#api/accounts/AccountStore";

const CLOSED_LIST = CLOSED_FEEDBACK_STATUSES.map((status) => `'${status}'`).join(", ");
const COLUMNS =
  "f.id, f.report->>'summary' AS summary, f.report->>'description' AS description, f.report->'cardIds' AS card_ids, f.status, f.created_at, f.reporter_account_id, f.vote_payout, r.input_count, u.upvotes";
const FROM = `feedback_reports f
  LEFT JOIN feedback_report_replays r ON r.report_id = f.id
  LEFT JOIN (SELECT feedback_id, count(*) AS upvotes FROM feedback_votes WHERE verdict = 'yes' GROUP BY feedback_id) u ON u.feedback_id = f.id`;

type Row = {
  id: number;
  summary: string;
  description: string;
  card_ids: string[] | string | null;
  status: FeedbackStatus;
  created_at: string;
  reporter_account_id: string | null;
  vote_payout: ForumVerdict | null;
  input_count: number | null;
  upvotes: string | null;
};

type Refusal = { error: ForumFailure };
type LockedReport = { status: FeedbackStatus; reporter_account_id: string | null; vote_payout: ForumVerdict | null };
type Viewer = { accountId: string; isAdmin: boolean };

export class ForumStore {
  private readonly ofBoard: string;
  private readonly open: string;
  private readonly decided: string;
  private readonly upvoteOnly: boolean;

  constructor(
    private readonly accounts: AccountStore,
    board: ForumBoard,
  ) {
    this.ofBoard = `f.report->>'kind' = '${getForumBoardKind(board)}'`;
    this.open = `${this.ofBoard} AND f.status NOT IN (${CLOSED_LIST})`;
    this.upvoteOnly = board === ForumBoard.IDEAS.value;
    this.decided = `${this.ofBoard} AND f.status IN (${CLOSED_LIST})`;
  }

  async summary(accountId: string | undefined): Promise<ForumSummary> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM feedback_reports f WHERE ${this.open}`,
    );
    const open = Number(rows[0]?.count ?? 0);
    if (!accountId) return { open, awaitingVote: null, aegisCoins: null };
    const { rows: awaiting } = await this.accounts.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM feedback_reports f
       LEFT JOIN feedback_votes v ON v.feedback_id = f.id AND v.account_id = $1
       WHERE ${this.open} AND v.feedback_id IS NULL AND (f.reporter_account_id IS NULL OR f.reporter_account_id <> $1)`,
      [accountId],
    );
    const { rows: coins } = await this.accounts.pool.query<{ aegis_coins: number }>(
      "SELECT aegis_coins FROM accounts WHERE id=$1",
      [accountId],
    );
    return { open, awaitingVote: Number(awaiting[0]?.count ?? 0), aegisCoins: coins[0]?.aegis_coins ?? 0 };
  }

  async list(accountId: string, state: ForumState, page: number): Promise<ForumPage> {
    await this.accounts.ensureReady();
    const scope = state === ForumState.OPEN.value ? this.open : this.decided;
    const { rows: totals } = await this.accounts.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM feedback_reports f WHERE ${scope}`,
    );
    const { rows } = await this.accounts.pool.query<Row>(
      `SELECT ${COLUMNS} FROM ${FROM} WHERE ${scope}
       ORDER BY ${this.upvoteOnly && state === ForumState.OPEN.value ? "COALESCE(u.upvotes, 0) DESC, " : ""}f.id DESC LIMIT ${FORUM_PAGE_SIZE} OFFSET ${(page - 1) * FORUM_PAGE_SIZE}`,
    );
    return {
      items: await this.decorate(rows, accountId),
      page,
      pageSize: FORUM_PAGE_SIZE,
      total: Number(totals[0]?.count ?? 0),
    };
  }

  async detail(viewer: Viewer, id: number): Promise<ForumDetail | undefined> {
    const row = await this.read(id);
    if (!row) return undefined;
    const [item] = await this.decorate([row], viewer.accountId);
    const { rows: comments } = await this.accounts.pool.query<{
      id: number;
      body: string;
      created_at: string;
      display_name: string | null;
    }>(
      `SELECT c.id, c.body, c.created_at, a.display_name
       FROM feedback_comments c LEFT JOIN accounts a ON a.id = c.account_id
       WHERE c.feedback_id=$1 ORDER BY c.id`,
      [id],
    );
    return {
      ...item!,
      comments: comments.map((comment): ForumComment => ({
        id: comment.id,
        authorName: comment.display_name,
        body: comment.body,
        createdAt: Number(comment.created_at),
      })),
      tally:
        !this.upvoteOnly && (viewer.isAdmin || isClosedFeedbackStatus(row.status))
          ? await this.tally(id, viewer.isAdmin)
          : null,
      canModerate: viewer.isAdmin,
    };
  }

  async exists(id: number): Promise<boolean> {
    return (await this.read(id)) !== undefined;
  }

  async vote(viewer: Viewer, id: number, vote: ForumVote, at = Date.now()): Promise<ForumDetail | Refusal> {
    const refusal = await this.whileOpen(id, viewer.accountId, { forbidReporter: !this.upvoteOnly }, (client) =>
      client.query(
        `INSERT INTO feedback_votes (feedback_id, account_id, verdict, reason, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$5)
         ON CONFLICT (feedback_id, account_id) DO UPDATE SET verdict=EXCLUDED.verdict, reason=EXCLUDED.reason, updated_at=EXCLUDED.updated_at`,
        [id, viewer.accountId, vote.verdict, vote.reason, at],
      ),
    );
    return refusal ?? (await this.detail(viewer, id))!;
  }

  async retract(viewer: Viewer, id: number): Promise<ForumDetail | Refusal> {
    const refusal = await this.whileOpen(id, viewer.accountId, { forbidReporter: false }, (client) =>
      client.query("DELETE FROM feedback_votes WHERE feedback_id=$1 AND account_id=$2", [id, viewer.accountId]),
    );
    return refusal ?? (await this.detail(viewer, id))!;
  }

  async comment(viewer: Viewer, id: number, body: string, at = Date.now()): Promise<ForumDetail | Refusal> {
    const refusal = await this.whileOpen(id, viewer.accountId, { forbidReporter: false }, (client) =>
      client.query("INSERT INTO feedback_comments (feedback_id, account_id, body, created_at) VALUES ($1,$2,$3,$4)", [
        id,
        viewer.accountId,
        body,
        at,
      ]),
    );
    return refusal ?? (await this.detail(viewer, id))!;
  }

  async removeComment(viewer: Viewer, id: number, commentId: number): Promise<ForumDetail | Refusal> {
    if (!(await this.exists(id))) return { error: "not_found" };
    await this.accounts.pool.query("DELETE FROM feedback_comments WHERE id=$1 AND feedback_id=$2", [commentId, id]);
    return (await this.detail(viewer, id))!;
  }

  async removeVote(viewer: Viewer, id: number, voterId: string): Promise<ForumDetail | Refusal> {
    const refusal = await this.withReportLock(id, "UPDATE", async (client, report) => {
      const { rows } = await client.query<{ verdict: ForumVerdict }>(
        "DELETE FROM feedback_votes WHERE feedback_id=$1 AND account_id=$2 RETURNING verdict",
        [id, voterId],
      );
      if (rows[0] && rows[0].verdict === report.vote_payout) {
        await client.query("UPDATE accounts SET aegis_coins = GREATEST(0, aegis_coins - 1) WHERE id=$1", [voterId]);
      }
      return undefined;
    });
    return refusal ?? (await this.detail(viewer, id))!;
  }

  private async read(id: number): Promise<Row | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<Row>(
      `SELECT ${COLUMNS} FROM ${FROM} WHERE f.id=$1 AND ${this.ofBoard}`,
      [id],
    );
    return rows[0];
  }

  private whileOpen(
    id: number,
    accountId: string,
    { forbidReporter }: { forbidReporter: boolean },
    write: (client: PoolClient) => Promise<unknown>,
  ): Promise<Refusal | undefined> {
    return this.withReportLock(id, "SHARE", async (client, report) => {
      if (isClosedFeedbackStatus(report.status)) return { error: "closed" };
      if (forbidReporter && report.reporter_account_id === accountId) return { error: "own_report" };
      await write(client);
      return undefined;
    });
  }

  private async withReportLock(
    id: number,
    mode: "SHARE" | "UPDATE",
    work: (client: PoolClient, report: LockedReport) => Promise<Refusal | undefined>,
  ): Promise<Refusal | undefined> {
    await this.accounts.ensureReady();
    const client = await this.accounts.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<LockedReport>(
        `SELECT f.status, f.reporter_account_id, f.vote_payout FROM feedback_reports f WHERE f.id=$1 AND ${this.ofBoard} FOR ${mode}`,
        [id],
      );
      const result = rows[0] ? await work(client, rows[0]) : { error: "not_found" as const };
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async tally(id: number, withVoterIds: boolean): Promise<ForumTally> {
    const { rows } = await this.accounts.pool.query<{
      account_id: string;
      verdict: ForumVerdict;
      reason: string;
      display_name: string | null;
    }>(
      `SELECT v.account_id, v.verdict, v.reason, a.display_name
       FROM feedback_votes v LEFT JOIN accounts a ON a.id = v.account_id
       WHERE v.feedback_id=$1 ORDER BY v.created_at`,
      [id],
    );
    return {
      yes: rows.filter((row) => row.verdict === ForumVerdict.YES.value).length,
      no: rows.filter((row) => row.verdict === ForumVerdict.NO.value).length,
      ballots: rows.map((row) => ({
        verdict: row.verdict,
        reason: row.reason,
        authorName: row.display_name,
        ...(withVoterIds ? { voterId: row.account_id } : {}),
      })),
    };
  }

  private async decorate(rows: readonly Row[], accountId: string): Promise<ForumItem[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const placeholders = (offset: number) => ids.map((_, index) => `$${index + offset}`).join(",");
    const { rows: votes } = await this.accounts.pool.query<{
      feedback_id: number;
      verdict: ForumVerdict;
      reason: string;
    }>(
      `SELECT feedback_id, verdict, reason FROM feedback_votes WHERE account_id=$1 AND feedback_id IN (${placeholders(2)})`,
      [accountId, ...ids],
    );
    const { rows: counts } = await this.accounts.pool.query<{ feedback_id: number; count: string }>(
      `SELECT feedback_id, count(*) AS count FROM feedback_comments
       WHERE feedback_id IN (${placeholders(1)}) GROUP BY feedback_id`,
      ids,
    );
    return rows.map((row) => {
      const vote = votes.find((entry) => entry.feedback_id === row.id);
      return {
        id: row.id,
        summary: row.summary,
        description: row.description,
        cardIds: cardIds(row.card_ids),
        status: row.status,
        createdAt: Number(row.created_at),
        commentCount: Number(counts.find((count) => count.feedback_id === row.id)?.count ?? 0),
        outcome: row.vote_payout,
        myVote: vote ? { verdict: vote.verdict, reason: vote.reason } : null,
        ownReport: row.reporter_account_id === accountId,
        hasReplay: row.input_count !== null,
        upvotes: this.upvoteOnly ? Number(row.upvotes ?? 0) : null,
      };
    });
  }
}

function cardIds(value: Row["card_ids"]): string[] {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.filter((cardId): cardId is string => typeof cardId === "string") : [];
}
