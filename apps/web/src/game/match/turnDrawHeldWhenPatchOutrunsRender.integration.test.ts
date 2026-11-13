// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { useLayoutEffect, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CardInstance,
  GameState,
  Phase,
  PlayerState,
  type SequencedServerEvent,
  type ServerEvent,
} from "@aegis/shared";
import { useMatchCues } from "../useMatchCues";
import { snapshotGameState, type StateSnapshot } from "../../net/presentedState";
import type { ServerBatch } from "../../net/serverBatches";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
vi.mock("../../design/sound", () => ({ playSound: vi.fn<() => void>() }));

function card(instanceId: string) {
  const value = new CardInstance();
  value.instanceId = instanceId;
  value.cardId = "ST1-07";
  return value;
}

function opponentMainPhase() {
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  state.turnSeat = 1;
  state.turnCount = 2;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.handCount = 1;
    player.deckCount = 30;
    if (seat === 0) player.hand.push(card("kept"));
    state.players.push(player);
  }
  return state;
}

it("keeps the turn draw out of the held hand when its patch lands before the render that learns the turn passed", async () => {
  const live = opponentMainPhase();
  const recorded: StateSnapshot[] = [{ stateVersion: 1, state: snapshotGameState(live) }];
  const closed: ServerBatch[] = [];
  let sequence = 0;
  function receive(event: ServerEvent, patch: () => void) {
    const id = `batch-${live.stateVersion + 1}`;
    const stamped = { ...event, seq: ++sequence, batch: id, stateVersion: live.stateVersion } as SequencedServerEvent;
    patch();
    live.stateVersion += 1;
    recorded.push({ stateVersion: live.stateVersion, state: snapshotGameState(live) });
    closed.push({ id, stateVersion: live.stateVersion, events: [stamped] });
  }
  const node = document.createElement("div");
  const anchors = {
    board: { current: node },
    yourDeck: { current: node },
    oppDeck: { current: node },
    yourHandDock: { current: node },
    oppHandStrip: { current: node },
    yourSecurity: { current: node },
    oppSecurity: { current: node },
  };
  const afterCommit: { current: (() => void) | undefined } = { current: undefined };
  function PatchesBetweenCommitAndEffects({ children }: { children: ReactNode }) {
    useLayoutEffect(() => {
      const land = afterCommit.current;
      afterCommit.current = undefined;
      land?.();
    });
    return children;
  }
  const received = () => ({
    batches: [...closed] as readonly ServerBatch[],
    snapshots: [...recorded] as readonly StateSnapshot[],
  });
  const { result, rerender } = renderHook(
    ({ batches, snapshots }: { batches: readonly ServerBatch[]; snapshots: readonly StateSnapshot[] }) =>
      useMatchCues({
        state: live,
        batches,
        snapshots,
        phaseEvents: batches.flatMap((batch) => batch.events),
        viewerSeat: 0,
        mulliganOpen: false,
        anchors,
        onActionRejected() {},
      }),
    { initialProps: received(), wrapper: PatchesBetweenCommitAndEffects },
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

  receive({ kind: "turnEnded", endingSeat: 1, nextSeat: 0, turnCount: 2 }, () => {
    live.phase = Phase.End;
  });
  afterCommit.current = () => {
    receive({ kind: "phaseChanged", phase: Phase.Active, turnSeat: 0, turnCount: 2 }, () => {
      live.phase = Phase.Active;
      live.turnSeat = 0;
      live.turnCount = 3;
    });
    receive({ kind: "phaseChanged", phase: Phase.Draw, turnSeat: 0, turnCount: 3 }, () => {
      live.phase = Phase.Draw;
      live.players[0]!.hand.push(card("drawn"));
      live.players[0]!.handCount = 2;
      live.players[0]!.deckCount = 29;
    });
    receive({ kind: "phaseChanged", phase: Phase.Breeding, turnSeat: 0, turnCount: 3 }, () => {
      live.phase = Phase.Breeding;
    });
  };
  rerender({ batches: closed.slice(0, 1), snapshots: recorded.slice(0, 2) });
  expect(live.players[0]!.handCount, "the draw patch landed before the next render").toBe(2);

  rerender(received());

  const heldHand = () => result.current.heldDrawState?.state.players[0]!.hand.map((held) => held.instanceId);
  expect(result.current.heldDrawState?.seat).toBe(0);
  expect(heldHand()).toEqual(["kept"]);
  for (let poll = 0; poll < 250 && result.current.phaseBanner?.phase !== "Draw"; poll++) {
    expect(heldHand(), "the drawn card stays behind the Draw ribbon").toEqual(["kept"]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  }
  expect(result.current.phaseBanner).toMatchObject({ phase: "Draw", side: "you" });
});
