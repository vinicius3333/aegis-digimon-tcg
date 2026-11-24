import {
  BugForumState,
  type BugForumComment,
  type BugForumDetail,
  type BugForumFailure,
  type BugForumItem,
  type BugForumPage,
  type BugForumSummary,
  type BugForumTally,
  type BugForumVote,
} from "@aegis/shared/feedback/BugForum";
import { BugVerdict } from "@aegis/shared/feedback/BugVerdict";
import { CLOSED_FEEDBACK_STATUSES, type FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import type { AccountStore } from "#api/accounts/AccountStore";

const PAGE_SIZE = 30;
const CLOSED_LIST = CLOSED_FEEDBACK_STATUSES.map((status) => `'${status}'`).join(", ");
const IS_BUG = "report->>'kind' = 'bug'";
const IS_OPEN = `${IS_BUG} AND status NOT IN (${CLOSED_LIST})`;
const IS_DECIDED = `${IS_BUG} AND vote_payout IS NOT NULL`;
const BUG_COLUMNS =
  "id, report->>'summary' AS summary, report->>'description' AS description, report->'cardIds' AS card_ids, status, created_at, reporter_account_id, vote_payout";

type BugRow = {
  id: number;
  summary: string;
  description: string;
  card_ids: string[] | string | null;
  status: FeedbackStatus;
  created_at: string;
  reporter_account_id: string | null;
  vote_payout: BugVerdict | null;
};

type Refusal = { error: BugForumFailure };

export class BugForumStore {
  constructor(private readonly accounts: AccountStore) {}

  async summary(accountId: string | undefined): Promise<BugForumSummary> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM feedback_reports WHERE ${IS_OPEN}`,
    );
    const open = Number(rows[0]?.count ?? 0);
    if (!accountId) return { open, awaitingVote: null, aegisCoins: null };
    const { rows: awaiting } = await this.accounts.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM feedback_reports f
       LEFT JOIN feedback_bug_votes v ON v.feedback_id = f.id AND v.account_id = $1
       WHERE ${IS_OPEN} AND v.feedback_id IS NULL AND (f.reporter_account_id IS NULL OR f.reporter_account_id <> $1)`,
      [accountId],
    );
    const { rows: coins } = await this.accounts.pool.query<{ aegis_coins: number }>(
      "SELECT aegis_coins FROM accounts WHERE id=$1",
      [accountId],
    );
    return { open, awaitingVote: Number(awaiting[0]?.count ?? 0), aegisCoins: coins[0]?.aegis_coins ?? 0 };
  }

  async list(accountId: string, state: BugForumState, before?: number): Promise<BugForumPage> {
    await this.accounts.ensureReady();
    const scope = state === BugForumState.OPEN.value ? IS_OPEN : IS_DECIDED;
    const { rows } = await this.accounts.pool.query<BugRow>(
      `SELECT ${BUG_COLUMNS} FROM feedback_reports
       WHERE ${scope} ${before === undefined ? "" : "AND id < $1"}
       ORDER BY id DESC LIMIT ${PAGE_SIZE + 1}`,
      before === undefined ? [] : [before],
    );
    const items = await this.decorate(rows.slice(0, PAGE_SIZE), accountId);
    return { items, nextBefore: rows.length > PAGE_SIZE ? items.at(-1)!.id : null };
  }

  async detail(accountId: string, id: number, revealVotes = false): Promise<BugForumDetail | undefined> {
    const row = await this.read(id);
    if (!row) return undefined;
    const [item] = await this.decorate([row], accountId);
    const { rows: comments } = await this.accounts.pool.query<{
      id: number;
      body: string;
      created_at: string;
      display_name: string | null;
    }>(
      `SELECT c.id, c.body, c.created_at, a.display_name
       FROM feedback_bug_comments c LEFT JOIN accounts a ON a.id = c.account_id
       WHERE c.feedback_id=$1 ORDER BY c.id`,
      [id],
    );
    return {
      ...item!,
      comments: comments.map((comment): BugForumComment => ({
        id: comment.id,
        authorName: comment.display_name,
        body: comment.body,
        createdAt: Number(comment.created_at),
      })),
      tally: revealVotes || isClosedFeedbackStatus(row.status) ? await this.tally(id) : null,
    };
  }

  async vote(accountId: string, id: number, vote: BugForumVote, at = Date.now()): Promise<BugForumDetail | Refusal> {
    const refusal = await this.refuseUnlessOpen(id, accountId, { forbidReporter: true });
    if (refusal) return refusal;
    await this.accounts.pool.query(
      `INSERT INTO feedback_bug_votes (feedback_id, account_id, verdict, reason, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$5)
       ON CONFLICT (feedback_id, account_id) DO UPDATE SET verdict=EXCLUDED.verdict, reason=EXCLUDED.reason, updated_at=EXCLUDED.updated_at`,
      [id, accountId, vote.verdict, vote.reason, at],
    );
    return (await this.detail(accountId, id))!;
  }

  async retract(accountId: string, id: number): Promise<BugForumDetail | Refusal> {
    const refusal = await this.refuseUnlessOpen(id, accountId, { forbidReporter: false });
    if (refusal) return refusal;
    await this.accounts.pool.query("DELETE FROM feedback_bug_votes WHERE feedback_id=$1 AND account_id=$2", [
      id,
      accountId,
    ]);
    return (await this.detail(accountId, id))!;
  }

  async comment(accountId: string, id: number, body: string, at = Date.now()): Promise<BugForumDetail | Refusal> {
    const refusal = await this.refuseUnlessOpen(id, accountId, { forbidReporter: false });
    if (refusal) return refusal;
    await this.accounts.pool.query(
      "INSERT INTO feedback_bug_comments (feedback_id, account_id, body, created_at) VALUES ($1,$2,$3,$4)",
      [id, accountId, body, at],
    );
    return (await this.detail(accountId, id))!;
  }

  private async read(id: number): Promise<BugRow | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<BugRow>(
      `SELECT ${BUG_COLUMNS} FROM feedback_reports WHERE id=$1 AND ${IS_BUG}`,
      [id],
    );
    return rows[0];
  }

  private async refuseUnlessOpen(
    id: number,
    accountId: string,
    { forbidReporter }: { forbidReporter: boolean },
  ): Promise<Refusal | undefined> {
    const row = await this.read(id);
    if (!row) return { error: "not_found" };
    if (isClosedFeedbackStatus(row.status)) return { error: "closed" };
    if (forbidReporter && row.reporter_account_id === accountId) return { error: "own_report" };
    return undefined;
  }

  private async tally(id: number): Promise<BugForumTally> {
    const { rows } = await this.accounts.pool.query<{
      verdict: BugVerdict;
      reason: string;
      display_name: string | null;
    }>(
      `SELECT v.verdict, v.reason, a.display_name
       FROM feedback_bug_votes v LEFT JOIN accounts a ON a.id = v.account_id
       WHERE v.feedback_id=$1 ORDER BY v.created_at`,
      [id],
    );
    return {
      bug: rows.filter((row) => row.verdict === BugVerdict.BUG.value).length,
      notBug: rows.filter((row) => row.verdict === BugVerdict.NOT_BUG.value).length,
      ballots: rows.map((row) => ({ verdict: row.verdict, reason: row.reason, authorName: row.display_name })),
    };
  }

  private async decorate(rows: readonly BugRow[], accountId: string): Promise<BugForumItem[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map((_, index) => `$${index + 2}`).join(",");
    const { rows: votes } = await this.accounts.pool.query<{
      feedback_id: number;
      verdict: BugVerdict;
      reason: string;
    }>(
      `SELECT feedback_id, verdict, reason FROM feedback_bug_votes WHERE account_id=$1 AND feedback_id IN (${placeholders})`,
      [accountId, ...ids],
    );
    const { rows: counts } = await this.accounts.pool.query<{ feedback_id: number; count: string }>(
      `SELECT feedback_id, count(*) AS count FROM feedback_bug_comments
       WHERE feedback_id IN (${ids.map((_, index) => `$${index + 1}`).join(",")}) GROUP BY feedback_id`,
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
      };
    });
  }
}

function cardIds(value: BugRow["card_ids"]): string[] {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.filter((cardId): cardId is string => typeof cardId === "string") : [];
}
