// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  Permanent,
  Phase,
  PlayerState,
  getCardDefinition,
  type ServerEvent,
} from "@aegis/shared";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { DEFAULT_PACING, activePacing, setBasePacing } from "./pacing";

vi.mock("../design/sound", () => ({
  playSound: vi.fn<(kind: string) => void>(),
  startMusic: vi.fn<() => void>(),
  stopMusic: vi.fn<() => void>(),
}));

const SOURCES = [
  { permanentId: "first", cardId: "BT12-021" },
  { permanentId: "second", cardId: "BT5-091" },
] as const;

function card(instanceId: string, cardId: string) {
  const value = new CardInstance();
  value.instanceId = instanceId;
  value.cardId = cardId;
  return value;
}

function boardWithSources() {
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.turnCount = 5;
  state.memory = 3;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.displayName = seat === 0 ? "You" : "Rival";
    player.deckCount = 30;
    player.securityCount = seat === 0 ? 3 : 0;
    state.players.push(player);
  }
  for (const { permanentId, cardId } of SOURCES) {
    const source = new Permanent();
    source.permanentId = permanentId;
    source.controllerSeat = 0;
    source.topCard = card(`${permanentId}-card`, cardId);
    source.stack.push(source.topCard);
    state.players[0]!.battleArea.push(source);
  }
  return state;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  setBasePacing(DEFAULT_PACING);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
});

it("keeps the result splash behind the effects that resolved before the winning blow", async () => {
  const state = boardWithSources();
  const snapshots: StateSnapshot[] = [{ stateVersion: 1, state: snapshotGameState(state) }];
  const batches: ServerBatch[] = [];
  function batch(version: number, events: ServerEvent[]) {
    state.stateVersion = version;
    snapshots.push({ stateVersion: version, state: snapshotGameState(state) });
    batches.push(singleServerBatch(events, version));
  }
  const view = () => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Blue"
        onExit={() => undefined}
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

  let version = 1;
  let memory = state.memory;
  for (const { permanentId, cardId } of SOURCES) {
    const triggered: Extract<ServerEvent, { kind: "effectTriggered" }> = {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: cardId,
      sourceInstanceId: `${permanentId}-card`,
      sourcePermanentId: permanentId,
      effectKey: `${permanentId}/whenAttacking`,
      timing: "WhenAttacking",
      description: "Gain 1 memory.",
    };
    batch(++version, [triggered]);
    state.memory = memory + 1;
    batch(++version, [{ kind: "memoryChanged", from: memory, to: memory + 1, reason: "gainMemory" }]);
    memory += 1;
    batch(++version, [{ ...triggered, kind: "effectResolved" }]);
  }
  state.gameOver = true;
  state.winnerSeat = 0;
  batch(++version, [{ kind: "gameOver", result: { outcome: "win", winnerSeat: 0 }, reason: "security" }]);
  rendered.rerender(view());

  const names = SOURCES.map(({ cardId }) => getCardDefinition(cardId)!.nameEn);
  const firstSeenAt = new Map<string, number>();
  let resultShownAt: number | undefined;
  for (let elapsed = 32; elapsed < 30_000; elapsed += 32) {
    await act(async () => vi.advanceTimersByTimeAsync(32));
    if (document.querySelector(".game-result")) {
      resultShownAt = elapsed;
      break;
    }
    for (const node of document.querySelectorAll(".match-notice__title")) {
      for (const name of names)
        if (node.textContent?.includes(name) && !firstSeenAt.has(name)) firstSeenAt.set(name, elapsed);
    }
  }
  expect([...firstSeenAt.keys()].sort()).toEqual([...names].sort());
  expect(resultShownAt).toBeDefined();
  const lastClauseAt = Math.max(...firstSeenAt.values());
  expect(resultShownAt! - lastClauseAt).toBeGreaterThanOrEqual(activePacing().clauseReadableMs - 32);
});
