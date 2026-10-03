import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStepContext } from "../animationQueue";
import { Side } from "../side";
import { isTouchLayout } from "./environment";
import { TIMINGS } from "../timings";
import { CueTrack } from "./enums";
import type { DrawBurst, DrawFlight, DrawFlightCard, MatchCueAnchors } from "./types";
import { CONSEQUENCE_GATE_MAX_MS, waitForGate, type PresentationGate } from "./presentationGate";
import { permanentVisualElement } from "../screen/dropZones";

export type PlayFlightOrigin = Pick<DOMRect, "left" | "top" | "width" | "height">;

export type FlyPlayedCard = (
  event: Extract<ServerEvent, { kind: "cardPlayed" }>,
  context: AnimationStepContext,
  fromShowcase?: PlayFlightOrigin,
) => Promise<boolean>;

export interface CueFlightsDeps {
  queue: AnimationQueue;
  anchors: MatchCueAnchors;
  viewerSeat: Seat;
  /** The clause a flight is a consequence of, which is read out before the cards move. */
  causingEffectGateRef: MutableRefObject<PresentationGate | null>;
  securityGainKeyRef: MutableRefObject<number>;
  drawFlightKeyRef: MutableRefObject<number>;
  setSecurityFlights: Dispatch<SetStateAction<ReadonlySet<number>>>;
  setSecurityDealCounts: Dispatch<SetStateAction<ReadonlyMap<Seat, number>>>;
  setDrawFlights: Dispatch<SetStateAction<readonly DrawFlight[]>>;
  setDrawBursts: Dispatch<SetStateAction<readonly DrawBurst[]>>;
}

