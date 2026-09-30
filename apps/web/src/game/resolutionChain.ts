/* The resolution strip's model: which effects a chain holds, which one is on screen, which
   are still to come, and the recap of the last chain once it is over.

   A chain starts at the first effect announced after the screen went idle, or at an order
   answer (the viewer's own resolution plan, or the opponent's `resolutionOrderChosen`). It
   ends once the presentation has settled with no effect still pending. Effects that were
   planned and never announced — an optional one answered "no" — leave with the chain. A
   chain of one effect shows no strip: its clause says everything, and the previous chain's
   recap stays up through it.

   Driven by presentation time, not server time: "current" is the effect whose clause the
   viewer is reading, however far ahead the server already is. Pure, so it is tested without
   a match. */

import type { ResolutionOrderEntry, Seat } from "@aegis/shared";
import { activePacing } from "./pacing";

export type ChainEntryStatus = "done" | "current" | "upcoming";

export interface ChainEntry {
  key: string;
  seat: Seat;
  /** Absent for an opponent's effect whose source the viewer cannot see yet. */
  sourceCardId?: string;
  timing?: string;
  description?: string;
  status: ChainEntryStatus;
}

export interface ChainRecap {
  entries: readonly ChainEntry[];
  endedAt: number;
}

export interface ResolutionStripState {
  /** The chain being presented, or null between chains. */
  entries: readonly ChainEntry[] | null;
  /** Seats whose upcoming order came from the viewer's own answer, which the server echo must not overwrite. */
  ownPlanSeats: readonly Seat[];
  recap: ChainRecap | null;
  nextKey: number;
}

export type PlanSource = "own" | "server";

export type ResolutionStripAction =
  | { type: "planned"; seat: Seat; source: PlanSource; entries: readonly ResolutionOrderEntry[] }
  | { type: "announced"; seat: Seat; sourceCardId: string; timing?: string; description?: string }
  | { type: "settled"; at: number }
  | { type: "dismissRecap" };

/** A chain shorter than `minChainLength` needs no strip: one effect is its own clause. */
function longEnough(entries: readonly ChainEntry[]): boolean {
  return entries.length >= activePacing().minChainLength;
}

export const emptyResolutionStrip: ResolutionStripState = {
  entries: null,
  ownPlanSeats: [],
  recap: null,
  nextKey: 0,
};

/** Engine timings are spelled several ways ("OnPlay", "onPlay", "On Play"); compare them loosely. */
function sameTiming(left: string | undefined, right: string | undefined): boolean {
  if (left === undefined || right === undefined) return true;
  const normalize = (timing: string) => timing.replace(/[^a-z]/gi, "").toLowerCase();
  return normalize(left) === normalize(right);
}

/** The upcoming entry an announced effect fulfils: same seat and card, then the same timing. */
function plannedMatch(
  entries: readonly ChainEntry[],
  action: Extract<ResolutionStripAction, { type: "announced" }>,
): number {
  const candidates = entries
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        entry.status === "upcoming" &&
        entry.seat === action.seat &&
        (entry.sourceCardId === undefined || entry.sourceCardId === action.sourceCardId),
    );
  const exact = candidates.find(
    ({ entry }) => entry.sourceCardId === action.sourceCardId && sameTiming(entry.timing, action.timing),
  );
  return (
    (exact ?? candidates.find(({ entry }) => entry.sourceCardId === action.sourceCardId) ?? candidates[0])?.index ?? -1
  );
}

/** The last chain's recap stays until the next chain is long enough to take the strip's place. */
function replacedRecap(recap: ChainRecap | null, entries: readonly ChainEntry[]): ChainRecap | null {
  return longEnough(entries) ? null : recap;
}

