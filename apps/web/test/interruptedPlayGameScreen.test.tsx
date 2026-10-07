// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type { intents } from "../src/net/intents";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { tap } from "./scenarioHarness/tap";

const mocked = vi.hoisted(() => ({
  result: { current: undefined as unknown },
  room: { roomId: "interrupted-play-room", onMessage: () => () => {} },
  playCard: vi.fn<typeof intents.playCard>(),
}));
vi.mock("../src/net/useRoom", () => ({ useRoom: () => mocked.result.current }));
vi.mock("../src/net/intents", () => ({ intents: { playCard: mocked.playCard } }));
afterEach(() => {
  cleanup();
  mocked.playCard.mockReset();
});

it("#5262 restores an unsent Mimi play after reconnection without playing another card", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT3-096", as: "mimi" }, { card: "BT1-009" }], deck: ["BT1-009"], security: 5 },
    1: { deck: ["BT1-009"], security: 5 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 0;
  s.state.phase = "Main";
  s.state.memory = 5;
  await s.ready();
  const result = {
    room: mocked.room,
    status: "connected",
    state: s.state,
    events: [],
    decision: undefined,
    error: undefined,
    sessionId: "viewer-session",
    stateVersion: 1,
    roomCode: "",
  };
  mocked.result.current = result;
  const { GameScreen } = await import("../src/game/GameScreen");
  const game = () => (
    <GameScreen
      joinOptions={{ displayName: "Revanche", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Purple"
      startMode="casual"
      onExit={() => {}}
    />
  );
  const view = render(game());
  const hand = () => within(screen.getByTestId("hand"));
  tap(hand().getByRole("img", { name: /^Mimi Tachikawa$/i }));
  fireEvent.click(await screen.findByRole("button", { name: /^Play Tamer$/i }));
  expect(mocked.playCard).toHaveBeenCalledTimes(1);
  expect(hand().queryByRole("img", { name: /^Mimi Tachikawa$/i })).toBeNull();
  // The send never reached the server: reconnection retains Mimi in the authoritative hand.
  mocked.result.current = { ...result, status: "reconnecting" };
  view.rerender(game());
  mocked.result.current = { ...result, status: "connected" };
  view.rerender(game());
  expect(await hand().findByRole("img", { name: /^Mimi Tachikawa$/i })).toBeTruthy();
  expect(mocked.playCard).toHaveBeenCalledTimes(1);
}, 20_000);