/** The five card-back flights the board sends between a deck, a hand and a shield. */
export function cueFlights(deps: CueFlightsDeps) {
  const {
    queue,
    anchors,
    viewerSeat,
    causingEffectGateRef,
    securityGainKeyRef,
    drawFlightKeyRef,
    setSecurityFlights,
    setSecurityDealCounts,
    setDrawFlights,
    setDrawBursts,
  } = deps;

  /** The card lands on the stack: the same shield bounce a recovery plays. */
  function launchSecurityGainFlight(seat: Seat) {
    const key = (securityGainKeyRef.current += 1);
    const causingEffectGate = causingEffectGateRef.current;
    queue.enqueue({
      id: `security-gain-flight-${seat}-${key}`,
      track: `securityFlight-${seat}`,
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "securityGainFlight/causingEffect");
        if (context.cancelled) return;
        try {
          setSecurityFlights((seats) => new Set(seats).add(seat));
          await context.wait(TIMINGS.securityFlight);
        } finally {
          setSecurityFlights((seats) => {
            if (!seats.has(seat)) return seats;
            const next = new Set(seats);
            next.delete(seat);
            return next;
          });
        }
      },
    });
  }

  /**
   * The opening five cards (Comprehensive Rules §5-2-1-6). The server sets the whole stack
   * in one patch, so the deal is the client's own: one card back flies from the deck to the
   * shield per card, and the shield's figure follows the cards rather than the patch.
   */
  function launchOpeningSecurityDeal(seat: Seat, count: number) {
    setSecurityDealCounts((counts) => new Map(counts).set(seat, 0));
    queue.enqueue({
      id: `security-deal-${seat}`,
      track: `securityDeal-${seat}`,
      replace: true,
      async run(context) {
        try {
          for (let dealt = 0; dealt < count; dealt += 1) {
            if (context.cancelled) return;
            launchDeckToSecurityFlight(seat);
            await context.wait(TIMINGS.securityDealStagger);
            setSecurityDealCounts((counts) => new Map(counts).set(seat, dealt + 1));
          }
          await context.wait(TIMINGS.securityFlight);
        } finally {
          setSecurityDealCounts((counts) => {
            if (!counts.has(seat)) return counts;
            const next = new Map(counts);
            next.delete(seat);
            return next;
          });
        }
      },
    });
  }

  /**
   * Sends a card back from a deck pile to the hand that just grew. The reference
   * client presents a draw centre-screen; the web port keeps the deck→hand read,
   * which is what makes an opponent's draw visible at all.
   *
   * A `card` makes the flight face-up. Only a move that made the card public names one, and
   * that card was usually just held up by a reveal showcase, so the flight queues on the
   * centre-stage track behind it instead of flying into the hand while the reveal is still
   * being read.
   */
  function launchDrawFlight(side: Side, turnStart = false, waitBeforeMs = 0, card?: DrawFlightCard) {
    // A turn's own draw is not the consequence of any clause; every other draw is.
    const causingEffectGate = turnStart ? null : causingEffectGateRef.current;
    const board = anchors.board.current;
    const source = side === Side.Viewer ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = side === Side.Viewer ? anchors.yourHandDock.current : anchors.oppHandStrip.current;
    if (!board || !source || !target) return;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Layout-free environments (jsdom) report zero boxes: no geometry, no flight,
    // and so no step is ever enqueued there.
    if (!sourceRect.width || !targetRect.width) return;
    const from = {
      x: sourceRect.left + sourceRect.width / 2 - boardRect.left,
      y: sourceRect.top + sourceRect.height / 2 - boardRect.top,
    };
    const to = {
      x: targetRect.left + targetRect.width / 2 - boardRect.left,
      y: targetRect.top + targetRect.height / 2 - boardRect.top,
    };
    const key = (drawFlightKeyRef.current += 1);
    // The card back is hand-card sized on a phone; at 340ms that size crosses a
    // 393px screen too fast to register, so the touch layouts get a longer trip.
    // The element animates on this same number, set inline by GameScreen, so the
    // unmount below can never cut the flight short.
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    const flight: DrawFlight = {
      key,
      x: from.x,
      y: from.y,
      dx: to.x - from.x,
      dy: to.y - from.y,
      duration,
      ...(card ? { card } : {}),
    };
    // Two hands can grow at once, so each card back gets a track of its own rather
    // than queueing behind the other side's.
    queue.enqueue({
      id: `draw-flight-${key}`,
      side,
      track: card ? CueTrack.CenterStage : `${turnStart ? "turnDrawFlight" : "drawFlight"}-${key}`,
      async run(context) {
        await Promise.all([
          waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "drawFlight/causingEffect"),
          waitBeforeMs > 0 ? context.wait(waitBeforeMs) : Promise.resolve(),
        ]);
        if (context.cancelled) return;
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
        // Only the draw the turn opens with gets the starburst: an effect draw is
        // already narrated by its own notice, and two cues would read as two draws.
        if (!turnStart || context.mode !== "live" || context.cancelled) return;
        setDrawBursts((bursts) => [...bursts, { key, x: to.x, y: to.y }]);
        await context.wait(TIMINGS.drawBurst);
        setDrawBursts((bursts) => bursts.filter((candidate) => candidate.key !== key));
      },
    });
  }

  /** One card back from a seat's deck onto its security shield. */
  function launchDeckToSecurityFlight(seat: Seat) {
    const board = anchors.board.current;
    const source = seat === viewerSeat ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = seat === viewerSeat ? anchors.yourSecurity.current : anchors.oppSecurity.current;
    if (!board || !source || !target) return;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Layout-free environments (jsdom) report zero boxes: no geometry, no flight.
    if (!sourceRect.width || !targetRect.width) return;
    const x = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    const key = (drawFlightKeyRef.current += 1);
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    const flight: DrawFlight = {
      key,
      x,
      y,
      dx: targetRect.left + targetRect.width / 2 - boardRect.left - x,
      dy: targetRect.top + targetRect.height / 2 - boardRect.top - y,
      duration,
    };
    // Each card of the deal is its own track: they overlap on purpose, so the stack is
    // built by a run of cards rather than by one card played five times.
    queue.enqueue({
      id: `security-deal-flight-${key}`,
      track: `securityDealFlight-${key}`,
      async run(context) {
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
      },
    });
  }

  function launchDeckToUnderFlight(seat: Seat, permanentId: string) {
    const board = anchors.board.current;
    const source = seat === viewerSeat ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = anchors.permanentCenter?.(permanentId);
    if (!board || !source || !target) return;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    if (!sourceRect.width) return;
    const x = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    const key = ++drawFlightKeyRef.current;
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    const flight: DrawFlight = { key, x, y, dx: target.x - x, dy: target.y - y, duration };
    const causingEffectGate = causingEffectGateRef.current;
    queue.enqueue({
      id: `deck-under-flight-${key}`,
      track: `deckUnder-${permanentId}`,
      async run(context) {
        await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS, "deckUnderFlight/causingEffect");
        if (context.cancelled) return;
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
      },
    });
  }

  /**
   * A face-up card leaving a board element (a docked Option) for a permanent's digivolution
   * cards. Runs inside the caller's step so whatever follows waits for the landing; false
   * when there is no geometry to fly between.
   */
  async function flyCardUnder(
    card: DrawFlightCard,
    from: Element,
    permanentId: string,
    context: AnimationStepContext,
  ): Promise<boolean> {
    const board = anchors.board.current;
    const target = anchors.permanentCenter?.(permanentId);
    if (!board || !target || context.mode !== "live") return false;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = from.getBoundingClientRect();
    if (!sourceRect.width) return false;
    const x = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    const key = ++drawFlightKeyRef.current;
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    setDrawFlights((flights) => [...flights, { key, x, y, dx: target.x - x, dy: target.y - y, duration, card }]);
    try {
      await context.wait(duration);
    } finally {
      setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
    }
    return true;
  }

  /**
   * A face-up card leaving the field for its owner's deck, from where it stood. `from` is
   * measured by the caller before it lets go of the card, since the board drops it then.
   * Runs inside the caller's step; false when there is no geometry to fly between.
   */
  async function flyCardToDeck(
    card: DrawFlightCard,
    from: { x: number; y: number },
    seat: Seat,
    context: AnimationStepContext,
  ): Promise<boolean> {
    const board = anchors.board.current;
    const deck = seat === viewerSeat ? anchors.yourDeck.current : anchors.oppDeck.current;
    if (!board || !deck || context.mode !== "live") return false;
    const boardRect = board.getBoundingClientRect();
    const deckRect = deck.getBoundingClientRect();
    if (!deckRect.width) return false;
    const to = {
      x: deckRect.left + deckRect.width / 2 - boardRect.left,
      y: deckRect.top + deckRect.height / 2 - boardRect.top,
    };
    const key = ++drawFlightKeyRef.current;
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    setDrawFlights((flights) => [
      ...flights,
      { key, x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, duration, card },
    ]);
    try {
      await context.wait(duration);
    } finally {
      setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
    }
    return true;
  }

  /**
   * An accepted public play, never an optimistic drag. The server's origin names the
   * source zone; the destination remains hidden until this flight lands. An opponent's
   * reveal hands the card to the flight from centre stage instead of flashing it away.
   */
  const flyPlayedCard: FlyPlayedCard = async (event, context, fromShowcase) => {
    const board = anchors.board.current;
    if (!board || !event.permanentId || context.mode !== "live" || context.cancelled) return false;
    const boardRect = board.getBoundingClientRect();
    if (!boardRect.width) return false;
    // A cache can still describe a different presented board or an old row slot.
    // The pending card keeps its layout box, so measure its printed art directly.
    // A hold may release before React commits that destination; allow up to eight
    // frames for that commit, then let the caller reveal the card without travel.
    const destinationRect = () => {
      const permanent = [...board.querySelectorAll<HTMLElement>("[data-id]")].find(
        (element) => element.isConnected && element.dataset.id === event.permanentId,
      );
      const rect = permanent ? permanentVisualElement(permanent).getBoundingClientRect() : undefined;
      return rect?.width && rect.height ? rect : undefined;
    };
    let targetRect = destinationRect();
    for (let frame = 0; !targetRect && frame < 8; frame += 1) {
      if (context.cancelled || context.skipping || context.mode !== "live") return false;
      await context.wait(16);
      targetRect = destinationRect();
    }
    if (!targetRect || context.cancelled || context.skipping || context.mode !== "live") return false;
    const target = {
      x: targetRect.left + targetRect.width / 2 - boardRect.left,
      y: targetRect.top + targetRect.height / 2 - boardRect.top,
    };
    const source = playedCardSource(event, anchors, viewerSeat);
    const sourceRect = fromShowcase ?? source?.getBoundingClientRect();
    // Opponent cards are already public at the reveal; none of their hand is inspected.
    if (!sourceRect?.width) return false;
    const x = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    const key = ++drawFlightKeyRef.current;
    const duration = isTouchLayout() ? TIMINGS.playFlightTouch : TIMINGS.playFlight;
    const flight: DrawFlight = {
      key,
      kind: "play",
      targetPermanentId: event.permanentId,
      x,
      y,
      dx: target.x - x,
      dy: target.y - y,
      duration,
      card: { cardId: event.cardId, ...(event.artId ? { artId: event.artId } : {}) },
      fromWidth: fromShowcase ? fromShowcase.width : Math.min(sourceRect.width, 100),
      toWidth: targetRect.width,
    };
    setDrawFlights((flights) => [...flights, flight]);
    try {
      await context.wait(duration);
    } finally {
      setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
    }
    return true;
  };

  return {
    flyCardUnder,
    flyCardToDeck,
    flyPlayedCard,
    launchSecurityGainFlight,
    launchOpeningSecurityDeal,
    launchDrawFlight,
    launchDeckToSecurityFlight,
    launchDeckToUnderFlight,
  };
}

