import { createHash, randomUUID } from "node:crypto";
import {
  MAX_SAVED_REPLAY_BYTES,
  MAX_REPLAY_STORAGE_BYTES,
  MAX_SAVED_REPLAYS,
  type ReplayDownloadMessage,
  type ReplaySaveError,
  type SavedReplay,
} from "@aegis/shared";
import type { PoolClient } from "pg";
import type { AccountStore } from "../accounts/AccountStore.js";
import type { ReplayStorage } from "./storage.js";

type ReplayRow = {
  id: string;
  account_id: string;
  slot: number;
  summary: SavedReplay["summary"];
  viewer_seat: SavedReplay["viewerSeat"];
  byte_size: number;
  checksum: string;
  saved_at: string;
  status: SavedReplay["status"];
  visibility: SavedReplay["visibility"];
};

export class ReplayLibraryError extends Error {
  readonly code: ReplaySaveError;
  constructor(code: ReplaySaveError) {
    super(code);
    this.code = code;
  }
}
const view = (row: ReplayRow): SavedReplay => ({
  id: row.id,
  summary: row.summary,
  viewerSeat: row.viewer_seat,
  bytes: row.byte_size,
  savedAt: Number(row.saved_at),
  status: row.status,
  visibility: row.visibility,
});
const key = (row: ReplayRow) => `accounts/${row.account_id}/${row.id}.aegis-replay`;
const checksum = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Durable reservations count towards both quotas. A failed/crashed write can be retried or deleted. */
export class ReplayLibrary {
  constructor(
    private readonly accounts: AccountStore,
    private readonly storage?: ReplayStorage,
  ) {}
  get enabled(): boolean {
    return this.storage !== undefined;
  }

  async list(accountId: string): Promise<SavedReplay[]> {
    await this.accounts.ensureReady();
    const result = await this.accounts.pool.query<ReplayRow>(
      "SELECT * FROM account_replays WHERE account_id=$1 ORDER BY saved_at DESC",
      [accountId],
    );
    return result.rows.map(view);
  }

  async save(accountId: string, message: Extract<ReplayDownloadMessage, { kind: "ready" }>): Promise<SavedReplay> {
    if (!this.storage) throw new ReplayLibraryError("unavailable");
    const bytes = Buffer.from(message.data, "base64");
    if (!bytes.length || bytes.length > MAX_SAVED_REPLAY_BYTES) throw new ReplayLibraryError("size");
    const digest = checksum(bytes);
    const reservation = await this.transaction(accountId, async (client) => {
      const rows = (await client.query<ReplayRow>("SELECT * FROM account_replays WHERE account_id=$1", [accountId]))
        .rows;
      const existing = rows.find(
        (row) => row.summary.id === message.summary.id && row.viewer_seat === message.viewerSeat,
      );
      if (existing) {
        if (existing.checksum !== digest || existing.status === "deleting") throw new ReplayLibraryError("unavailable");
        return existing;
      }
      const occupied = new Set(rows.map((row) => row.slot));
      const slot = Array.from({ length: MAX_SAVED_REPLAYS }, (_, index) => index + 1).find(
        (candidate) => !occupied.has(candidate),
      );
      if (slot === undefined) throw new ReplayLibraryError("limit");
      const quota = await client.query(
        "UPDATE replay_storage_usage SET bytes=bytes+$1 WHERE id=1 AND bytes+$1<=$2 RETURNING id",
        [bytes.length, MAX_REPLAY_STORAGE_BYTES],
      );
      if (!quota.rowCount) throw new ReplayLibraryError("storage_full");
      return (
        await client.query<ReplayRow>(
          "INSERT INTO account_replays (id,account_id,slot,match_id,viewer_seat,summary,byte_size,checksum,saved_at,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *",
          [
            randomUUID(),
            accountId,
            slot,
            message.summary.id,
            message.viewerSeat,
            JSON.stringify(message.summary),
            bytes.length,
            digest,
            Date.now(),
          ],
        )
      ).rows[0]!;
    });
    if (reservation.status === "ready") return view(reservation);
    // Serialize writes/deletes for this account across every API process. Persist the reservation
    // first, so even a crash after S3 PUT leaves a known key and a reclaimable occupied slot.
    return this.transaction(accountId, async (client) => {
      const row = (
        await client.query<ReplayRow>("SELECT * FROM account_replays WHERE id=$1 AND account_id=$2", [
          reservation.id,
          accountId,
        ])
      ).rows[0];
      if (!row || row.status === "deleting") throw new ReplayLibraryError("unavailable");
      if (row.status !== "ready") {
        await this.storage!.put(key(row), bytes);
        await client.query("UPDATE account_replays SET status='ready' WHERE id=$1", [row.id]);
      }
      return view({ ...row, status: "ready" });
    });
  }