export function resolutionStripReducer(
  state: ResolutionStripState,
  action: ResolutionStripAction,
): ResolutionStripState {
  switch (action.type) {
    case "planned": {
      if (action.source === "server" && state.entries !== null && state.ownPlanSeats.includes(action.seat))
        return state;
      let nextKey = state.nextKey;
      const planned: ChainEntry[] = action.entries.map((entry) => ({
        key: `chain-${(nextKey += 1)}`,
        seat: action.seat,
        ...(entry.sourceCardId !== undefined ? { sourceCardId: entry.sourceCardId } : {}),
        ...(entry.timing ? { timing: entry.timing } : {}),
        ...(entry.description ? { description: entry.description } : {}),
        status: "upcoming",
      }));
      const kept = (state.entries ?? []).filter((entry) => entry.status !== "upcoming" || entry.seat !== action.seat);
      const startsChain = state.entries === null;
      const entries = [...kept, ...planned];
      return {
        entries,
        ownPlanSeats:
          action.source === "own"
            ? [...(startsChain ? [] : state.ownPlanSeats.filter((seat) => seat !== action.seat)), action.seat]
            : startsChain
              ? []
              : state.ownPlanSeats,
        recap: replacedRecap(state.recap, entries),
        nextKey,
      };
    }
    case "announced": {
      const startsChain = state.entries === null;
      const finished = (state.entries ?? []).map((entry) =>
        entry.status === "current" ? { ...entry, status: "done" as const } : entry,
      );
      const index = plannedMatch(finished, action);
      const described = {
        sourceCardId: action.sourceCardId,
        ...(action.timing ? { timing: action.timing } : {}),
        ...(action.description ? { description: action.description } : {}),
      };
      let nextKey = state.nextKey;
      const entries =
        index >= 0
          ? finished.map((entry, position) =>
              position === index ? { ...entry, ...described, status: "current" as const } : entry,
            )
          : [
              ...finished,
              { key: `chain-${(nextKey += 1)}`, seat: action.seat, ...described, status: "current" as const },
            ];
      return {
        entries,
        ownPlanSeats: startsChain ? [] : state.ownPlanSeats,
        recap: replacedRecap(state.recap, entries),
        nextKey,
      };
    }
    case "settled": {
      if (state.entries === null) return state;
      const played = state.entries
        .filter((entry) => entry.status !== "upcoming")
        .map((entry) => ({ ...entry, status: "done" as const }));
      return {
        entries: null,
        ownPlanSeats: [],
        recap: longEnough(played) ? { entries: played, endedAt: action.at } : state.recap,
        nextKey: state.nextKey,
      };
    }
    case "dismissRecap":
      return state.recap === null ? state : { ...state, recap: null };
  }
}

/** What the strip reads out: "Resolving 2 of 5", with the current entry, or null when nothing shows. */
export function resolvingProgress(
  entries: readonly ChainEntry[] | null,
): { position: number; total: number; current: ChainEntry | undefined } | null {
  if (entries === null || !longEnough(entries)) return null;
  const currentIndex = entries.findIndex((entry) => entry.status === "current");
  const done = entries.filter((entry) => entry.status === "done").length;
  return {
    position: currentIndex >= 0 ? currentIndex + 1 : done,
    total: entries.length,
    current: currentIndex >= 0 ? entries[currentIndex] : undefined,
  };
}

/** The entries an own `orderTriggers` answer puts in order, read off the request it answers. */
export function ownPlanEntries(
  options:
    | {
        triggerKeys?: readonly string[];
        triggerCardIds?: readonly string[];
        triggerTimings?: readonly string[];
        triggerDescriptions?: readonly string[];
      }
    | undefined,
  order: readonly string[],
): ResolutionOrderEntry[] {
  const keys = options?.triggerKeys ?? [];
  return order.flatMap((key) => {
    const index = keys.indexOf(key);
    if (index < 0) return [];
    const sourceCardId = options?.triggerCardIds?.[index];
    const timing = options?.triggerTimings?.[index];
    const description = options?.triggerDescriptions?.[index];
    return [
      {
        ...(sourceCardId ? { sourceCardId } : {}),
        ...(timing ? { timing } : {}),
        ...(description ? { description } : {}),
      },
    ];
  });
}
