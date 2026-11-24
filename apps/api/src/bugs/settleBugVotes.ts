import type { BugVerdict } from "@aegis/shared/feedback/BugVerdict";
import type { Queryable } from "#api/db/migrator";

type Params = { feedbackId: number; previous: BugVerdict | null; next: BugVerdict | null };

export async function settleBugVotes(db: Queryable, { feedbackId, previous, next }: Params): Promise<void> {
  if (previous === next) return;
  const reward = (verdict: BugVerdict, coins: number) =>
    db.query(
      `UPDATE accounts SET aegis_coins = GREATEST(0, aegis_coins + $3)
       WHERE id IN (SELECT account_id FROM feedback_bug_votes WHERE feedback_id=$1 AND verdict=$2)`,
      [feedbackId, verdict, coins],
    );
  if (previous) await reward(previous, -1);
  if (next) await reward(next, 1);
  await db.query("UPDATE feedback_reports SET vote_payout=$2 WHERE id=$1", [feedbackId, next]);
}
