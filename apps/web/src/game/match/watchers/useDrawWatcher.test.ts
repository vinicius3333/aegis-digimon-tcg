// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CardInstance, GameState, PlayerState } from "@aegis/shared";
import { snapshotGameState } from "../../../net/presentedState";
import { Side } from "../../side";
import { useDrawWatcher } from "./useDrawWatcher";

afterEach(cleanup);

it.each([
  { seat: 0, mode: "newer hand" },
  { seat: 1, mode: "newer hand" },
  { seat: 0, mode: "claimed effect draw" },
  { seat: 1, mode: "claimed effect draw" },
  { seat: 0, mode: "missing revision" },
  { seat: 1, mode: "missing revision" },
] as const)("handles seat$seat's turn draw with a $mode", ({ seat, mode }) => {
  const before = new GameState();
  before.stateVersion = 1;
  for (const currentSeat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = currentSeat;
    player.handCount = 5;
    player.deckCount = 40;
    before.players.push(player);
  }
  const drawn = snapshotGameState(before);
  drawn.stateVersion = 2;
  drawn.players[seat]!.handCount = 6;
  drawn.players[seat]!.deckCount = 39;
  if (seat === 0) {
    const card = new CardInstance();
    card.instanceId = "turn-draw";
    card.cardId = "BT1-010";
    drawn.players[seat]!.hand.push(card);
  }
  const live = snapshotGameState(drawn);
  live.stateVersion = 3;
  live.players[seat]!.handCount = mode === "claimed effect draw" ? 6 : 8;
  live.players[seat]!.deckCount = mode === "claimed effect draw" ? 38 : 37;
  const launchDrawFlight = vi.fn<Parameters<typeof useDrawWatcher>[0]["launchDrawFlight"]>();
  const turnStartDrawRef = { current: { you: false, opp: false } };
  const props: Parameters<typeof useDrawWatcher>[0] = {
    state: before,
    viewer: before.players[0],
    opponent: before.players[1],
    viewerSeat: 0,
    mulliganOpen: false,
    phaseBanner: null,
    drawPhaseWaitingRef: { current: null },
    previousDrawStateRef: { current: undefined },
    handCountsRef: { current: null },
    turnStartDrawRef,
    eventDrawCountsRef: { current: {} },
    launchDrawFlight,
  };
  const { rerender } = renderHook(useDrawWatcher, { initialProps: props });
  if (mode === "claimed effect draw") props.eventDrawCountsRef.current[seat === 0 ? "you" : "opp"] = 6;
  turnStartDrawRef.current = { you: seat === 0, opp: seat === 1 };
  rerender({
    ...props,
    state: live,
    viewer: live.players[0],
    opponent: live.players[1],
    snapshots: mode === "missing revision" ? [{ stateVersion: 3, state: live }] : [{ stateVersion: 2, state: drawn }],
    phaseBanner: {
      key: 1,
      phase: "Draw",
      labelKey: "game.phaseBanner.draw",
      side: seat === 0 ? Side.Viewer : Side.Opponent,
      stateVersion: 2,
    },
  });
  expect(launchDrawFlight).toHaveBeenCalledTimes(mode === "missing revision" ? 0 : 1);
  if (mode === "missing revision") return;
  expect(launchDrawFlight.mock.calls[0]![0]).toBe(seat === 0 ? Side.Viewer : Side.Opponent);
  expect(launchDrawFlight.mock.calls[0]![1]).toBe(true);
  expect(launchDrawFlight.mock.calls[0]![5]).toMatchObject({
    stateVersion: 2,
    handCountAfter: 6,
    deckCountAfter: 39,
  });
  expect(launchDrawFlight.mock.calls[0]![3]).toEqual(seat === 0 ? { cardId: "BT1-010" } : undefined);
});
