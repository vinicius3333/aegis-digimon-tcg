// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { ServerEvent } from "@aegis/shared";
import { createAnimationQueue } from "./animationQueue";
import { cueFlights, playedCardSource } from "./match/flights";
import type { DrawFlight, MatchCueAnchors } from "./match/types";
import { zoneChangeStep } from "./match/steps/zoneChangeStep";
import type { PermanentBurst, ZoneShowcase } from "./showcases";
import { SHOWCASE_TOTAL_MS, TIMINGS } from "./timings";
import { createPresentationGate, type PresentationGate } from "./match/presentationGate";

function stateCell<T>(initial: T) {
  let current = initial;
  const set: Dispatch<SetStateAction<T>> = (next) => {
    current = typeof next === "function" ? (next as (value: T) => T)(current) : next;
  };
  return { get: () => current, set };
}

function element(left: number, top: number, width: number, height: number) {
  const node = document.createElement("div");
  node.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {},
  });
  return node;
}

function fixture(mode: "live" | "drain" = "live", options?: { opponent?: boolean; gate?: PresentationGate }) {
  const board = element(20, 10, 1000, 800);
  const hand = element(200, 710, 600, 100);
  const opponentHand = element(200, 20, 600, 60);
  const destination = element(476, 398, 88, 124);
  destination.dataset.id = "p";
  board.append(destination);
  document.body.append(board);
  const anchors: MatchCueAnchors = {
    board: { current: board },
    yourHandDock: { current: hand },
    oppHandStrip: { current: opponentHand },
    yourDeck: { current: element(900, 650, 60, 84) },
    oppDeck: { current: element(50, 150, 60, 84) },
    yourSecurity: { current: element(50, 650, 60, 84) },
    oppSecurity: { current: element(900, 150, 60, 84) },
    permanentCenter: () => ({ x: 500, y: 450 }),
  };
  const flights = stateCell<readonly DrawFlight[]>([]);
  const pending = stateCell<ReadonlySet<string>>(new Set(["p"]));
  const bursts = stateCell<ReadonlyMap<string, PermanentBurst>>(new Map());
  const showcase = stateCell<ZoneShowcase | null>(null);
  const queue = createAnimationQueue({ mode });
  const { flyPlayedCard } = cueFlights({
    queue,
    anchors,
    viewerSeat: 0,
    causingEffectGateRef: { current: null },
    securityGainKeyRef: { current: 0 },
    drawFlightKeyRef: { current: 0 },
    setDrawFlights: flights.set,
    setDrawBursts: () => {},
    setSecurityFlights: () => {},
    setSecurityDealCounts: () => {},
  });
  const event: Extract<ServerEvent, { kind: "cardPlayed" }> = {
    kind: "cardPlayed",
    seat: options?.opponent ? 1 : 0,
    cardId: "BT1-010",
    permanentId: "p",
    artId: "alternate",
  };
  queue.enqueue(
    zoneChangeStep({
      queue,
      presentationBatchRef: { current: { batchId: "accepted", stateVersion: 2 } },
      enqueuePhaseOrderRef: { current: 1 },
      setPendingPermanentIds: pending.set,
      setPermanentBursts: bursts.set,
      setZoneShowcase: showcase.set,
      key: 1,
      showcase: options?.opponent ? { key: 1, cardId: "BT1-010", seat: 1, kind: "play", color: "Red" } : null,
      ...(options?.gate ? { waitFor: options.gate } : {}),
      burst: { key: 1, permanentId: "p", variant: "play", color: "Red", inBreeding: false },
      play: { event, fly: flyPlayedCard },
    }),
  );
  return { board, destination, anchors, flights, pending, bursts, showcase, queue };
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false }) });
});
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("confirmed play arrival", () => {
  it("lands on the exact printed card among multiple slots despite a stale cached center", async () => {
    const run = fixture();
    run.anchors.permanentCenter = () => ({ x: 100, y: 100 });
    const other = element(100, 100, 100, 140);
    other.dataset.id = "other";
    run.board.prepend(other);
    const entered = document.createElement("div");
    entered.className = "game-card-enter";
    const art = element(720, 430, 116, 162);
    art.dataset.state = "upright";
    entered.append(art);
    run.destination.append(entered);
    await vi.advanceTimersByTimeAsync(0);
    const [flight] = run.flights.get();
    expect(flight).toMatchObject({ targetPermanentId: "p", toWidth: 116 });
    expect(flight!.x + flight!.dx).toBe(758);
    expect(flight!.y + flight!.dy).toBe(501);
    expect(run.pending.get().has("p")).toBe(true);
    await vi.advanceTimersByTimeAsync(TIMINGS.playFlight);
    expect(run.pending.get().size).toBe(0);
    expect(run.bursts.get().has("p")).toBe(true);
    run.queue.clear();
  });

  it("waits for the exact destination to mount without flying to an existing row slot", async () => {
    const run = fixture();
    run.destination.remove();
    const row = element(100, 300, 600, 140);
    row.className = "game-battle-row--you";
    run.board.append(row);
    await vi.advanceTimersByTimeAsync(48);
    expect(run.flights.get()).toHaveLength(0);
    expect(run.pending.get().has("p")).toBe(true);
    run.board.append(run.destination);
    await vi.advanceTimersByTimeAsync(16);
    expect(run.flights.get()).toMatchObject([{ targetPermanentId: "p", dx: 20, dy: -300 }]);
    run.queue.clear();
  });

  it("releases the field hold without fabricated travel when the destination stays unavailable", async () => {
    const run = fixture();
    run.destination.remove();
    const row = element(100, 300, 600, 140);
    row.className = "game-battle-row--you";
    run.board.append(row);
    await vi.advanceTimersByTimeAsync(128);
    expect(run.flights.get()).toHaveLength(0);
    expect(run.pending.get().size).toBe(0);
    expect(run.bursts.get().has("p")).toBe(true);
    run.queue.clear();
  });

  it("flies public art from the hand and keeps the field empty until the landing", async () => {
    const run = fixture();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.flights.get()).toMatchObject([
      {
        kind: "play",
        targetPermanentId: "p",
        card: { cardId: "BT1-010", artId: "alternate" },
        x: 480,
        y: 750,
        dx: 20,
        dy: -300,
      },
    ]);
    expect(run.pending.get().has("p")).toBe(true);
    expect(run.bursts.get().size).toBe(0);
    await vi.advanceTimersByTimeAsync(TIMINGS.playFlight - 1);
    expect(run.pending.get().has("p")).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.flights.get()).toHaveLength(0);
    expect(run.pending.get().has("p")).toBe(false);
    expect(run.bursts.get().get("p")?.variant).toBe("play");
    run.queue.clear();
  });

  it("a cancelled flight releases the hidden destination and clears its art", async () => {
    const run = fixture();
    await vi.advanceTimersByTimeAsync(0);
    run.queue.clear();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.flights.get()).toHaveLength(0);
    expect(run.pending.get().size).toBe(0);
    expect(run.bursts.get().size).toBe(0);
  });

  it("transfers an opponent's readable showcase from its actual rectangle into the field", async () => {
    const art = element(420, 280, 190, 266);
    art.className = "battle-showcase__art";
    document.body.append(art);
    const run = fixture("live", { opponent: true });
    await vi.advanceTimersByTimeAsync(SHOWCASE_TOTAL_MS - 1);
    expect(run.showcase.get()?.departToField).toBe(true);
    expect(run.flights.get()).toHaveLength(0);
    expect(run.pending.get().has("p")).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.showcase.get()).toBeNull();
    expect(run.flights.get()).toMatchObject([{ kind: "play", x: 495, y: 403, dx: 5, dy: 47, fromWidth: 190 }]);
    expect(run.bursts.get().size).toBe(0);
    await vi.advanceTimersByTimeAsync(TIMINGS.playFlight);
    expect(run.pending.get().size).toBe(0);
    expect(run.bursts.get().has("p")).toBe(true);
    run.queue.clear();
  });

  it("keeps an effect's result behind its accepted announcement gate", async () => {
    const gate = createPresentationGate();
    const run = fixture("live", { gate });
    await vi.advanceTimersByTimeAsync(200);
    expect(run.flights.get()).toHaveLength(0);
    expect(run.bursts.get().size).toBe(0);
    expect(run.pending.get().has("p")).toBe(true);
    gate.release();
    await vi.advanceTimersByTimeAsync(20);
    expect(run.flights.get()).toHaveLength(1);
    expect(run.pending.get().has("p")).toBe(true);
    run.queue.clear();
  });

  it("reduced motion reveals the accepted field without travel or a stranded hold", async () => {
    const run = fixture("drain");
    await run.queue.idle();
    expect(run.flights.get()).toHaveLength(0);
    expect(run.pending.get().size).toBe(0);
    expect(run.bursts.get().size).toBe(0);
  });

  it("uses the confirmed trash origin and never substitutes an unknown zone with a hand", () => {
    const run = fixture("drain");
    const trash = element(900, 650, 60, 84);
    trash.className = "game-utility-slot--opp-trash";
    run.board.append(trash);
    const event = { kind: "cardPlayed", seat: 1, cardId: "BT1-010", permanentId: "p", fromZone: "trash" } as Extract<
      ServerEvent,
      { kind: "cardPlayed" }
    >;
    expect(playedCardSource(event, run.anchors, 0)).toBe(trash);
    expect(playedCardSource({ ...event, seat: 0 } as typeof event, run.anchors, 0)).toBeNull();
  });

  it("uses the authoritative digivolution-card origin's exact host", () => {
    const run = fixture("drain");
    const host = element(300, 400, 116, 162);
    host.dataset.id = "host";
    run.board.append(host);
    const event: Extract<ServerEvent, { kind: "cardPlayed" }> = {
      kind: "cardPlayed",
      seat: 0,
      cardId: "BT1-010",
      permanentId: "p",
      fromZone: "digivolutionCards",
      fromPermanentId: "host",
    };
    expect(playedCardSource(event, run.anchors, 0)).toBe(host);
    expect(playedCardSource({ ...event, fromPermanentId: "absent" }, run.anchors, 0)).toBeNull();
  });
});
