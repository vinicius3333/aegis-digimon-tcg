// @vitest-environment jsdom
import {
  CardInstance,
  GameState,
  Phase,
  PlayerState,
  Permanent,
  type ServerEvent,
  type SequencedServerEvent,
} from "@aegis/shared";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import type { AegisRoom } from "../net/client";
import { snapshotGameState } from "../net/presentedState";
import type { ServerBatch } from "../net/serverBatches";
import { GameScreen } from "./GameScreen";
import { TIMINGS } from "./timings";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each(["deck", "trash"])(
  "shows cards added from %s while earlier effect narration is still being presented",
  async (from) => {
    vi.useFakeTimers();
    const state = new GameState();
    state.phase = Phase.Main;
    state.turnSeat = 0;
    state.stateVersion = 1;
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.sessionId = `session-${seat}`;
      state.players.push(player);
    }
    const source = new Permanent();
    source.permanentId = "source";
    source.controllerSeat = 0;
    source.topCard = new CardInstance();
    source.topCard.instanceId = "source-card";
    source.topCard.cardId = "BT12-021";
    state.players[0]!.battleArea.push(source);
    const before = snapshotGameState(state);
    const room = {
      connection: { isOpen: true },
      send: vi.fn<(type: string, payload: unknown) => void>(),
    } as unknown as AegisRoom;
    const events: SequencedServerEvent[] = [];
    const batches: ServerBatch[] = [];
    function append(batchEvents: ServerEvent[], version: number) {
      const id = `batch-${batches.length}`;
      batches.push({
        id,
        stateVersion: version,
        events: batchEvents.map((event, index) => ({
          ...event,
          seq: events.length + index,
          batch: id,
          stateVersion: version,
        })),
      });
      events.push(...batches.at(-1)!.events);
    }
    const view = () => (
      <I18nProvider>
        <GameScreen
          joinOptions={{ displayName: "You", deck: { mainDeck: [], eggDeck: [] } }}
          identityColor="Blue"
          onExit={() => undefined}
          demoConnection={{
            room,
            status: "connected",
            error: undefined,
            decision: undefined,
            state,
            events: [...events],
            batches: [...batches],
            snapshots: [{ stateVersion: 1, state: before }],
            acknowledgeDecision: () => undefined,
            sessionId: "session-0",
            roomCode: "",
          }}
        />
      </I18nProvider>
    );
    const rendered = render(view());
    append(
      [0, 1, 2].map((index) => ({
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT12-021",
        sourceInstanceId: "source-card",
        sourcePermanentId: "source",
        effectKey: `effect-${index}`,
        description: "Add the revealed card to your hand.",
        timing: "YourTurn",
      })),
      1,
    );
    rendered.rerender(view());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TIMINGS.effectSourceHold + 1);
    });
    // The notice prints the source card's own clause, so this asserts a clause is on screen
    // rather than the words the fixture used to summarize the same moment.
    expect(document.querySelectorAll(".match-notice__text").length).toBeGreaterThan(0);

    const received = new CardInstance();
    received.instanceId = "received-card";
    received.cardId = "ST1-07";
    received.ownerSeat = 0;
    state.players[0]!.hand.push(received);
    state.players[0]!.handCount = 1;
    state.stateVersion = 2;
    append([{ kind: "cardsMoved", instanceIds: [received.instanceId], from, to: "hand", seat: 0 }], 2);
    rendered.rerender(view());
    expect(screen.getByTestId("hand").querySelectorAll(".game-hand-card")).toHaveLength(1);
    // The notice prints the source card's own clause, so this asserts a clause is on screen
    // rather than the words the fixture used to summarize the same moment.
    expect(document.querySelectorAll(".match-notice__text").length).toBeGreaterThan(0);

    // A later confirmed removal also updates the hand while narration continues.
    state.players[0]!.hand.pop();
    state.players[0]!.handCount = 0;
    state.stateVersion = 3;
    append([{ kind: "cardsMoved", instanceIds: [received.instanceId], from: "hand", to: "trash", seat: 0 }], 3);
    rendered.rerender(view());
    expect(screen.getByTestId("hand").querySelectorAll(".game-hand-card")).toHaveLength(0);
  },
);
