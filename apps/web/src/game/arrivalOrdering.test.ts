// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { CardInstance, GameState, Permanent, PlayerState, type ServerEvent } from "@aegis/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { activePacing, DEFAULT_PACING, PACING_BY_STYLE, setBasePacing } from "./pacing";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

function geometry(): MatchCueAnchors {
  const board = document.createElement("div");
  const pile = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(pile, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
  return {
    board: { current: board },
    permanentCenter: () => ({ x: 120, y: 80 }),
    yourDeck: { current: pile },
    oppDeck: { current: pile },
    yourHandDock: { current: pile },
    oppHandStrip: { current: pile },
    yourSecurity: { current: pile },
    oppSecurity: { current: pile },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  setBasePacing(PACING_BY_STYLE.sequential);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
});

it("focuses every accepted physical source when identical clauses share one announcement", async () => {
  const state = new GameState();
  state.stateVersion = 4;
  const viewer = new PlayerState();
  const opponent = new PlayerState();
  opponent.seat = 1;
  for (const id of ["first", "second"]) {
    const source = new CardInstance();
    source.instanceId = `${id}-card`;
    source.cardId = "BT20-091";
    const permanent = new Permanent();
    permanent.permanentId = id;
    permanent.topCard = source;
    permanent.stack.push(source);
    viewer.battleArea.push(permanent);
  }
  state.players.push(viewer, opponent);
  const triggers = ["first", "second"].map((id): Extract<ServerEvent, { kind: "effectTriggered" }> => ({
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "BT20-091",
    sourceInstanceId: `${id}-card`,
    sourcePermanentId: id,
    effectKey: `${id}/watcher`,
    timing: "YourTurn",
    description: "[Your Turn] By suspending this Tamer, draw 1 card.",
  }));
  const batches = triggers.flatMap((event, index) => [
    singleServerBatch([event], index * 2 + 1),
    singleServerBatch([{ ...event, kind: "effectResolved" }], index * 2 + 2),
  ]);
  const anchors = geometry();
  let resume = () => {};
  const devProbe = {
    onQueue(controls: import("./presentationProbe").PresentationControls) {
      controls.queue.pause();
      resume = () => controls.queue.resume();
    },
  };
  const view = renderHook(
    ({ fed }: { fed: readonly ServerBatch[] }) =>
      useMatchCues({
        state,
        batches: fed,
        viewerSeat: 0,
        anchors,
        mulliganOpen: false,
        onActionRejected: vi.fn<(reason: string) => void>(),
        presentationPacing: "sequential",
        devProbe,
      }),
    { initialProps: { fed: [] as readonly ServerBatch[] } },
  );
  await act(async () => vi.advanceTimersByTimeAsync(0));
  view.rerender({ fed: batches });
  act(() => resume());
  const focused = new Set<string>();
  for (let elapsed = 0; elapsed <= 1200; elapsed += 16) {
    for (const source of view.result.current.effectSources)
      if (source.site.zone === "field") focused.add(source.site.permanentId);
    await act(async () => vi.advanceTimersByTimeAsync(16));
  }
  expect([...focused].sort()).toEqual(["first", "second"]);
  const clauses = [...view.result.current.narration.values()].filter((item) => item.notice?.body.variant === "effect");
  expect(clauses).toHaveLength(1);
  expect(clauses[0]!.notice!.body).toMatchObject({ count: 2 });
});

it.each(["sequential", "current"] as const)(
  "%s reads On Play after its play lands without waiting for the self-evolution that clause causes",
  async (presentationPacing) => {
    const state = new GameState();
    state.stateVersion = 4;
    const viewer = new PlayerState();
    const opponent = new PlayerState();
    opponent.seat = 1;
    const source = new CardInstance();
    source.instanceId = "source";
    source.cardId = "BT1-010";
    const evolution = new CardInstance();
    evolution.instanceId = "evolution";
    evolution.cardId = "BT1-011";
    const permanent = new Permanent();
    permanent.permanentId = "self";
    permanent.topCard = evolution;
    permanent.stack.push(source, evolution);
    permanent.currentDP = 5000;
    viewer.battleArea.push(permanent);
    state.players.push(viewer, opponent);
    const trigger: Extract<ServerEvent, { kind: "effectTriggered" }> = {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: source.cardId,
      sourceInstanceId: source.instanceId,
      effectKey: "self/onPlay",
      timing: "onPlay",
      description: "[On Play] This Digimon may digivolve into a Digimon card in your hand without paying the cost.",
    };
    const batches = [
      singleServerBatch(
        [
          {
            kind: "cardPlayed",
            seat: 0,
            cardId: source.cardId,
            instanceId: source.instanceId,
            permanentId: "self",
            fromZone: "hand",
          },
        ],
        1,
      ),
      singleServerBatch([trigger], 2),
      singleServerBatch(
        [{ kind: "digivolved", seat: 0, cardId: evolution.cardId, permanentId: "self", mechanic: "normal" }],
        3,
      ),
      singleServerBatch([{ ...trigger, kind: "effectResolved" }], 4),
    ];
    const anchors = geometry();
    const view = renderHook(
      ({ fed }: { fed: readonly ServerBatch[] }) =>
        useMatchCues({
          state,
          batches: fed,
          viewerSeat: 0,
          anchors,
          mulliganOpen: false,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing,
        }),
      { initialProps: { fed: [] as readonly ServerBatch[] } },
    );
    await act(async () => vi.advanceTimersByTimeAsync(0));
    view.rerender({ fed: batches });
    let playedLandingAt: number | undefined;
    let clauseAt: number | undefined;
    let evolutionAt: number | undefined;
    for (let elapsed = 0; elapsed <= 8000; elapsed += 16) {
      const current = view.result.current;
      const burst = current.permanentBursts.get("self");
      if (burst?.variant === "play") playedLandingAt ??= elapsed;
      if (burst?.variant === "evolve") evolutionAt ??= elapsed;
      if (
        current.notices.some(
          (notice) =>
            notice.body.variant === "effect" &&
            notice.body.cardId === trigger.sourceCardId &&
            notice.body.timing === "onPlay",
        )
      )
        clauseAt ??= elapsed;
      await act(async () => vi.advanceTimersByTimeAsync(16));
    }

    expect(playedLandingAt).toBeDefined();
    expect(clauseAt).toBeDefined();
    expect(evolutionAt).toBeDefined();
    expect(clauseAt!).toBeGreaterThan(playedLandingAt!);
    expect(evolutionAt! - clauseAt!).toBeGreaterThanOrEqual(
      presentationPacing === "sequential" ? activePacing().announceMs : 0,
    );
    expect(view.result.current.pendingPermanentIds.size).toBe(0);
  },
);

it("a receipt before a play cannot gate that play behind its own On Play", async () => {
  const state = new GameState();
  state.stateVersion = 1;
  const viewer = new PlayerState();
  const opponent = new PlayerState();
  opponent.seat = 1;
  const card = new CardInstance();
  card.instanceId = "played";
  card.cardId = "BT1-010";
  const permanent = new Permanent();
  permanent.permanentId = "played-permanent";
  permanent.topCard = card;
  permanent.stack.push(card);
  viewer.battleArea.push(permanent);
  state.players.push(viewer, opponent);
  const anchors = geometry();
  const view = renderHook(
    ({ fed }: { fed: readonly ServerBatch[] }) =>
      useMatchCues({
        state,
        batches: fed,
        viewerSeat: 0,
        anchors,
        mulliganOpen: false,
        presentationPacing: "current",
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: { fed: [] as readonly ServerBatch[] } },
  );
  await act(async () => vi.advanceTimersByTimeAsync(0));
  view.rerender({
    fed: [
      singleServerBatch(
        [
          {
            kind: "effectActivated",
            seat: 0,
            sourceCardId: "BT1-010",
            effectKey: "receipt",
            description: "Activation receipt",
            receiptOnly: true,
          },
          { kind: "cardPlayed", seat: 0, cardId: card.cardId, permanentId: permanent.permanentId },
          {
            kind: "effectTriggered",
            seat: 0,
            sourceCardId: card.cardId,
            sourcePermanentId: permanent.permanentId,
            sourceInstanceId: card.instanceId,
            effectKey: "onPlay",
            timing: "OnPlay",
            description: "[On Play] Draw 1.",
          },
        ],
        1,
      ),
    ],
  });
  await act(async () => vi.advanceTimersByTimeAsync(0));
  expect(view.result.current.zoneShowcase?.cardId).toBe(card.cardId);
  await act(async () => vi.advanceTimersByTimeAsync(2200));
  expect(view.result.current.pendingPermanentIds.size).toBe(0);
  expect(
    view.result.current.notices.some(
      (notice) => notice.body.variant === "effect" && notice.body.cardId === card.cardId,
    ),
  ).toBe(true);
});
