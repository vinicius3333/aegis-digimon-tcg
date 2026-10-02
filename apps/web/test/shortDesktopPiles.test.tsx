// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import { DOCKED_VIEWER_PILES_QUERY } from "../src/game/screen/queries";
import { cleanup, render } from "./scenarioHarness/testingLibrary";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
}));

vi.mock("../src/net/useRoom", () => ({
  useRoom: () => mocked.roomResult.current,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubViewport(matchingQueries: readonly string[]): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matchingQueries.includes(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

async function mountGame(): Promise<HTMLElement> {
  const s = setupEngine({
    0: { deck: ["BT1-010"], trash: ["BT1-010"], security: 5 },
    1: { deck: ["BT1-029"], security: 5 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 0;
  s.state.phase = "Main";
  await s.ready();
  mocked.roomResult.current = {
    room: { roomId: "short-desktop-piles-room" },
    status: "connected",
    state: s.state,
    events: [],
    decision: undefined,
    error: undefined,
    sessionId: "viewer-session",
    stateVersion: 1,
    roomCode: "",
  };

  const { GameScreen } = await import("../src/game/GameScreen");
  const { container } = render(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Red"
      startMode="casual"
      onExit={() => {}}
    />,
  );
  return container;
}

it("keeps the viewer's deck and trash in the right rail on a tall desktop", async () => {
  stubViewport([]);
  const container = await mountGame();

  const rail = container.querySelector(".game-pile-column--right");
  expect(rail?.querySelector(".game-utility-slot--you-deck")).not.toBeNull();
  expect(rail?.querySelector(".game-utility-slot--you-trash")).not.toBeNull();
});

it("moves the viewer's deck and trash into the bottom strip on a short desktop", async () => {
  stubViewport([DOCKED_VIEWER_PILES_QUERY]);
  const container = await mountGame();

  const rail = container.querySelector(".game-pile-column--right");
  const dock = container.querySelector(".game-player-dock");
  expect(rail?.querySelector(".game-utility-slot--you-trash")).toBeNull();
  expect(dock?.querySelector(".game-viewer-piles--docked .game-utility-slot--you-deck")).not.toBeNull();
  expect(dock?.querySelector(".game-viewer-piles--docked .game-utility-slot--you-trash")).not.toBeNull();
});
