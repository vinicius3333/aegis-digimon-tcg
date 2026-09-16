// @vitest-environment jsdom
import { SERVER_EVENT_KINDS, getCardDefinition } from "@aegis/shared";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { snapshotGameState } from "../net/presentedState";
import { createArenaDemoState } from "./ArenaDemo";
import { DEMO_KEYWORDS } from "./arenaDemoKeywords";
import { arenaVisualCatalog, buildArenaVisualScene } from "./arenaVisualScenarios";
import { useArenaVisualPlayback } from "./arenaVisualPlayback";

beforeEach(() => {
  window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20");
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each(DEMO_KEYWORDS)("builds isolated coherent public before/after frames and supported events for %s", (keyword) => {
  const manual = createArenaDemoState([100, 100]);
  const unchanged = snapshotGameState(manual);
  const scene = buildArenaVisualScene(manual, keyword);
  expect(snapshotGameState(manual)).toEqual(unchanged);
  expect(scene.initialState.players[1]!.hand).toHaveLength(0);
  let version = 0;
  let time = 0;
  for (const stage of scene.stages) {
    expect(stage.atMs).toBeGreaterThan(time);
    time = stage.atMs;
    expect(stage.beforeState.stateVersion).toBeGreaterThan(version);
    expect(stage.state.stateVersion).toBeGreaterThan(stage.beforeState.stateVersion);
    version = stage.state.stateVersion;
    expect(stage.state.pendingDecision).toBeUndefined();
    expect(stage.state.combatWindow).toBeUndefined();
    expect(stage.state.players[1]!.hand).toHaveLength(0);
    for (const event of stage.events) expect(SERVER_EVENT_KINDS).toContain(event.kind);
    for (const player of stage.state.players)
      for (const permanent of player.battleArea) expect(!!getCardDefinition(permanent.topCard!.cardId)).toBe(true);
  }
  expect(scene.durationMs).toBeGreaterThan(time);
  expect(arenaVisualCatalog().find((scenario) => scenario.keyword === keyword)).toBeTruthy();
  expect(scene.stages.length).toBeGreaterThan(0);
});

it.each(["Draw", "Recovery"] as const)("produces %s even after manual deck exhaustion", (keyword) => {
  const manual = createArenaDemoState([100, 100]);
  const unchanged = snapshotGameState(manual);
  const scene = buildArenaVisualScene(manual, keyword);
  const count = keyword === "Draw" ? "handCount" : "securityCount";
  expect(scene.stages[0]!.state.players[0]![count]).toBe(scene.initialState.players[0]![count] + 1);
  expect(scene.stages[0]!.state.players[0]!.deckCount).toBe(0);
  expect(snapshotGameState(manual)).toEqual(unchanged);
});

it.each(["Fortitude", "Partition", "Decode"] as const)("returns the same physical cards for %s", (keyword) => {
  const scene = buildArenaVisualScene(createArenaDemoState(), keyword);
  const deleted = scene.stages[1]!.state.players[0]!;
  const returned = scene.stages[2]!.state.players[0]!;
  const returningIds = scene.stages[2]!.events.filter((event) => event.kind === "cardPlayed").map(
    (event) => event.permanentId,
  );
  const returningCards = returned.battleArea
    .filter((piece) => returningIds.includes(piece.permanentId))
    .map((piece) => piece.topCard!);
  expect(returningCards.length).toBeGreaterThan(0);
  for (const card of returningCards) {
    expect(deleted.trash.find((previous) => previous.instanceId === card.instanceId)).toEqual(card);
    expect(returned.trash.find((previous) => previous.instanceId === card.instanceId)).toBeUndefined();
  }
});

it.each(["Guard", "Decoy", "Scapegoat"] as const)(
  "uses a matching printed attack effect as the %s threat",
  (keyword) => {
    const scene = buildArenaVisualScene(createArenaDemoState(), keyword);
    const effect = scene.stages[1]!.events.find((event) => event.kind === "effectTriggered")!;
    expect(effect.sourceCardId).toBe("EX2-010");
    expect(effect.timing).toBe("WhenAttacking");
    expect(getCardDefinition(effect.sourceCardId)?.effectText).toContain(
      "[When Attacking] Delete 1 of your opponent's Digimon with 4000 DP or less.",
    );
  },
);

it("shows Jamming surviving a security Digimon with higher DP", () => {
  const scene = buildArenaVisualScene(createArenaDemoState(), "Jamming");
  const check = scene.stages[1]!.events.find((event) => event.kind === "securityChecked")!;
  expect(scene.initialState.players[0]!.battleArea[0]!.currentDP).toBe(1000);
  expect(check.battle?.attackerDP).toBe(1000);
  expect(check.battle?.securityCardDP).toBe(2000);
  expect(check.battle?.attackerDeleted).toBe(false);
});

it("mounts an empty baseline, delivers fresh later batches and retains cue-before snapshots", () => {
  const manual = createArenaDemoState();
  const { result } = renderHook(() => useArenaVisualPlayback(manual, {}));
  act(() => result.current.controller.controls.start());
  expect(result.current.connection?.batches).toHaveLength(0);
  act(() => vi.advanceTimersByTime(599));
  expect(result.current.connection?.events).toHaveLength(0);
  act(() => vi.advanceTimersByTime(1));
  const connection = result.current.connection!;
  expect(connection.events[0]!.kind).toBe("attackDeclared");
  expect(connection.batches[0]!.stateVersion).toBe(1);
  expect(connection.state.stateVersion).toBe(2);
  expect(connection.snapshots.map((snapshot) => snapshot.stateVersion)).toEqual([1, 2]);
  expect(connection.snapshots[0]!.state.players[1]!.battleArea[0]!.isSuspended).toBe(false);
  expect(connection.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
});

it("pauses between scenes, navigates and repeats with clean events, and stops/unmounts without changing manual state", () => {
  const manual = createArenaDemoState([1, 1]);
  const baseline = snapshotGameState(manual);
  const { result, unmount } = renderHook(() =>
    useArenaVisualPlayback(manual, { "you-chronomon": { Blocker: "Blocker" } }),
  );
  act(() => result.current.controller.controls.start());
  act(() => result.current.controller.controls.pause());
  act(() => vi.advanceTimersByTime(7000));
  expect(result.current.controller.index).toBe(0);
  expect(result.current.connection?.events.map((event) => event.kind)).toEqual([
    "attackDeclared",
    "blocked",
    "combatResolved",
  ]);
  act(() => result.current.controller.controls.start());
  act(() => vi.advanceTimersByTime(400));
  expect(result.current.controller.index).toBe(1);
  expect(result.current.connection?.events).toHaveLength(0);
  act(() => result.current.controller.controls.pause());
  act(() => result.current.controller.controls.select(DEMO_KEYWORDS.indexOf("Draw")));
  act(() => vi.advanceTimersByTime(600));
  expect(result.current.connection?.state.players[0]!.handCount).toBe(22);
  const key = result.current.gameKey;
  act(() => result.current.controller.controls.repeat());
  expect(result.current.gameKey).not.toBe(key);
  expect(result.current.connection?.state.players[0]!.handCount).toBe(21);
  expect(result.current.connection?.events).toHaveLength(0);
  act(() => result.current.controller.controls.previous());
  expect(result.current.controller.scenario.keyword).toBe("BlastDNADigivolve");
  act(() => result.current.controller.controls.next());
  expect(result.current.controller.scenario.keyword).toBe("Draw");
  act(() => result.current.controller.controls.stop());
  expect(result.current.connection).toBeUndefined();
  expect(result.current.controller.active).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  expect(snapshotGameState(manual)).toEqual(baseline);
  act(() => result.current.controller.controls.start());
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("previews a security battle the attacker loses", () => {
  vi.useFakeTimers();
  const manual = createArenaDemoState();
  const { result, unmount } = renderHook(() => useArenaVisualPlayback(manual, {}, false));
  act(() => result.current.controller.controls.startSecurityBattle("attackerLoses"));
  act(() => vi.advanceTimersByTime(1800));
  const checks = result.current.connection!.events.filter((event) => event.kind === "securityChecked");
  expect(checks).toHaveLength(1);
  expect(checks[0]).toMatchObject({ battle: { attackerDeleted: true, securityDigimonDeleted: false } });
  act(() => vi.advanceTimersByTime(30000));
  // The attacker died on the first check, so Security Attack never runs a second one.
  expect(result.current.connection!.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  act(() => result.current.controller.controls.stop());
  unmount();
});

it("previews security combat directly without advancing to another keyword", () => {
  vi.useFakeTimers();
  const manual = createArenaDemoState();
  const baseline = snapshotGameState(manual);
  const { result, unmount } = renderHook(() => useArenaVisualPlayback(manual, {}, false));
  act(() => result.current.controller.controls.startSecurityBattle());
  expect(result.current.controller.active).toBe(true);
  expect(result.current.controller.playing).toBe(false);
  expect(result.current.controller.scenario.keyword).toBe("SecurityAttack");
  act(() => vi.advanceTimersByTime(1800));
  expect(result.current.connection!.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  expect(result.current.connection!.events.some((event) => event.kind === "securityRevealed")).toBe(true);
  expect(
    result.current.connection!.events.some(
      (event) => event.kind === "securityChecked" && event.resolution === "battle",
    ),
  ).toBe(true);
  act(() => vi.advanceTimersByTime(30000));
  expect(result.current.controller.scenario.keyword).toBe("SecurityAttack");
  act(() => result.current.controller.controls.stop());
  expect(result.current.connection).toBeUndefined();
  expect(snapshotGameState(manual)).toEqual(baseline);
  unmount();
});
