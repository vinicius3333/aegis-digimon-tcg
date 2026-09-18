import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { PresentationReport, Seat } from "@aegis/shared";
import type { AnimationQueue, AnimationStepContext } from "../../animationQueue";
import { buildNarrationItems, COLLAPSED_NARRATION_LIMIT, pushNarrationItem, type NarrationItem } from "../../narration";
import type { MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import type { EffectActivation, EffectSourceLookup } from "../../effectSource";
import { otherSeat } from "../../boardModel";
import { TIMINGS } from "../../timings";
import { CueTrack } from "../enums";
import { presentableNarration, type OwnEffectDialog } from "./presentableNarration";
import {
  CONSEQUENCE_GATE_MAX_MS,
  createPresentationGate,
  waitForGate,
  type DeletionReadyAt,
  type PendingAnnounceGate,
  type PresentationGate,
} from "../presentationGate";

/**
 * Where a spawned narration step goes in its track.
 *
 * A cue that reads out notices from INSIDE its own run — a security dock reading the clause
 * of the card it holds — sets `next`, so the clause lands right behind the cue that raised it
 * rather than behind every later check the server has shipped in the meantime.
 */
export interface NarrationPlacement {
  next?: boolean;
}

export interface NarrationStreamDeps {
  viewerSeat: Seat;
  queue: AnimationQueue;
  cardSiteRef: MutableRefObject<{
    locate: EffectSourceLookup;
    seatOf: (instanceId: string) => Seat | undefined;
    topInstanceOf: (permanentId: string) => string | undefined;
  }>;
  effectNarrationTracksRef: MutableRefObject<Map<Seat, string>>;
  heldOriginsRef: MutableRefObject<WeakMap<object, { batchId: string; stateVersion: number; phaseOrder: number }>>;
  enqueuePhaseOrderRef: MutableRefObject<number | undefined>;
  batchVersionsRef: MutableRefObject<Map<string, number>>;
  narrationPhaseOrdersRef: MutableRefObject<Map<string, number>>;
  completedPhaseOrderRef: MutableRefObject<number>;
  presentationReporterRef: MutableRefObject<((report: PresentationReport) => void) | undefined>;
  narrationSkipRef: MutableRefObject<boolean>;
  deletionReadyAtRef: MutableRefObject<Map<string, DeletionReadyAt>>;
  effectSourceKeyRef: MutableRefObject<number>;
  /** The announcement this batch is still holding its consequences behind. */
  effectAnnounceGateRef: MutableRefObject<PresentationGate | null>;
  /** A gate a batch armed before it knew which clause would carry it. */
  pendingAnnounceGateRef: MutableRefObject<PendingAnnounceGate | null>;
  setEffectSources: Dispatch<SetStateAction<readonly EffectActivation[]>>;
  setNarration: Dispatch<SetStateAction<ReadonlyMap<string, NarrationItem>>>;
  collapseNarrationRef: MutableRefObject<boolean>;
  narrationLimitRef: MutableRefObject<number>;
  suppressedOwnEffectsRef: MutableRefObject<Map<string, OwnEffectDialog>>;
  /** Items enqueued and not yet published, so a dialog opening can name the ones it silences. */
  queuedNarrationRef: MutableRefObject<Map<string, NarrationItem>>;
  heldNoticesRef: MutableRefObject<readonly MatchNotice[]>;
  heldPanelsRef: MutableRefObject<readonly SidePanel[]>;
  lastBatchIdRef: MutableRefObject<string>;
  narrationSequenceRef: MutableRefObject<number>;
  narrationRef: MutableRefObject<ReadonlyMap<string, NarrationItem>>;
}

export function narrationStream(deps: NarrationStreamDeps) {
  const {
    viewerSeat,
    queue,
    cardSiteRef,
    effectNarrationTracksRef,
    heldOriginsRef,
    enqueuePhaseOrderRef,
    batchVersionsRef,
    narrationPhaseOrdersRef,
    completedPhaseOrderRef,
    presentationReporterRef,
    narrationSkipRef,
    deletionReadyAtRef,
    effectSourceKeyRef,
    effectAnnounceGateRef,
    pendingAnnounceGateRef,
    setEffectSources,
    setNarration,
    collapseNarrationRef,
    narrationLimitRef,
    suppressedOwnEffectsRef,
    queuedNarrationRef,
    heldNoticesRef,
    heldPanelsRef,
    lastBatchIdRef,
    narrationSequenceRef,
    narrationRef,
  } = deps;

  /** Publish the clause before the results queued behind its arrival. */
  function enqueueNarrationItem(
    item: NarrationItem,
    effectSourceHoldMs: number = TIMINGS.effectSourceHold,
    opts?: NarrationPlacement,
  ) {
    const body = item.notice?.body;
    const seat = item.side === "you" ? viewerSeat : otherSeat(viewerSeat);
    const initialSite = body?.variant === "effect" ? cardSiteRef.current.locate(body.cardId, seat, body) : undefined;
    const timing = body?.variant === "effect" ? (body.timing ?? "") : "";
    // Follow the actual arrival track, including its field burst, rather than
    // estimating when a normal play or evolution will be finished.
    const onPlay = /on.?play/i.test(timing) && initialSite?.zone === "field";
    const arrivalTrack =
      /on.?play|when.?digivolving/i.test(timing) && initialSite?.zone === "field"
        ? onPlay
          ? CueTrack.CenterStage
          : `burst-${initialSite.permanentId}`
        : undefined;
    const causingEffectGate = effectAnnounceGateRef.current;
    const pending = pendingAnnounceGateRef.current;
    const adopted =
      body?.variant === "effect" && pending?.batchId === item.batchId && !pending.deleted.has(`${seat}:${body.cardId}`)
        ? pending.gate
        : null;
    const announceGate = body?.variant === "effect" ? (adopted ?? createPresentationGate()) : null;
    if (adopted) pendingAnnounceGateRef.current = null;
    if (announceGate) effectAnnounceGateRef.current = announceGate;
    if (arrivalTrack) effectNarrationTracksRef.current.set(seat, arrivalTrack);
    const precedingTrack = effectNarrationTracksRef.current.get(seat);
    const track =
      arrivalTrack ??
      (precedingTrack && queue.hasPendingStep((step) => step.track === precedingTrack) ? precedingTrack : "narration");
    const heldOrigin = heldOriginsRef.current.get(item.notice ?? item.panel ?? item);
    const origin = {
      phaseOrder: heldOrigin?.phaseOrder ?? enqueuePhaseOrderRef.current,
      batchId: item.batchId,
      stateVersion: heldOrigin?.stateVersion ?? batchVersionsRef.current.get(item.batchId) ?? 0,
      ...(body?.variant === "effect" ? { sourceCardId: body.cardId, timing: body.timing } : {}),
    };
    // Which phase raised the clause is what lets the ribbon that follows it wait for its
    // beat and then clear it (`waitForPhasePrerequisites`).
    narrationPhaseOrdersRef.current.set(item.id, origin.phaseOrder ?? completedPhaseOrderRef.current);
    queuedNarrationRef.current.set(item.id, item);
    function reportShown(stepId: string, context: AnimationStepContext) {
      try {
        presentationReporterRef.current?.({
          ...origin,
          phase: "shown",
          stepId,
          track,
          clientTimestamp: Date.now(),
          mode: context.mode,
          cancelled: context.cancelled,
          skipping: context.skipping,
          failed: false,
          pendingCount: queue.pendingCount(),
        });
      } catch {
        // Diagnostic transport must never interrupt the presentation.
      }
    }
    queue.enqueue({
      id: `narration-step-${item.id}`,
      origin,
      track,
      ...(opts?.next === true ? { next: true } : {}),
      holdsBoard: false,
      blocksDecision: false,
      async run(context) {
        /* The source card is lit before its clause and stays lit until the clause leaves
           (the prune in `useMatchCues`). A run that ends before the clause is ever published —
           cancelled, skipped, or nothing presentable left — owns the light it turned on,
           because no clause will arrive for the prune to follow. */
        let activation: EffectActivation | undefined;
        let linked = false;
        try {
          await runNarrationStep();
        } finally {
          queuedNarrationRef.current.delete(item.id);
          announceGate?.release();
          if (activation && !linked) {
            const key = activation.key;
            setEffectSources((sources) => sources.filter((source) => source.key !== key));
          }
        }

        async function runNarrationStep() {
          if (context.mode === "replay" || narrationSkipRef.current) return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS);
          if (context.cancelled || narrationSkipRef.current) return;
          if (onPlay && initialSite?.zone === "field") {
            while (
              queue.hasPendingStep((step) => step.track === `burst-${initialSite.permanentId}`) &&
              context.mode === "live" &&
              !context.cancelled &&
              !context.skipping
            )
              await context.wait(16);
          }
          if (context.mode === "live" && body?.variant === "effect") {
            // Let this batch register its deletion beats before locating the source.
            await Promise.resolve();
            const shatter = deletionReadyAtRef.current.get(`${seat}:${body.cardId}`);
            if (shatter) {
              await waitForGate(shatter.shattered, context, TIMINGS.securityDockMax);
              await context.wait(Math.max(0, shatter.readyAt - Date.now()));
            }
            if (context.cancelled || narrationSkipRef.current) return;
            const deletion = /on.?deletion/i.test(body.timing ?? "")
              ? deletionReadyAtRef.current.get(`${seat}:${body.cardId}`)
              : undefined;
            const site = deletion?.instanceId
              ? { zone: "trash" as const, instanceId: deletion.instanceId }
              : cardSiteRef.current.locate(body.cardId, seat, body);
            if (site && context.mode === "live") {
              activation = {
                key: ++effectSourceKeyRef.current,
                cardId: body.cardId,
                seat,
                site,
                itemId: item.id,
              };
              setEffectSources((sources) => [...sources, activation as EffectActivation]);
              reportShown(`effect-source-${activation.key}`, context);
              // The punch this card earns on its own, ahead of the clause it raised.
              await context.wait(effectSourceHoldMs);
            }
          }
          if (context.cancelled || narrationSkipRef.current) return;
          const shown = presentableNarration(item, {
            collapseNarration: collapseNarrationRef.current,
            suppressedOwnEffects: suppressedOwnEffectsRef.current,
          });
          if (!shown) return;
          const push = (published: NarrationItem) =>
            setNarration((items) =>
              pushNarrationItem(
                items,
                published,
                collapseNarrationRef.current ? COLLAPSED_NARRATION_LIMIT : narrationLimitRef.current,
                collapseNarrationRef.current,
              ),
            );
          // Left, then right. A moment carrying both halves is a sentence and its result, so
          // the clause takes the screen first and the cards it moved follow a beat later.
          // The folded phone slot draws both halves in one item, so it is published whole.
          const staggered = !collapseNarrationRef.current && shown.notice !== undefined && shown.panel !== undefined;
          if (staggered) {
            const { panel: _panel, ...clauseOnly } = shown;
            push(clauseOnly);
            await context.wait(TIMINGS.narrationCardsLag);
            if (context.cancelled || narrationSkipRef.current) return;
          }
          push(shown);
          if (activation) {
            const key = activation.key;
            linked = true;
            setEffectSources((sources) =>
              sources.map((source) => (source.key === key ? { ...source, linked: true } : source)),
            );
          }
          announceGate?.release();
          reportShown(`narration-step-${item.id}`, context);
          // A narration column is a FIFO, not a latest-event ticker. Where the column holds a
          // single moment, give every clause one readable beat before the next server event
          // can replace it; a column with room shows a batch together instead.
          if (shown.notice && narrationLimitRef.current === 1) await context.wait(TIMINGS.effectAnnounce);
        }
      },
    });
    if (announceGate) void queue.idle().then(() => announceGate.release());
  }

  /**
   * Queues one moment's worth of narration: the panels and the notices the same beat
   * raised, folded into as few items as they honestly make (../../narration).
   */
  function narrate(
    notices: readonly MatchNotice[],
    panels: readonly SidePanel[],
    batchId: string,
    effectSourceHoldMs: number = TIMINGS.effectSourceHold,
    opts?: NarrationPlacement,
  ) {
    if (notices.length === 0 && panels.length === 0) return;
    const items = buildNarrationItems({
      batchId,
      notices,
      panels,
      nowMs: Date.now(),
      nextId: () => `narration-${(narrationSequenceRef.current += 1)}`,
    });
    for (const item of items) enqueueNarrationItem(item, effectSourceHoldMs, opts);
  }

  /** Raises whatever a security check has still not said, on the clock it is raised at. */
  function flushHeldNotices() {
    openHeld(heldNoticesRef.current, heldPanelsRef.current);
  }

  /**
   * Raises exactly these, on the clock they are raised at, and takes them out of the held
   * buckets. Targeted rather than draining: a check is presented in several cues — the dock,
   * the arrival of a card it played, what that card then did — and each cue must say its own
   * part only. Draining let the dock read out an [On Play] result that had not happened on
   * screen yet, because a later batch had parked it in the same bucket.
   */
  function openHeld(ownNotices: readonly MatchNotice[], ownPanels: readonly SidePanel[], opts?: NarrationPlacement) {
    if (ownNotices.length === 0 && ownPanels.length === 0) return;
    heldNoticesRef.current = heldNoticesRef.current.filter((held) => !ownNotices.includes(held));
    heldPanelsRef.current = heldPanelsRef.current.filter((held) => !ownPanels.includes(held));
    const origins = new Set(
      [...ownNotices, ...ownPanels].map((item) => heldOriginsRef.current.get(item)?.batchId ?? lastBatchIdRef.current),
    );
    for (const batchId of origins) {
      narrate(
        ownNotices.filter((item) => (heldOriginsRef.current.get(item)?.batchId ?? lastBatchIdRef.current) === batchId),
        ownPanels.filter((item) => (heldOriginsRef.current.get(item)?.batchId ?? lastBatchIdRef.current) === batchId),
        batchId,
        TIMINGS.effectSourceHold,
        opts,
      );
    }
  }

  /**
   * The clauses a ribbon at `phaseOrder` would cover: everything an earlier phase raised.
   *
   * The ribbon waits one readable beat for them, but it no longer takes them off the
   * screen: a clause keeps its own six-second clock across the turn change, so a moment
   * raised at the end of a turn is still readable once the ribbons are done.
   */
  function narrationBefore(phaseOrder: number): NarrationItem[] {
    return [...narrationRef.current.values()].filter(
      (item) => (narrationPhaseOrdersRef.current.get(item.id) ?? 0) < phaseOrder,
    );
  }

  return {
    enqueueNarrationItem,
    narrate,
    flushHeldNotices,
    openHeld,
    narrationBefore,
  };
}
