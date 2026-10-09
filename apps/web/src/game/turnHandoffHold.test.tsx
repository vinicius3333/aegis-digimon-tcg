// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  Permanent,
  Phase,
  PlayerState,
  getCardDefinition,
  type Seat,
  type SequencedServerEvent,
  type ServerEvent,
} from "@aegis/shared";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { DEFAULT_PACING, setBasePacing } from "./pacing";

vi.mock("../design/sound", () => ({
  playSound: vi.fn<(kind: string) => void>(),
  playAttentionSound: vi.fn<(kind: string) => void>(),
  startMusic: vi.fn<() => void>(),
  stopMusic: vi.fn<() => void>(),
}));

const OPPONENT_SOURCE = { permanentId: "rival-source", cardId: "BT5-091" } as const;
const TURN = 4;

function card(instanceId: string, cardId = "ST1-07") {
  const value = new CardInstance();
  value.instanceId = instanceId;
  value.cardId = cardId;
  return value;
}

function opponentMainPhase() {
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = 1;
  state.turnCount = TURN;
  state.memory = -2;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.displayName = seat === 0 ? "You" : "Rival";
    player.deckCount = 30;
    player.securityCount = 5;
    if (seat === 0) player.hand.push(card("kept"));
    player.handCount = 1;
    state.players.push(player);
  }
  const source = new Permanent();
  source.permanentId = OPPONENT_SOURCE.permanentId;
  source.controllerSeat = 1;
  source.topCard = card(`${OPPONENT_SOURCE.permanentId}-card`, OPPONENT_SOURCE.cardId);
  source.stack.push(source.topCard);
  state.players[1]!.battleArea.push(source);
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

/*
 * The server sends a batch's events the moment they happen and closes the batch after its
 * state patch, so a client sees the next turn's raw events and live state before the
 * previous turn's batches are closed. `closeEveryMs` replays that: every raw event and the
 * final live state are known at once, while the batches close one by one.
 */
it.each([0, 48])(
  "#5065 keeps the viewer's turn draw behind the opponent's end-of-turn effect (batches close every %s ms)",
  async (closeEveryMs) => {
    const state = opponentMainPhase();
    const snapshots: StateSnapshot[] = [{ stateVersion: 1, state: snapshotGameState(state) }];
    const pending: ServerBatch[] = [];
    function batch(version: number, events: ServerEvent[]) {
      state.stateVersion = version;
      snapshots.push({ stateVersion: version, state: snapshotGameState(state) });
      pending.push(singleServerBatch(events, version));
    }
    const closed: ServerBatch[] = [];
    let events: SequencedServerEvent[] = [];
    const view = () => (
      <I18nProvider>
        <GameScreen
          joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
          identityColor="Blue"
          onExit={() => undefined}
          presentationPacing="sequential"
          demoConnection={{
            room: undefined,
            status: "connected",
            error: undefined,
            state,
            events,
            batches: [...closed],
            snapshots: snapshots.filter(
              (snapshot) => snapshot.stateVersion <= (closed.at(-1)?.stateVersion ?? 1) || closeEveryMs === 0,
            ),
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

    const phase = (name: Phase, turnSeat: Seat, turnCount: number): ServerEvent => ({
      kind: "phaseChanged",
      phase: name,
      turnSeat,
      turnCount,
    });
    const triggered: Extract<ServerEvent, { kind: "effectTriggered" }> = {
      kind: "effectTriggered",
      seat: 1,
      sourceCardId: OPPONENT_SOURCE.cardId,
      sourceInstanceId: `${OPPONENT_SOURCE.permanentId}-card`,
      sourcePermanentId: OPPONENT_SOURCE.permanentId,
      effectKey: `${OPPONENT_SOURCE.permanentId}/endOfTurn`,
      timing: "EndOfYourTurn",
      description: "Gain 1 memory.",
    };
    state.phase = Phase.End;
    batch(2, [phase(Phase.End, 1, TURN), triggered]);
    state.memory = -1;
    batch(3, [{ kind: "memoryChanged", from: -2, to: -1, reason: "gainMemory" }]);
    batch(4, [{ ...triggered, kind: "effectResolved" }]);
    state.turnSeat = 0;
    state.turnCount = TURN + 1;
    state.memory = 1;
    state.phase = Phase.Active;
    batch(5, [{ kind: "turnEnded", endingSeat: 1, nextSeat: 0, turnCount: TURN }, phase(Phase.Active, 0, TURN)]);
    state.phase = Phase.Draw;
    state.players[0]!.hand.push(card("drawn"));
    state.players[0]!.handCount = 2;
    state.players[0]!.deckCount = 29;
    batch(6, [
      phase(Phase.Draw, 0, TURN + 1),
      { kind: "cardsMoved", instanceIds: ["drawn"], from: "deck", to: "hand", seat: 0 },
    ]);
    state.phase = Phase.Breeding;
    batch(7, [phase(Phase.Breeding, 0, TURN + 1)]);

    events = pending.flatMap((value) => value.events);
    if (closeEveryMs === 0) closed.push(...pending.splice(0));
    rendered.rerender(view());

    const clauseName = getCardDefinition(OPPONENT_SOURCE.cardId)!.nameEn;
    let clauseSeenAt: number | undefined;
    let turnBannerAt: number | undefined;
    let drawnAt: number | undefined;
    for (let elapsed = 16; elapsed < 20_000 && drawnAt === undefined; elapsed += 16) {
      if (closeEveryMs > 0 && pending.length > 0 && elapsed % closeEveryMs === 0) {
        closed.push(pending.shift()!);
        rendered.rerender(view());
      }
      await act(async () => vi.advanceTimersByTimeAsync(16));
      if (
        clauseSeenAt === undefined &&
        [...document.querySelectorAll(".match-notice__title")].some((node) => node.textContent?.includes(clauseName))
      )
        clauseSeenAt = elapsed;
      if (turnBannerAt === undefined && document.querySelector(`[data-turn-key="1:${TURN}"]`)) turnBannerAt = elapsed;
      if (drawnAt === undefined && screen.getByTestId("hand").querySelectorAll(".game-hand-card").length === 2)
        drawnAt = elapsed;
    }
    expect(clauseSeenAt, "the opponent's end-of-turn clause is shown").toBeDefined();
    expect(turnBannerAt, "the turn banner is shown").toBeDefined();
    expect(drawnAt, "the drawn card reaches the hand").toBeDefined();
    expect(turnBannerAt!).toBeGreaterThan(clauseSeenAt!);
    expect(drawnAt!).toBeGreaterThan(turnBannerAt!);
    // The drawn card lands once: it never drops back to the deck and arrives again.
    for (let elapsed = 0; elapsed < 3_000; elapsed += 16) {
      await act(async () => vi.advanceTimersByTimeAsync(16));
      expect(screen.getByTestId("hand").querySelectorAll(".game-hand-card")).toHaveLength(2);
    }
  },
);
