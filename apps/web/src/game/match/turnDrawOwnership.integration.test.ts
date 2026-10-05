// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GameState, PlayerState, Phase, type Seat, type ServerEvent, type PresentationReport } from "@aegis/shared";
import { useMatchCues } from "../useMatchCues";
import { snapshotGameState } from "../../net/presentedState";
import { singleServerBatch, type ServerBatch } from "../../net/serverBatches";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
vi.mock("../../design/sound", () => ({ playSound: vi.fn<() => void>() }));

it.each([0, 1] as const)("does not release a later turn's draw when seat%s's older phase opens", async (olderSeat) => {
  const before = new GameState();
  before.stateVersion = 1;
  before.phase = Phase.Main;
  before.turnSeat = olderSeat;
  before.turnCount = olderSeat === 0 ? 1 : 2;
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.handCount = 5;
    player.deckCount = 40;
    before.players.push(player);
  }
  const node = document.createElement("div");
  node.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
  const anchors = {
    board: { current: node },
    yourDeck: { current: node },
    oppDeck: { current: node },
    yourHandDock: { current: node },
    oppHandStrip: { current: node },
    yourSecurity: { current: node },
    oppSecurity: { current: node },
  };
  const reports: PresentationReport[] = [];
  const { result, rerender } = renderHook(
    ({ state, batches }: { state: GameState; batches: readonly ServerBatch[] }) =>
      useMatchCues({
        state,
        batches,
        viewerSeat: 0,
        mulliganOpen: false,
        anchors,
        onActionRejected() {},
        onPresentationReport: (report) => reports.push(report),
      }),
    { initialProps: { state: before, batches: [] as readonly ServerBatch[] } },
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  const after = snapshotGameState(before);
  after.stateVersion = 2;
  after.turnSeat = 0;
  after.turnCount = 3;
  after.players[0]!.handCount = 6;
  after.players[0]!.deckCount = 39;
  const phase = (name: Phase, turnSeat: Seat, turnCount: number): ServerEvent => ({
    kind: "phaseChanged",
    phase: name,
    turnSeat,
    turnCount,
  });
  const events: ServerEvent[] = [
    phase(Phase.Breeding, olderSeat, before.turnCount),
    phase(Phase.Main, olderSeat, before.turnCount),
    ...(olderSeat === 0
      ? [
          phase(Phase.End, 0, 1),
          { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 1 } as ServerEvent,
          phase(Phase.Active, 1, 1),
          phase(Phase.Draw, 1, 2),
          phase(Phase.Breeding, 1, 2),
          phase(Phase.Main, 1, 2),
        ]
      : []),
    phase(Phase.End, 1, 2),
    { kind: "turnEnded", endingSeat: 1, nextSeat: 0, turnCount: 2 },
    phase(Phase.Active, 0, 2),
    phase(Phase.Draw, 0, 3),
    phase(Phase.Breeding, 0, 3),
  ];
  rerender({ state: after, batches: [singleServerBatch(events, 2)] });
  const began = () =>
    reports.some(
      (report) => report.phase === "started" && report.side === "you" && report.track.startsWith("turnDrawFlight-"),
    );
  for (let poll = 0; poll < 250; poll++) {
    if (result.current.phaseBanner?.phase === "Draw" && result.current.phaseBanner.side === "you") break;
    expect(began(), "the incoming card stays behind its own Draw ribbon").toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
  }
  expect(result.current.phaseBanner).toMatchObject({ phase: "Draw", side: "you" });
  expect(began()).toBe(true);
});
