import { CLOSED_FEEDBACK_STATUSES, type FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import type {
  BugVolunteerFailure,
  BugVolunteerNote,
  OpenBug,
  OpenBugDetail,
  OpenBugPage,
} from "@aegis/shared/feedback/OpenBug";
import type { AccountStore } from "#api/accounts/AccountStore";

const PAGE_SIZE = 30;
const CLOSED_LIST = CLOSED_FEEDBACK_STATUSES.map((status) => `'${status}'`).join(", ");
const BUG_COLUMNS =
  "id, report->>'summary' AS summary, report->>'description' AS description, report->'cardIds' AS card_ids, status, created_at";

type BugRow = {
  id: number;
  summary: string;
  description: string;
  card_ids: string[] | string | null;
  status: FeedbackStatus;
  created_at: string;
};

type BugState = { id: number; status: FeedbackStatus };

export class BugVolunteerStore {
  constructor(private readonly accounts: AccountStore) {}

  async listOpen(accountId: string, before?: number): Promise<OpenBugPage> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<BugRow>(
      `SELECT ${BUG_COLUMNS} FROM feedback_reports
       WHERE report->>'kind' = 'bug' AND status NOT IN (${CLOSED_LIST}) ${before === undefined ? "" : "AND id < $1"}
       ORDER BY id DESC LIMIT ${PAGE_SIZE + 1}`,
      before === undefined ? [] : [before],
    );
    const page = rows.slice(0, PAGE_SIZE);
    const items = await this.decorate(page, accountId);
    return { items, nextBefore: rows.length > PAGE_SIZE ? items.at(-1)!.id : null };
  }

  async detail(accountId: string, id: number): Promise<OpenBugDetail | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<BugRow>(
      `SELECT ${BUG_COLUMNS} FROM feedback_reports WHERE id=$1 AND report->>'kind' = 'bug'`,
      [id],
    );
    if (!rows[0]) return undefined;
    const [bug] = await this.decorate(rows, accountId);
    const { rows: notes } = await this.accounts.pool.query<{
      id: number;
      body: string;
      created_at: string;
      display_name: string | null;
    }>(
      `SELECT n.id, n.body, n.created_at, a.display_name
       FROM feedback_investigation_notes n LEFT JOIN accounts a ON a.id = n.account_id
       WHERE n.feedback_id=$1 ORDER BY n.id`,
      [id],
    );
    return {
      ...bug!,
      notes: notes.map((note): BugVolunteerNote => ({
        id: note.id,
        authorName: note.display_name,
        body: note.body,
        createdAt: Number(note.created_at),
      })),
    };
  }

  async claim(accountId: string, id: number, at = Date.now()): Promise<OpenBugDetail | { error: BugVolunteerFailure }> {
    const refusal = await this.refuseUnlessOpen(id);
    if (refusal) return refusal;
    await this.accounts.pool.query(
      "INSERT INTO feedback_investigators (feedback_id, account_id, created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [id, accountId, at],
    );
    return (await this.detail(accountId, id))!;
  }

  async release(accountId: string, id: number): Promise<OpenBugDetail | { error: BugVolunteerFailure }> {
    await this.accounts.ensureReady();
    await this.accounts.pool.query("DELETE FROM feedback_investigators WHERE feedback_id=$1 AND account_id=$2", [
      id,
      accountId,
    ]);
    return (await this.detail(accountId, id)) ?? { error: "not_found" };
  }

  async addNote(
    accountId: string,
    id: number,
    body: string,
    at = Date.now(),
  ): Promise<OpenBugDetail | { error: BugVolunteerFailure }> {
    const refusal = await this.refuseUnlessOpen(id);
    if (refusal) return refusal;
    await this.accounts.pool.query(
      "INSERT INTO feedback_investigation_notes (feedback_id, account_id, body, created_at) VALUES ($1,$2,$3,$4)",
      [id, accountId, body, at],
    );
    await this.accounts.pool.query(
      "INSERT INTO feedback_investigators (feedback_id, account_id, created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [id, accountId, at],
    );
    return (await this.detail(accountId, id))!;
  }

  private async refuseUnlessOpen(id: number): Promise<{ error: BugVolunteerFailure } | undefined> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<BugState>(
      "SELECT id, status FROM feedback_reports WHERE id=$1 AND report->>'kind' = 'bug'",
      [id],
    );
    if (!rows[0]) return { error: "not_found" };
    if ((CLOSED_FEEDBACK_STATUSES as readonly string[]).includes(rows[0].status)) return { error: "closed" };
    return undefined;
  }

  private async decorate(rows: readonly BugRow[], accountId: string): Promise<OpenBug[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
    const { rows: investigators } = await this.accounts.pool.query<{
      feedback_id: number;
      account_id: string;
      display_name: string;
    }>(
      `SELECT i.feedback_id, i.account_id, a.display_name
       FROM feedback_investigators i JOIN accounts a ON a.id = i.account_id
       WHERE i.feedback_id IN (${placeholders}) ORDER BY i.created_at, a.display_name`,
      ids,
    );
    const { rows: counts } = await this.accounts.pool.query<{ feedback_id: number; count: string }>(
      `SELECT feedback_id, count(*) AS count FROM feedback_investigation_notes
       WHERE feedback_id IN (${placeholders}) GROUP BY feedback_id`,
      ids,
    );
    return rows.map((row) => {
      const volunteers = investigators.filter((investigator) => investigator.feedback_id === row.id);
      return {
        id: row.id,
        summary: row.summary,
        description: row.description,
        cardIds: cardIds(row.card_ids),
        status: row.status,
        createdAt: Number(row.created_at),
        volunteerNames: volunteers.map((volunteer) => volunteer.display_name),
        claimedByMe: volunteers.some((volunteer) => volunteer.account_id === accountId),
        noteCount: Number(counts.find((count) => count.feedback_id === row.id)?.count ?? 0),
      };
    });
  }
}

function cardIds(value: BugRow["card_ids"]): string[] {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.filter((cardId): cardId is string => typeof cardId === "string") : [];
}