  async setVisibility(
    accountId: string,
    id: string,
    visibility: SavedReplay["visibility"],
  ): Promise<SavedReplay | undefined> {
    await this.accounts.ensureReady();
    const result = await this.accounts.pool.query<ReplayRow>(
      "UPDATE account_replays SET visibility=$3 WHERE id=$1 AND account_id=$2 AND status='ready' RETURNING *",
      [id, accountId, visibility],
    );
    return result.rows[0] ? view(result.rows[0]) : undefined;
  }

  async accessible(accountId: string | undefined, id: string): Promise<SavedReplay | undefined> {
    const row = await this.readable(accountId, id);
    return row ? view(row) : undefined;
  }

  private async readable(accountId: string | undefined, id: string): Promise<ReplayRow | undefined> {
    await this.accounts.ensureReady();
    return (
      await this.accounts.pool.query<ReplayRow>(
        "SELECT * FROM account_replays WHERE id=$1 AND status='ready' AND (account_id=$2 OR visibility='public')",
        [id, accountId ?? null],
      )
    ).rows[0];
  }

  async file(accountId: string | undefined, id: string): Promise<{ replay: SavedReplay; bytes: Buffer } | undefined> {
    const row = await this.readable(accountId, id);
    if (!row) return undefined;
    if (!this.storage) throw new ReplayLibraryError("unavailable");
    const bytes = await this.storage.get(key(row));
    if (bytes.length !== row.byte_size || checksum(bytes) !== row.checksum)
      throw new Error("Stored replay integrity mismatch");
    // Check again after object I/O so a revocation during a slow download is respected.
    if (!(await this.readable(accountId, id))) return undefined;
    return { replay: view(row), bytes };
  }

  async remove(accountId: string, id: string, stalePendingBefore?: number): Promise<boolean> {
    if (!this.storage) throw new ReplayLibraryError("unavailable");
    const row = await this.transaction(accountId, async (client) => {
      const found = (
        await client.query<ReplayRow>("SELECT * FROM account_replays WHERE id=$1 AND account_id=$2", [id, accountId])
      ).rows[0];
      if (!found) return undefined;
      if (
        stalePendingBefore !== undefined &&
        found.status !== "deleting" &&
        (found.status !== "pending" || Number(found.saved_at) >= stalePendingBefore)
      )
        return undefined;
      await client.query("UPDATE account_replays SET status='deleting' WHERE id=$1", [id]);
      return found;
    });
    if (!row) return false;
    // The tombstone survives crashes and S3 failures; quota is released only after deletion.
    await this.storage.remove(key(row));
    await this.transaction(accountId, async (client) => {
      const removed = await client.query<{ byte_size: number }>(
        "DELETE FROM account_replays WHERE id=$1 AND account_id=$2 AND status='deleting' RETURNING byte_size",
        [id, accountId],
      );
      if (removed.rows[0])
        await client.query("UPDATE replay_storage_usage SET bytes=bytes-$1::bigint WHERE id=1", [
          removed.rows[0].byte_size,
        ]);
    });
    return true;
  }

  /** Retry tombstones and abandon interrupted uploads after 24 hours, never completed replays. */
  async cleanup(now = Date.now()): Promise<void> {
    if (!this.storage) return;
    await this.accounts.ensureReady();
    const cutoff = now - 24 * 60 * 60 * 1000;
    const rows = (
      await this.accounts.pool.query<{ id: string; account_id: string }>(
        "SELECT id,account_id FROM account_replays WHERE status='deleting' OR (status='pending' AND saved_at<$1) ORDER BY saved_at LIMIT 20",
        [cutoff],
      )
    ).rows;
    for (const row of rows) await this.remove(row.account_id, row.id, cutoff);
  }

  private async transaction<T>(accountId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    await this.accounts.ensureReady();
    const client = await this.accounts.pool.connect();
    try {
      await client.query("BEGIN");
      // Account row locks prevent two replicas from choosing the same slot. DB constraints
      // independently enforce ten slots, and the shared counter makes the disk cap atomic.
      const owner = await client.query("SELECT id FROM accounts WHERE id=$1 FOR UPDATE", [accountId]);
      if (!owner.rowCount) throw new ReplayLibraryError("sign_in");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
