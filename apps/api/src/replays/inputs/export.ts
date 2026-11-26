import { GameMode } from "@aegis/shared/manual/GameMode";
import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import type { GameState, ReplaySummary, SequencedServerEvent } from "@aegis/shared";
import type { DecisionRequest } from "@aegis/shared/protocol/events";
import type { ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { buildReplayDecisionPoint } from "#api/replays/analysis/buildReplayDecisionPoint";
import { getReplayAdvantage } from "#api/replays/analysis/getReplayAdvantage";
import {
  prepareReplayDecisionEvaluation,
  type ReplayDecisionEvaluationJob,
} from "#api/replays/analysis/prepareReplayDecisionEvaluation";
import { evaluateReplayDecision } from "#api/replays/analysis/evaluateReplayDecision";
import { defaultBotProgram } from "#api/bot/defaultBotProgram";
import { ReplayRecording } from "../recording.js";
import { runReplay, type ReplayRun } from "./run.js";
import type { ReplayDivergence, ReplayRecord, ReplayRules } from "./types.js";

export interface ExportPlayerReplayOptions {
  /** Stop before applying `inputs[until]`, as `runReplay`'s `untilInput`; the match is then ended. */
  until?: number;
  /** Called once the record's inputs have run, before the export ends the match. */
  inspect?: (run: ReplayRun) => void;
  evaluate?: boolean;
  calibrate?: boolean;
}

export interface ExportedPlayerReplay {
  /** The gzipped `MatchReplay` JSON, as the room's replay download carries it. */
  file: Buffer;
  frames: number;
  decisions: number;
  evaluatedDecisions: number;
  evaluationMs: number;
  rollouts: number;
  calibration: { compared: number; agreed: number };
  divergences: ReplayDivergence[];
  /** "surrender" when the record (or `until`) stopped before the game was over. */
  endedBy: "recording" | "surrender";
}

/** Frame pacing only: one second per frame, since a headless run has no wall clock worth keeping. */
const FRAME_MS = 1_000;
const EVALUATION_CANDIDATES = 6;

/**
 * Re-execute a record and write it as the owner's player replay file, the file the web viewer opens
 * (Profile → Replays → Open file).
 *
 * The frames come from the room's own `ReplayRecording`, captured where the room captures them:
 * at every batch close, from the match start on. The viewer only opens finished games, so a run
 * that stops before the end (a cut log, or `until`) is ended by seat 0 surrendering, through the
 * same batch path, and seat 1 wins. Both hands are visible, as in a participant's download.
 */
export async function exportPlayerReplay(
  record: ReplayRecord,
  options: ExportPlayerReplayOptions = {},
): Promise<ExportedPlayerReplay> {
  const recording = new ReplayRecording(0);
  const decisions: ReplayDecisionPoint[] = [];
  const advantage: number[] = [];
  const evaluations: { decision: number; job: ReplayDecisionEvaluationJob }[] = [];
  let request: DecisionRequest | undefined;
  let frames = 0;
  let started = false;
  const onBatch = (state: GameState, events: SequencedServerEvent[]) => {
    // The room creates its recording on `matchStarted`, so earlier events and batches are left out.
    if (!started) {
      const start = events.findIndex((event) => event.kind === "matchStarted");
      if (start < 0) return;
      started = true;
      events = events.slice(start);
    }
    frames += 1;
    recording.capture(state, events, frames * FRAME_MS);
    advantage.push(getReplayAdvantage(state));
  };

  const run = await runReplay(record, {
    ...(options.until !== undefined ? { untilInput: options.until } : {}),
    onBatch,
    onDecision: (next) => {
      request = next;
    },
    beforeInput: (input, inputIndex, engine) => {
      if (input.kind !== "intent" || input.ok !== true) {
        return;
      }
      const build = buildReplayDecisionPoint({
        engine,
        seat: input.seat,
        intent: input.intent,
        request: engine.state.pendingDecision === undefined ? undefined : request,
        frameIndex: Math.max(0, frames - 1),
        inputIndex,
      });
      if (build === undefined) {
        return;
      }
      decisions.push(build.decision);
      const job = options.evaluate
        ? prepareReplayDecisionEvaluation({ engine, seat: input.seat, build, candidateLimit: EVALUATION_CANDIDATES })
        : undefined;
      if (job !== undefined) {
        evaluations.push({ decision: decisions.length - 1, job });
      }
    },
  });
  options.inspect?.(run);
  let endedBy: ExportedPlayerReplay["endedBy"] = "recording";
  if (!run.state.gameOver) {
    if (!started) throw new Error("The replay never started a match, so there is nothing for the viewer to show.");
    const result = await run.applyIntent(0, { type: "surrender" });
    if (!result.ok || !run.state.gameOver)
      throw new Error(
        `Could not end the match for the viewer: surrender ${result.ok ? "did not end it" : `was refused (${result.reason})`}.`,
      );
    endedBy = "surrender";
  }

  const replay = recording.participantFile(replayMode(record.rules), 0, frames * FRAME_MS);
  if (!replay)
    throw new Error(
      recording.exceededLimit
        ? "The match is too long for a replay file (the recording exceeded its size or frame limit)."
        : "The recording did not reach the end of the match.",
    );
  const evaluationStarted = performance.now();
  let evaluatedDecisions = 0;
  let rollouts = 0;
  const calibration = { compared: 0, agreed: 0 };
  for (const { decision, job } of evaluations) {
    const evaluated = await evaluateReplayDecision({
      job,
      decision: decisions[decision]!,
      program: defaultBotProgram({ deck: record.seats[job.seat].deck }).program,
      ...(record.randomKey === undefined ? {} : { randomKey: record.randomKey }),
      seed: (record.seed + decisions[decision]!.inputIndex * 2654435761) >>> 0,
      calibrate: options.calibrate === true,
    });
    rollouts += evaluated.rollouts;
    if (evaluated.decision.quality !== undefined) {
      evaluatedDecisions += 1;
    }
    if (evaluated.agreesWithMaster !== undefined) {
      calibration.compared += 1;
      calibration.agreed += evaluated.agreesWithMaster ? 1 : 0;
    }
    decisions[decision] = evaluated.decision;
  }
  return {
    file: gzipSync(JSON.stringify({ ...(JSON.parse(replay.json) as object), decisions, advantage })),
    frames: replay.summary.frameCount,
    decisions: decisions.length,
    evaluatedDecisions,
    evaluationMs: Math.round(performance.now() - evaluationStarted),
    rollouts,
    calibration,
    divergences: run.divergences,
    endedBy,
  };
}

/** The room's `replayMode()` for the rules a record carries; room kinds it does not carry play as casual. */
function replayMode(rules: ReplayRules): ReplaySummary["mode"] {
  if (rules.gameMode === GameMode.MANUAL.value) {
    return GameMode.MANUAL.value;
  }
  if (rules.unlimited) return "unlimited";
  return rules.betaBattle ? "beta" : "casual";
}
