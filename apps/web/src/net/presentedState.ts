/* Presented state: the board the narration has reached (docs/presentation-queue-plan.md 3.2).

   Colyseus applies every state patch the instant it arrives, so the live state is always
   the outcome of the newest batch the server resolved. The presentation is behind that by
   design — it is reading out one moment at a time — so the screen renders from a snapshot
   taken at the revision of the batch the queue is currently presenting. Legality never
   reads a snapshot: the viewer acts on the live state, always.

   The board therefore lags as a whole, or not at all, which is what stops it running ahead
   of the narration ACROSS batches. Holding a piece back WITHIN its own batch — the shield
   figure through the reveal that spends it, a permanent through its arrival burst — is a
   different job and still belongs to the cues (see useMatchCues). */

import type { GameState } from "@aegis/shared";

/** One plain copy of the seat view, tagged with the revision it belongs to. */
export interface StateSnapshot {
  stateVersion: number;
  state: GameState;
}

/**
 * How many revisions are kept. The queue only ever looks back as far as the batches it has
 * not presented yet, which is a handful even on a slow phone; anything older is history no
 * screen will render again. Smaller than `MAX_TRACKED_BATCHES` (50) on purpose — a batch
 * whose snapshot has been evicted presents over the live board instead, which is exactly
 * what a client that has fallen this far behind should do.
 */
export const MAX_TRACKED_SNAPSHOTS = 16;

type PlainRecord = Record<string, unknown>;

function isSchemaLike(value: unknown): value is { toJSON: () => unknown } {
  return typeof value === "object" && value !== null && typeof (value as PlainRecord).toJSON === "function";
}

function clonePlain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (typeof value !== "object" || value === null) return value;
  const source = value as PlainRecord;
  const copy: PlainRecord = {};
  for (const key of Object.keys(source)) copy[key] = clonePlain(source[key]);
  return copy;
}

/**
 * A plain, frozen-in-time copy of the seat view.
 *
 * `toJSON()` is the schema's own structural projection: it walks the decoded fields and
 * turns every ArraySchema into an array, which is all the board reads (it only ever reads
 * properties and iterates — no schema method is called anywhere under `game/`). A field the
 * viewer's Colyseus view never unlocked is absent from the snapshot exactly as it is absent
 * from the live state, so the board sees no difference. Fabricated states in tests and demos
 * are plain objects already and take the deep-copy path.
 *
 * Measured on a full board (both seats: five permanents with three-card stacks, breeding,
 * ten cards in hand, five security, twenty trash, forty deck): 0.31 ms and 53 KB of JSON
 * per snapshot on a development machine, so the whole ring buffer stays under a megabyte
 * and one patch costs a fraction of a frame even several times slower on a phone.
 */
export function snapshotGameState(state: GameState): GameState {
  const plain = isSchemaLike(state) ? state.toJSON() : clonePlain(state);
  return plain as GameState;
}

/**
 * Record the live state under its own revision, newest last.
 *
 * Only a changed `stateVersion` is worth a snapshot. A patch can land mid-batch — Colyseus
 * patches on its own tick, and the server broadcasts events as they happen while bumping
 * the revision only when the batch closes — and such a patch carries part of a batch nobody
 * is presenting yet. It belongs to the next close, so it is folded into that revision's
 * snapshot rather than given one of its own.
 */
export function recordSnapshot(
  snapshots: readonly StateSnapshot[],
  state: GameState | undefined,
): readonly StateSnapshot[] {
  if (!state) return snapshots;
  const version = state.stateVersion ?? 0;
  const last = snapshots.at(-1);
  if (last && last.stateVersion === version) return snapshots;
  return [...snapshots.slice(-(MAX_TRACKED_SNAPSHOTS - 1)), { stateVersion: version, state: snapshotGameState(state) }];
}

/**
 * The board to render.
 *
 * The live state is returned — the presentation is caught up, or cannot be honoured —
 * whenever:
 * - nothing is being presented (`presentedStateVersion` undefined: idle, or the queue is in
 *   `replay` or `drain`, where there is no lag to show),
 * - the presented revision is the live one or newer,
 * - or the snapshot for it is gone (evicted, or a gap in the stream).
 */
export function selectPresentedState({
  live,
  snapshots,
  presentedStateVersion,
}: {
  live: GameState | undefined;
  snapshots: readonly StateSnapshot[];
  presentedStateVersion: number | undefined;
}): GameState | undefined {
  if (!live || presentedStateVersion === undefined) return live;
  if (presentedStateVersion >= (live.stateVersion ?? 0)) return live;
  return snapshots.find((snapshot) => snapshot.stateVersion === presentedStateVersion)?.state ?? live;
}
