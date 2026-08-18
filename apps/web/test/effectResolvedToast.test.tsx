// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import { cleanup, render, screen, within } from "./scenarioHarness/testingLibrary";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "effect-resolved-toast-room" },
}));

vi.mock("../src/net/useRoom", () => ({
  useRoom: () => mocked.roomResult.current,
}));

afterEach(() => cleanup());

it("shows a non-blocking notice when the viewer's mandatory effect resolves", async () => {
  const clause =
    "[Main] Reveal the top 3 cards of your deck. Add 1 card with [Huckmon] or [Sistermon] in its name " +
    "or [Royal Knight] in its traits among them to your hand. Trash the rest.";
  const s = setupEngine({
    0: { battleArea: ["ST12-15"], deck: ["BT1-010"], security: 5 },
    1: { deck: ["BT1-029"], security: 5 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 0;
  s.state.phase = "Main";
  mocked.roomResult.current = {
    room: mocked.room,
    status: "connected",
    state: s.state,
    events: [{
      kind: "effectResolved",
      seat: 0,
      sourceCardId: "ST12-15",
      effectKey: "st12-15-main",
      description: clause,
      timing: "Main",
    }],
    decision: undefined,
    error: undefined,
    sessionId: "viewer-session",
    stateVersion: 1,
    roomCode: "",
  };

  const { GameScreen } = await import("../src/game/GameScreen");
  render(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Red"
      startMode="casual"
      onExit={() => {}}
    />,
  );

  const notice = await screen.findByRole("status");
  expect(within(notice).getByText("From Master to Disciple")).toBeDefined();
  expect(within(notice).getByText(clause)).toBeDefined();
  expect(notice.style.pointerEvents).toBe("none");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows the exact inherited clause instead of SaviorHuckmon's main effect", async () => {
  const inherited =
    "[When Attacking][Inherited][Once Per Turn] If this Digimon has [Royal Knight] in its traits, " +
    "you may play 1 Digimon card with [Sistermon] in its name from your hand or trash without paying its memory cost.";
  const s = setupEngine({
    0: { battleArea: [{ card: "ST12-10", under: ["ST12-08"] }], security: 5 },
    1: { security: 5 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  mocked.roomResult.current = {
    room: mocked.room,
    status: "connected",
    state: s.state,
    events: [{
      kind: "effectResolved",
      seat: 0,
      sourceCardId: "ST12-08",
      effectKey: "ST12-08/when-attacking-inherited-play-sistermon",
      description: inherited,
      timing: "OnAllyAttack",
    }],
    decision: undefined,
    error: undefined,
    sessionId: "viewer-session",
    stateVersion: 1,
    roomCode: "",
  };

  const { GameScreen } = await import("../src/game/GameScreen");
  render(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Red"
      startMode="casual"
      onExit={() => {}}
    />,
  );

  const notice = await screen.findByRole("status");
  expect(within(notice).getByText(inherited)).toBeDefined();
  expect(within(notice).queryByText(/\[When Digivolving\].*unsuspended Digimon/)).toBeNull();
});
