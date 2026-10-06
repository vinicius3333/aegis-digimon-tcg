import type { MutableRefObject } from "react";
import type { AnimationStepContext } from "../animationQueue";
import { TIMINGS } from "../timings";
import {
  CONSEQUENCE_GATE_MAX_MS,
  createPresentationGate,
  waitForGate,
  type PresentationGate,
} from "./presentationGate";

/**
 * One card an effect takes off the field: the Option paying a ＜Delay＞, each Digimon the effect
 * deletes, each one it returns to a deck. The server sends them in batches of their own, so the
 * latest is kept across batches and the next one waits for it: they leave one at a time.
 */
export interface RemovalLink {
  started: PresentationGate;
  startedAt?: number;
  /** A physical return holds the following removal until its face has faded. */
  finished?: PresentationGate;
  /** When a deck return's face finished fading in its pile. */
  landedAt?: number;
}

/** A removal's place in the run: the one it follows, if that one is still leaving. */
export interface RemovalTurn {
  previous?: RemovalLink;
  link: RemovalLink;
}

/** Takes the next place in the run of removals. */
export function joinRemovalChain(chainRef: MutableRefObject<RemovalLink | null>, untilFinished = false): RemovalTurn {
  const latest = chainRef.current;
  const stillLeaving =
    latest !== null &&
    (!latest.started.open ||
      (latest.finished !== undefined && !latest.finished.open) ||
      (latest.startedAt !== undefined && Date.now() - latest.startedAt < TIMINGS.removalStagger));
  const link: RemovalLink = {
    started: createPresentationGate(),
    ...(untilFinished ? { finished: createPresentationGate() } : {}),
  };
  chainRef.current = link;
  return stillLeaving ? { previous: latest, link } : { link };
}

/** Waits until the removal before this one has had its moment. */
export async function waitForRemovalTurn(turn: RemovalTurn, context: AnimationStepContext): Promise<void> {
  const { previous } = turn;
  if (previous === undefined) return;
  await waitForGate(previous.started, context, CONSEQUENCE_GATE_MAX_MS, "removal/previous");
  if (context.cancelled) return;
  await waitForGate(previous.finished ?? null, context, CONSEQUENCE_GATE_MAX_MS, "removal/finished");
  if (context.cancelled) return;
  await context.wait(Math.max(0, (previous.startedAt ?? Date.now()) + TIMINGS.removalStagger - Date.now()));
}

/** The latest field return, while it is still flying or within its landing beat. */
export function landingFieldReturn(chainRef: MutableRefObject<RemovalLink | null>): RemovalLink | undefined {
  const latest = chainRef.current;
  if (!latest?.finished) return undefined;
  if (!latest.finished.open) return latest;
  return latest.landedAt !== undefined && Date.now() - latest.landedAt < TIMINGS.deckReturnLanding ? latest : undefined;
}

/**
 * What an effect plays after paying with a field return enters once that stack has landed,
 * then after a short beat, so the cost and its result read as two moves.
 */
export async function waitForFieldReturnLanding(
  link: RemovalLink | undefined,
  context: AnimationStepContext,
): Promise<void> {
  if (!link?.finished) return;
  await waitForGate(link.finished, context, CONSEQUENCE_GATE_MAX_MS, "arrival/fieldReturn");
  if (context.cancelled || context.skipping || link.landedAt === undefined) return;
  await context.wait(Math.max(0, link.landedAt + TIMINGS.deckReturnLanding - Date.now()));
}

/** This removal is now on screen; the next one counts its turn from here. */
export function startRemoval(turn: RemovalTurn): void {
  turn.link.startedAt ??= Date.now();
  turn.link.started.release();
}
