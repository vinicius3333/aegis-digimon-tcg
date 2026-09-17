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
import { presentableNarration } from "./presentableNarration";

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
  deletionReadyAtRef: MutableRefObject<Map<string, { readyAt: number; instanceId?: string }>>;
  effectSourceKeyRef: MutableRefObject<number>;
  setEffectSources: Dispatch<SetStateAction<readonly EffectActivation[]>>;
  setNarration: Dispatch<SetStateAction<ReadonlyMap<string, NarrationItem>>>;
  collapseNarrationRef: MutableRefObject<boolean>;
  narrationLimitRef: MutableRefObject<number>;
  suppressedOwnEffectsRef: MutableRefObject<Set<string>>;
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
    setEffectSources,
    setNarration,
    collapseNarrationRef,
    narrationLimitRef,
    suppressedOwnEffectsRef,
    heldNoticesRef,
    heldPanelsRef,
    lastBatchIdRef,
    narrationSequenceRef,
    narrationRef,
  } = deps;

  /** Publish the clause before the results queued behind its arrival. */
  function enqueueNarrationItem(item: NarrationItem, effectSourceHoldMs: number = TIMINGS.effectSourceHold) {
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
      holdsBoard: false,
      blocksDecision: false,
      async run(context) {
        if (context.mode === "replay" || narrationSkipRef.current) return;
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
          if (/on.?deletion/i.test(body.timing ?? "")) {
            const deletion = deletionReadyAtRef.current.get(`${seat}:${body.cardId}`);
            await context.wait(Math.max(0, (deletion?.readyAt ?? 0) - Date.now()));
          }
          if (context.cancelled || narrationSkipRef.current) return;
          const deletion = /on.?deletion/i.test(body.timing ?? "")
            ? deletionReadyAtRef.current.get(`${seat}:${body.cardId}`)
            : undefined;
          const site = deletion?.instanceId
            ? { zone: "trash" as const, instanceId: deletion.instanceId }
            : cardSiteRef.current.locate(body.cardId, seat, body);
          if (site && context.mode === "live") {
            const activation: EffectActivation = {
              key: ++effectSourceKeyRef.current,
              cardId: body.cardId,
              seat,
              site,
            };
            try {
              setEffectSources((sources) => [...sources, activation]);
              reportShown(`effect-source-${activation.key}`, context);
              await context.wait(effectSourceHoldMs);
            } finally {
              setEffectSources((sources) => sources.filter((source) => source.key !== activation.key));
            }
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
        reportShown(`narration-step-${item.id}`, context);
        // A narration column is a FIFO, not a latest-event ticker. Where the column holds a
        // single moment, give every clause one readable beat before the next server event
        // can replace it; a column with room shows a batch together instead.
        if (shown.notice && narrationLimitRef.current === 1) await context.wait(TIMINGS.effectAnnounce);
      },
    });
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
  ) {
    if (notices.length === 0 && panels.length === 0) return;
    const items = buildNarrationItems({
      batchId,
      notices,
      panels,
      nowMs: Date.now(),
      nextId: () => `narration-${(narrationSequenceRef.current += 1)}`,
    });
    for (const item of items) enqueueNarrationItem(item, effectSourceHoldMs);
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
  function openHeld(ownNotices: readonly MatchNotice[], ownPanels: readonly SidePanel[]) {
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
