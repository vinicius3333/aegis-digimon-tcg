import type { AccountNotification, NotificationKind, NotificationPage } from "@aegis/shared";
import type { AccountStore } from "../accounts/AccountStore.js";
import type { Queryable } from "../db/migrator.js";

const PAGE_SIZE = 20;
const READ_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_MARK_READ_IDS = 100;

export type NewNotification = {
  accountId: string;
  kind: NotificationKind;
  /** What the notification is about, e.g. `feedback:412`. A newer unread one replaces an older one. */
  subject: string;
  payload: AccountNotification["payload"];
  at: number;
};

/**
 * Records a notification on the caller's connection, so it commits or rolls back with the change
 * it announces. Read notifications past the retention window are pruned on the way.
 */
export async function notify(db: Queryable, notification: NewNotification): Promise<void> {
  const { accountId, kind, subject, payload, at } = notification;
  await db.query("DELETE FROM notifications WHERE account_id=$1 AND subject=$2 AND read_at IS NULL", [
    accountId,
    subject,
  ]);
  await db.query("DELETE FROM notifications WHERE account_id=$1 AND read_at IS NOT NULL AND created_at < $2", [
    accountId,
    at - READ_RETENTION_MS,
  ]);
  await db.query("INSERT INTO notifications (account_id, kind, subject, payload, created_at) VALUES ($1,$2,$3,$4,$5)", [
    accountId,
    kind,
    subject,
    JSON.stringify(payload),
    at,
  ]);
}

type NotificationRow = {
  id: number;
  kind: AccountNotification["kind"];
  payload: AccountNotification["payload"];
  created_at: string;
  read_at: string | null;
};

export class NotificationStore {
  constructor(private readonly accounts: AccountStore) {}

  async list(accountId: string, before?: number): Promise<NotificationPage> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<NotificationRow>(
      `SELECT id, kind, payload, created_at, read_at FROM notifications
       WHERE account_id=$1 ${before === undefined ? "" : "AND id < $2"}
       ORDER BY id DESC LIMIT ${PAGE_SIZE + 1}`,
      before === undefined ? [accountId] : [accountId, before],
    );
    const items = rows.slice(0, PAGE_SIZE).map(toNotification);
    return {
      items,
      nextBefore: rows.length > PAGE_SIZE ? items.at(-1)!.id : null,
      unread: await this.unreadCount(accountId),
    };
  }

  async unreadCount(accountId: string): Promise<number> {
    await this.accounts.ensureReady();
    const { rows } = await this.accounts.pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM notifications WHERE account_id=$1 AND read_at IS NULL",
      [accountId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  /** Marks the account's own notifications read; ids that belong to someone else are ignored. */
  async markRead(accountId: string, ids: readonly number[] | "all", at = Date.now()): Promise<number> {
    await this.accounts.ensureReady();
    if (ids === "all") {
      await this.accounts.pool.query("UPDATE notifications SET read_at=$2 WHERE account_id=$1 AND read_at IS NULL", [
        accountId,
        at,
      ]);
    } else if (ids.length) {
      const placeholders = ids.map((_, index) => `$${index + 3}`).join(",");
      await this.accounts.pool.query(
        `UPDATE notifications SET read_at=$2 WHERE account_id=$1 AND read_at IS NULL AND id IN (${placeholders})`,
        [accountId, at, ...ids],
      );
    }
    return this.unreadCount(accountId);
  }
}

function toNotification(row: NotificationRow): AccountNotification {
  return {
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    createdAt: Number(row.created_at),
    readAt: row.read_at === null ? null : Number(row.read_at),
  };
}
