// @vitest-environment jsdom
import { CardInstance, GameState, Permanent, Phase, PlayerState } from "@aegis/shared";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { snapshotGameState } from "../net/presentedState";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { useMatchCues } from "./useMatchCues";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it.each([0, 1] as const)("seat %s: an open draw and its hand watcher reserve each card once", (seat) => {
  vi.useFakeTimers();
  const anchor = document.createElement("div");
  vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 140));
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  for (const playerSeat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = playerSeat;
    player.deckCount = 30;
    state.players.push(player);
  }
  const before = snapshotGameState(state);
  let events: ServerBatch["events"] = [];
  const { result, rerender } = renderHook(() =>
    useMatchCues({
      state,
      batches: [],
      phaseEvents: events,
      snapshots: [{ stateVersion: 1, state: before }],
      viewerSeat: 0,
      mulliganOpen: false,
      onActionRejected: () => undefined,
      anchors: {
        board: { current: anchor },
        yourDeck: { current: anchor },
        oppDeck: { current: anchor },
        yourHandDock: { current: anchor },
        oppHandStrip: { current: anchor },
        yourSecurity: { current: null },
        oppSecurity: { current: null },
      },
    }),
  );
  const card = new CardInstance();
  card.instanceId = "ordinary-draw";
  card.cardId = "ST1-03";
  if (seat === 0) state.players[seat]!.hand.push(card);
  state.players[seat]!.handCount = 1;
  state.players[seat]!.deckCount = 29;
  state.stateVersion = 2;
  events = singleServerBatch(
    [{ kind: "cardsMoved", seat, from: "deck", to: "hand", instanceIds: [card.instanceId] }],
    2,
  ).events;
  events[0]!.stateVersion = 1;
  rerender();
  expect([...result.current.heldHandArrivals.values()].filter((hold) => hold.seat === seat)).toHaveLength(1);
  const second = new CardInstance();
  second.instanceId = "second-draw";
  second.cardId = "ST1-03";
  if (seat === 0) state.players[seat]!.hand.push(second);
  state.players[seat]!.handCount = 2;
  state.players[seat]!.deckCount = 28;
  events = singleServerBatch(
    [
      { kind: "cardsMoved", seat, from: "deck", to: "hand", instanceIds: [card.instanceId] },
      { kind: "cardsMoved", seat, from: "deck", to: "hand", instanceIds: [second.instanceId] },
    ],
    2,
  ).events;
  events.forEach((event) => {
    event.stateVersion = 1;
  });
  rerender();
  expect([...result.current.heldHandArrivals.values()].filter((hold) => hold.seat === seat)).toHaveLength(2);
});

it.each(
  (["current", "sequential"] as const).flatMap((presentationPacing) =>
    ([0, 1] as const).flatMap((seat) =>
      (seat === 0 ? [false, true] : [false]).map((patchFirst) => ({ presentationPacing, seat, patchFirst })),
    ),
  ),
)(
  "$presentationPacing, seat $seat, patch first $patchFirst: a bonus draw never flashes before its batch closes or its presentation lands",
  async ({ presentationPacing, seat, patchFirst }) => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return this.closest(".game-card-enter") ? new DOMRect() : new DOMRect(0, 0, 100, 140);
    });
    const state = new GameState();
    state.stateVersion = 1;
    state.phase = Phase.Main;
    state.memory = 5;
    for (const playerSeat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = playerSeat;
      player.sessionId = `session-${playerSeat}`;
      player.deckCount = 30;
      state.players.push(player);
    }
    const evolution = new CardInstance();
    evolution.instanceId = "evolution";
    evolution.cardId = "ST1-07";
    state.players[seat]!.hand.push(evolution);
    state.players[seat]!.handCount = 1;
    const permanent = new Permanent();
    permanent.permanentId = "evolving";
    permanent.controllerSeat = seat;
    permanent.topCard = new CardInstance();
    permanent.topCard.cardId = "ST1-03";
    permanent.topCard.instanceId = "rookie";
    permanent.stack.push(permanent.topCard);
    state.players[seat]!.battleArea.push(permanent);
    const before = snapshotGameState(state);
    const batch = singleServerBatch(
      [
        { kind: "digivolved", seat, permanentId: "evolving", cardId: evolution.cardId, mechanic: "normal" },
        { kind: "cardsMoved", from: "deck", to: "hand", seat, instanceIds: ["bonus"], drawReason: "digivolution" },
      ],
      2,
    );
    // Real room events are stamped before closing the batch increments its version.
    batch.events.forEach((event) => {
      event.stateVersion = 1;
    });
    const history = singleServerBatch(
      [{ kind: "cardsMoved", from: "deck", to: "hand", seat, instanceIds: ["bonus"], handAddition: "staging" }],
      1,
    );
    let batches: readonly ServerBatch[] = [history];
    let events: typeof batch.events = history.events;
    const view = () => (
      <I18nProvider>
        <GameScreen
          joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
          identityColor="Red"
          onExit={() => undefined}
          presentationPacing={presentationPacing}
          demoConnection={{
            room: undefined,
            status: "connected",
            error: undefined,
            decision: undefined,
            state,
            events: [...events],
            batches,
            snapshots: [
              { stateVersion: 1, state: before },
              { stateVersion: 2, state: snapshotGameState(state) },
            ],
            acknowledgeDecision: () => undefined,
            sessionId: "session-0",
            roomCode: "",
          }}
        />
      </I18nProvider>
    );
    const rendered = render(view());
    const bonusVisible = () =>
      seat === 0
        ? !!screen.getByTestId("hand").querySelector('[data-hand-instance-id="bonus"]')
        : document.querySelector("[data-hand-count]")?.getAttribute("data-hand-count") === "1";
    events = [...history.events, ...batch.events];
    rendered.rerender(view());
    // Receiving an opaque draw before its patch must not reduce the existing count.
    expect(
      seat === 0
        ? screen.getByTestId("hand").querySelectorAll(".game-hand-card").length
        : Number(document.querySelector("[data-hand-count]")?.getAttribute("data-hand-count")),
    ).toBe(1);
    state.players[seat]!.hand.pop();
    permanent.stack.push(evolution);
    permanent.topCard = evolution;
    const bonus = new CardInstance();
    bonus.instanceId = "bonus";
    bonus.cardId = "ST1-09";
    if (seat === 0) state.players[seat]!.hand.push(bonus);
    state.players[seat]!.deckCount = 29;
    // Colyseus can publish hand/deck fields before the batch's version increment.
    state.stateVersion = patchFirst ? 1 : 2;
    events = patchFirst ? history.events : [...history.events, ...batch.events];
    rendered.rerender(view());
    expect(bonusVisible()).toBe(false);
    events = [...history.events, ...batch.events];
    rendered.rerender(view());
    await act(async () => vi.advanceTimersByTimeAsync(50));
    expect(bonusVisible()).toBe(false);
    state.stateVersion = 2;
    batches = [history, batch];
    rendered.rerender(view());
    expect(bonusVisible()).toBe(false);
    let appeared = false;
    for (let elapsed = 0; elapsed < 6000; elapsed += 16) {
      await act(async () => vi.advanceTimersByTimeAsync(16));
      expect(appeared && !bonusVisible()).toBe(false);
      appeared ||= bonusVisible();
    }
    expect(appeared).toBe(true);
  },
);
