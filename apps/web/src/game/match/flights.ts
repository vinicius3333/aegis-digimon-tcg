import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat } from "@aegis/shared";
import type { AnimationQueue } from "../animationQueue";
import { isTouchLayout } from "./environment";
import { TIMINGS } from "../timings";
import type { DrawBurst, DrawFlight, MatchCueAnchors } from "./types";

export interface CueFlightsDeps {
  queue: AnimationQueue;
  anchors: MatchCueAnchors;
  viewerSeat: Seat;
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
    queue.enqueue({
      id: `security-gain-flight-${seat}-${key}`,
      track: `securityFlight-${seat}`,
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
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
   */
  function launchDrawFlight(side: "you" | "opp", turnStart = false, waitBeforeMs = 0) {
    const board = anchors.board.current;
    const source = side === "you" ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = side === "you" ? anchors.yourHandDock.current : anchors.oppHandStrip.current;
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
    const flight: DrawFlight = { key, x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, duration };
    // Two hands can grow at once, so each flight gets a track of its own rather
    // than queueing behind the other side's.
    queue.enqueue({
      id: `draw-flight-${key}`,
      side,
      track: `${turnStart ? "turnDrawFlight" : "drawFlight"}-${key}`,
      async run(context) {
        if (waitBeforeMs > 0) await context.wait(waitBeforeMs);
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
    queue.enqueue({
      id: `deck-under-flight-${key}`,
      track: `deckUnder-${permanentId}`,
      async run(context) {
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
      },
    });
  }

  return {
    launchSecurityGainFlight,
    launchOpeningSecurityDeal,
    launchDrawFlight,
    launchDeckToSecurityFlight,
    launchDeckToUnderFlight,
  };
}
