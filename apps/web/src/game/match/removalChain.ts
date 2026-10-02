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
}

/** A removal's place in the run: the one it follows, if that one is still leaving. */
export interface RemovalTurn {
  previous?: RemovalLink;
  link: RemovalLink;
}

/** Takes the next place in the run of removals. */
export function joinRemovalChain(chainRef: MutableRefObject<RemovalLink | null>): RemovalTurn {
  const latest = chainRef.current;
  const stillLeaving =
    latest !== null &&
    (!latest.started.open ||
      (latest.startedAt !== undefined && Date.now() - latest.startedAt < TIMINGS.removalStagger));
  const link: RemovalLink = { started: createPresentationGate() };
  chainRef.current = link;
  return stillLeaving ? { previous: latest, link } : { link };
}

/** Waits until the removal before this one has had its moment. */
export async function waitForRemovalTurn(turn: RemovalTurn, context: AnimationStepContext): Promise<void> {
  const { previous } = turn;
  if (previous === undefined) return;
  await waitForGate(previous.started, context, CONSEQUENCE_GATE_MAX_MS, "removal/previous");
  if (context.cancelled) return;
  await context.wait(Math.max(0, (previous.startedAt ?? Date.now()) + TIMINGS.removalStagger - Date.now()));
}

/** This removal is now on screen; the next one counts its turn from here. */
export function startRemoval(turn: RemovalTurn): void {
  turn.link.startedAt ??= Date.now();
  turn.link.started.release();
}