/** Only geometry is read; the face always comes from the accepted public event. */
export function playedCardSource(
  event: Extract<ServerEvent, { kind: "cardPlayed" }>,
  anchors: MatchCueAnchors,
  viewerSeat: Seat,
): Element | null {
  const mine = event.seat === viewerSeat;
  const board = anchors.board.current;
  const sourceZone = "fromZone" in event ? event.fromZone : undefined;
  if (sourceZone === "trash")
    return board?.querySelector(mine ? ".game-utility-slot--you-trash" : ".game-utility-slot--opp-trash") ?? null;
  if (sourceZone === "deck") return mine ? anchors.yourDeck.current : anchors.oppDeck.current;
  if (sourceZone === "security") {
    const side = mine ? "you" : "opp";
    const dock = document.querySelector(
      `.battle-security-branch[data-source='security'][data-side='${side}'] .battle-security-branch__frame > div`,
    );
    return dock ?? (mine ? anchors.yourSecurity.current : anchors.oppSecurity.current);
  }
  if (sourceZone === "resolvingOption")
    return document.querySelector(".battle-security-branch[data-source='option'] .battle-security-branch__frame > div");
  if (sourceZone === "stack" || sourceZone === "digivolutionCards") {
    const hostId = "fromPermanentId" in event ? event.fromPermanentId : undefined;
    return hostId
      ? ([...(board?.querySelectorAll<HTMLElement>("[data-id]") ?? [])].find(
          (element) => element.dataset.id === hostId,
        ) ?? null)
      : null;
  }
  if (sourceZone !== undefined && sourceZone !== "hand") return null;
  return mine ? anchors.yourHandDock.current : anchors.oppHandStrip.current;
}
