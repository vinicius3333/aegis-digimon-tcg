// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  Permanent,
  Phase,
  PlayerState,
  getCardDefinition,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { Hand } from "./piece";
import { DEFAULT_PACING, PACING_BY_STYLE, setBasePacing } from "./pacing";
import type { VisibleBoard } from "./screen/model/visibleBoard";
import { handEntriesOf } from "./screen/model/handEntries";
import { presentedSeats } from "./screen/model/presentedSeats";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

function card(instanceId: string, cardId = "ST1-07") {
  const value = new CardInstance();
  value.instanceId = instanceId;
  value.cardId = cardId;
  value.playableFromHand = true;
  value.projectedPlayCost = 2;
  return value;
}

function stateWithHands() {
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.memory = 5;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.hand.push(card(`kept-${seat}`));
    player.handCount = 1;
    player.deckCount = 30;
    state.players.push(player);
  }
  return state;
}

function seats(
  live: GameState,
  shownState: GameState,
  presentationPacing: "current" | "sequential",
  optimisticPlayedInstanceId?: string,
) {
  return presentedSeats({
    shownState,
    viewer: live.players[0]!,
    opponent: live.players[1]!,
    viewerSeat: 0,
    heldPhaseState: undefined,
    heldBlowState: undefined,
    heldSecurityEffectState: undefined,
    heldDrawState: undefined,
    heldBreedingState: undefined,
    heldDeletions: new Map(),
    heldTrashArrivals: new Map(),
    optimisticPlayedInstanceId,
    presentationPacing,
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  setBasePacing(PACING_BY_STYLE.sequential);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
});

it.each([0, 1] as const)(
  "keeps seat %s's accepted later watcher draw out of the actual hand and HUD until its clause",
  async (drawSeat: Seat) => {
    const state = stateWithHands();
    for (const [seat, id, cardId] of [
      [0, "first", "BT12-021"],
      [drawSeat, "watcher", "BT5-091"],
    ] as const) {
      const source = new Permanent();
      source.permanentId = id;
      source.controllerSeat = seat;
      source.topCard = card(`${id}-card`, cardId);
      source.stack.push(source.topCard);
      state.players[seat]!.battleArea.push(source);
    }
    const snapshots: StateSnapshot[] = [{ stateVersion: 1, state: snapshotGameState(state) }];
    const batches: ServerBatch[] = [];
    function batch(version: number, events: ServerEvent[]) {
      state.stateVersion = version;
      snapshots.push({ stateVersion: version, state: snapshotGameState(state) });
      batches.push(singleServerBatch(events, version));
    }
    function activation(
      source: "first" | "watcher",
      seat: Seat,
      cardId: string,
    ): Extract<ServerEvent, { kind: "effectTriggered" }> {
      return {
        kind: "effectTriggered",
        seat,
        sourceCardId: cardId,
        sourceInstanceId: `${source}-card`,
        sourcePermanentId: source,
        effectKey: `${source}/accepted`,
        timing: "YourTurn",
        description: source === "first" ? "Gain 1 memory." : "Draw 1 card.",
      };
    }
    let probe: VisibleBoard | undefined;
    const onBoard = ({ visible }: { visible: VisibleBoard }) => {
      probe = visible;
    };
    const view = () => (
      <I18nProvider>
        <GameScreen
          joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
          identityColor="Blue"
          onExit={() => undefined}
          presentationPacing="sequential"
          devProbe={{ onBoard }}
          demoConnection={{
            room: undefined,
            status: "connected",
            error: undefined,
            state,
            events: batches.flatMap((value) => value.events),
            batches: [...batches],
            snapshots: [...snapshots],
            decision: undefined,
            acknowledgeDecision: () => undefined,
            sessionId: "session-0",
            roomCode: "",
          }}
        />
      </I18nProvider>
    );
    const rendered = render(view());
    await act(async () => vi.advanceTimersByTimeAsync(0));
    const first = activation("first", 0, "BT12-021");
    const watcher = activation("watcher", drawSeat, "BT5-091");
    batch(2, [first]);
    state.memory = 6;
    batch(3, [{ kind: "memoryChanged", from: 5, to: 6, reason: "gainMemory" }]);
    batch(4, [{ ...first, kind: "effectResolved" }]);
    batch(5, [watcher]);
    state.players[drawSeat]!.hand.push(card("later-draw"));
    state.players[drawSeat]!.handCount = 2;
    state.players[drawSeat]!.deckCount = 29;
    batch(6, [{ kind: "cardsMoved", instanceIds: ["later-draw"], from: "deck", to: "hand", seat: drawSeat }]);
    batch(7, [{ ...watcher, kind: "effectResolved" }]);
    rendered.rerender(view());

    const watcherName = getCardDefinition("BT5-091")!.nameEn;
    let clauseSeen = false;
    const frames: { clauseSeen: boolean; count: number; deck: number; handCards: number; probe: VisibleBoard }[] = [];
    for (let elapsed = 0; elapsed < 10_000; elapsed += 32) {
      await act(async () => vi.advanceTimersByTimeAsync(32));
      clauseSeen ||= [...document.querySelectorAll(".match-notice__title")].some((node) =>
        node.textContent?.includes(watcherName),
      );
      const hud = within(screen.getByRole("group", { name: drawSeat === 0 ? "You" : "Opponent" })).getAllByRole("img");
      const count = Number(hud[1]!.textContent);
      frames.push({
        clauseSeen,
        count,
        deck: Number(hud[2]!.textContent),
        handCards: screen.getByTestId("hand").querySelectorAll(".game-hand-card").length,
        probe: probe!,
      });
      if (count === 2) break;
    }
    expect(clauseSeen).toBe(true);
    const beforeClause = frames.filter((frame) => !frame.clauseSeen);
    expect(beforeClause.length).toBeGreaterThan(0);
    for (const frame of beforeClause) expect(frame).toMatchObject({ count: 1, deck: 30, handCards: 1 });
    for (const frame of frames) {
      expect(frame.probe.players[drawSeat].handCount).toBe(frame.count);
      expect(frame.probe.players[drawSeat].deckCount).toBe(frame.deck);
      expect(frame.handCards).toBe(drawSeat === 0 ? frame.count : 1);
    }
    expect(frames.find((frame) => frame.count === 2)).toMatchObject({ clauseSeen: true, deck: 29 });
  },
);

it("keeps current pacing compatibility while a paced hand uses the snapshot and live legality", () => {
  const live = stateWithHands();
  const before = snapshotGameState(live);
  live.stateVersion = 2;
  live.players[0]!.hand.push(card("new"));
  live.players[0]!.handCount = 2;
  const current = seats(live, before, "current");
  const held = seats(live, before, "sequential");
  const entries = (shown: ReturnType<typeof seats>) =>
    handEntriesOf({
      viewer: live.players[0]!,
      shownHand: shown.shownHand,
      handHeld: shown.handHeld,
      optimisticPlayedInstanceId: undefined,
    });
  expect(entries(current).shownHandEntries.map((value) => value.instanceId)).toEqual(["kept-0", "new"]);
  expect(entries(held).shownHandEntries.map((value) => value.instanceId)).toEqual(["kept-0"]);
  expect(entries(held).handEntries.find((value) => value.instanceId === "new")).toMatchObject({
    playableFromHand: true,
    projectedPlayCost: 2,
  });
  const caughtUp = entries(seats(live, snapshotGameState(live), "sequential"));
  expect(caughtUp.shownHandEntries.find((value) => value.instanceId === "new")).toMatchObject({
    playableFromHand: true,
    projectedPlayCost: 2,
  });
  const onToggle = vi.fn<(instanceId: string) => void>();
  const hand = render(
    <I18nProvider>
      <Hand
        cards={caughtUp.shownHandEntries}
        startDrag={() => undefined}
        selection={{ selectableInstanceIds: ["new"], pickedInstanceIds: [], onToggle }}
      />
    </I18nProvider>,
  );
  fireEvent.keyDown(hand.container.querySelector(".game-hand-card--pickable")!, { key: "Enter" });
  expect(onToggle).toHaveBeenCalledExactlyOnceWith("new");
});

it("immediately hides an optimistic play from snapshot membership and its count after the live card left", () => {
  const live = stateWithHands();
  const before = snapshotGameState(live);
  live.stateVersion = 2;
  live.players[0]!.hand.pop();
  live.players[0]!.handCount = 0;
  const shown = seats(live, before, "sequential", "kept-0");
  expect(shown.shownHandCount).toBe(0);
  expect(
    handEntriesOf({
      viewer: live.players[0]!,
      shownHand: shown.shownHand,
      handHeld: shown.handHeld,
      optimisticPlayedInstanceId: "kept-0",
    }).shownHandEntries,
  ).toEqual([]);
});

it("keeps the actual DP printed on a field card behind an accepted later clause, even without a DP event", async () => {
  const state = stateWithHands();
  for (const [id, cardId] of [
    ["first", "BT12-021"],
    ["watcher", "ST15-14"],
    ["target", "BT1-009"],
  ] as const) {
    const source = new Permanent();
    source.permanentId = id;
    source.controllerSeat = 0;
    source.topCard = card(`${id}-card`, cardId);
    source.stack.push(source.topCard);
    source.baseDP = id === "target" ? 3000 : 0;
    source.currentDP = source.baseDP;
    state.players[0]!.battleArea.push(source);
  }
  const target = state.players[0]!.battleArea.find((value) => value.permanentId === "target")!;
  const before = snapshotGameState(state);
  let batches: ServerBatch[] = [];
  let snapshots: StateSnapshot[] = [{ stateVersion: 1, state: before }];
  let probe: VisibleBoard | undefined;
  const view = () => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Blue"
        onExit={() => undefined}
        presentationPacing="sequential"
        devProbe={{
          onBoard: ({ visible }) => {
            probe = visible;
          },
        }}
        demoConnection={{
          room: undefined,
          status: "connected",
          error: undefined,
          state,
          events: batches.flatMap((value) => value.events),
          batches,
          snapshots,
          decision: undefined,
          acknowledgeDecision: () => undefined,
          sessionId: "session-0",
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view());
  await act(async () => vi.advanceTimersByTimeAsync(0));
  const first: Extract<ServerEvent, { kind: "effectTriggered" }> = {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "BT12-021",
    sourceInstanceId: "first-card",
    sourcePermanentId: "first",
    effectKey: "first",
    timing: "YourTurn",
    description: "Resolve the earlier effect.",
  };
  const watcher: Extract<ServerEvent, { kind: "effectTriggered" }> = {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "ST15-14",
    sourceInstanceId: "watcher-card",
    sourcePermanentId: "watcher",
    effectKey: "watcher",
    timing: "AllTurns",
    description: "1 of your Digimon gets +2000 DP until the end of the turn.",
  };
  const pendingBatches: ServerBatch[] = [];
  const pendingSnapshots: StateSnapshot[] = [{ stateVersion: 1, state: before }];
  for (const [version, event] of [
    [2, first],
    [3, { ...first, kind: "effectResolved" }],
    [4, watcher],
    [5, { ...watcher, kind: "effectResolved" }],
  ] as const) {
    state.stateVersion = version;
    if (version === 5) target.currentDP = 5000;
    pendingBatches.push(singleServerBatch([event], version));
    pendingSnapshots.push({ stateVersion: version, state: snapshotGameState(state) });
  }
  batches = pendingBatches;
  snapshots = pendingSnapshots;
  rendered.rerender(view());

  let clauseSeen = false;
  const watcherName = getCardDefinition("ST15-14")!.nameEn;
  const frames: { clauseSeen: boolean; dp: number; targetText: string }[] = [];
  for (let elapsed = 0; elapsed < 10_000; elapsed += 32) {
    await act(async () => vi.advanceTimersByTimeAsync(32));
    clauseSeen ||= [...document.querySelectorAll(".match-notice__title")].some((node) =>
      node.textContent?.includes(watcherName),
    );
    const dp = probe!.players[0].battleArea.find((value) => value.permanentId === "target")!.currentDP;
    frames.push({
      clauseSeen,
      dp,
      targetText: document.querySelector('[data-drop="perm-you"][data-id="target"]')!.textContent!,
    });
    if (dp === 5000) break;
  }
  const beforeClause = frames.filter((frame) => !frame.clauseSeen);
  expect(beforeClause.length).toBeGreaterThan(0);
  for (const frame of beforeClause) {
    expect(frame.dp).toBe(3000);
    expect(frame.targetText).toContain("3K");
    expect(frame.targetText).not.toContain("5K");
  }
  expect(frames.find((frame) => frame.dp === 5000)).toMatchObject({
    clauseSeen: true,
    targetText: expect.stringContaining("5K"),
  });
});
