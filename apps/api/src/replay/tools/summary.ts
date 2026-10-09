import { getCardDefinition, type GameState, type Permanent } from "@aegis/shared";
import type { ReplayRun } from "../run.js";
import type { ReplayDivergence, ReplayRecord } from "../types.js";
import { describeInput } from "./inputs.js";

/** The `run` command's result, as `--json` prints it. */
export interface ReplaySummary {
  matchId: string;
  serverRevision?: string;
  totalInputs: number;
  applied: number;
  /** Set when `--until` stopped the replay early: the input the shown state was waiting for. */
  stoppedBefore?: { index: number; input: string };
  divergences: ReplayDivergence[];
  position: ReplayPosition;
  board: [SeatBoard, SeatBoard];
}

export interface ReplayPosition {
  turn: number;
  phase: string;
  turnSeat: number;
  /** The shared gauge as the engine stores it: positive favours the turn player. */
  memory: number;
  stateVersion: number;
  pendingDecision?: { seat: number; kind: string; prompt: string };
  combatWindow?: { seat: number; kind: string };
  gameOver: boolean;
  winnerSeat?: number;
}

export interface PermanentSummary {
  permanentId: string;
  instanceId: string;
  cardId: string;
  name?: string;
  dp: number;
  suspended: boolean;
  /** Digivolution cards under the top card. */
  sources: number;
  linked?: number;
}

export interface SeatBoard {
  seat: number;
  hand: number;
  deck: number;
  security: number;
  trash: number;
  breeding?: PermanentSummary;
  battleArea: PermanentSummary[];
}

export function summarizeRun(record: ReplayRecord, run: ReplayRun, until?: number): ReplaySummary {
  const { state } = run;
  const stopped = until !== undefined && until < record.inputs.length ? until : undefined;
  return {
    matchId: record.matchId,
    ...(record.serverRevision ? { serverRevision: record.serverRevision } : {}),
    totalInputs: record.inputs.length,
    applied: run.applied,
    ...(stopped !== undefined
      ? { stoppedBefore: { index: stopped, input: describeInput(record.inputs[stopped]!, stopped) } }
      : {}),
    divergences: run.divergences,
    position: positionOf(state),
    board: [boardOf(state, 0), boardOf(state, 1)],
  };
}

function positionOf(state: GameState): ReplayPosition {
  const decision = state.pendingDecision;
  const combat = state.combatWindow;
  return {
    turn: state.turnCount,
    phase: state.phase,
    turnSeat: state.turnSeat,
    memory: state.memory,
    stateVersion: state.stateVersion,
    ...(decision ? { pendingDecision: { seat: decision.seat, kind: decision.kind, prompt: decision.promptText } } : {}),
    ...(combat ? { combatWindow: { seat: combat.seat, kind: combat.kind } } : {}),
    gameOver: state.gameOver,
    ...(state.winnerSeat >= 0 ? { winnerSeat: state.winnerSeat } : {}),
  };
}

function permanentOf(permanent: Permanent): PermanentSummary {
  const top = permanent.topCard;
  const name = top ? getCardDefinition(top.cardId)?.nameEn : undefined;
  return {
    permanentId: permanent.permanentId,
    instanceId: top?.instanceId ?? "",
    cardId: top?.cardId ?? "",
    ...(name ? { name } : {}),
    dp: permanent.currentDP,
    suspended: permanent.isSuspended,
    sources: permanent.stack.length,
    ...(permanent.linked.length > 0 ? { linked: permanent.linked.length } : {}),
  };
}

function boardOf(state: GameState, seat: 0 | 1): SeatBoard {
  const player = state.players[seat];
  if (!player) return { seat, hand: 0, deck: 0, security: 0, trash: 0, battleArea: [] };
  return {
    seat,
    hand: player.hand.length,
    deck: player.deck.length,
    security: player.security.length,
    trash: player.trash.length,
    ...(player.breeding ? { breeding: permanentOf(player.breeding) } : {}),
    battleArea: [...player.battleArea].map(permanentOf),
  };
}

function formatPermanent(permanent: PermanentSummary): string {
  const flags = [
    permanent.suspended ? "suspended" : "",
    permanent.sources ? `${permanent.sources} under` : "",
    permanent.linked ? `${permanent.linked} linked` : "",
  ].filter(Boolean);
  const name = permanent.name ? ` ${permanent.name}` : "";
  const dp = permanent.dp ? ` ${permanent.dp} DP` : "";
  return (
    `${permanent.cardId}${name}${dp} (${permanent.permanentId}/${permanent.instanceId})` +
    (flags.length ? ` [${flags.join(", ")}]` : "")
  );
}

/** The `run` command's human-readable output. */
export function formatSummary(summary: ReplaySummary): string[] {
  const lines = [
    `Match ${summary.matchId}${summary.serverRevision ? ` (server ${summary.serverRevision})` : ""}`,
    `Applied ${summary.applied}/${summary.totalInputs} inputs` +
      (summary.stoppedBefore ? `; stopped before input #${summary.stoppedBefore.index}` : ""),
  ];
  if (summary.stoppedBefore) lines.push(`Next input: ${summary.stoppedBefore.input}`);
  if (summary.divergences.length === 0) lines.push("Divergences: none");
  else {
    lines.push(`Divergences: ${summary.divergences.length}`);
    for (const divergence of summary.divergences) lines.push(`  ${divergence.kind}: ${divergence.message}`);
  }
  const { position } = summary;
  lines.push(
    `Position: turn ${position.turn}, ${position.phase} phase, seat ${position.turnSeat} to play, ` +
      `memory ${position.memory} (positive favours seat ${position.turnSeat}), stateVersion ${position.stateVersion}`,
  );
  if (position.pendingDecision) {
    const { seat, kind, prompt } = position.pendingDecision;
    lines.push(`Pending decision: seat ${seat} ${kind}${prompt ? ` "${prompt}"` : ""}`);
  }
  if (position.combatWindow)
    lines.push(`Combat window: seat ${position.combatWindow.seat} ${position.combatWindow.kind}`);
  if (position.gameOver)
    lines.push(`Game over${position.winnerSeat !== undefined ? `: seat ${position.winnerSeat} won` : ""}`);
  for (const board of summary.board) {
    lines.push(
      `Seat ${board.seat}: hand ${board.hand}, deck ${board.deck}, security ${board.security}, trash ${board.trash}`,
    );
    if (board.breeding) lines.push(`  breeding: ${formatPermanent(board.breeding)}`);
    if (board.battleArea.length === 0) lines.push("  battle area: empty");
    for (const permanent of board.battleArea) lines.push(`  ${formatPermanent(permanent)}`);
  }
  return lines;
}
