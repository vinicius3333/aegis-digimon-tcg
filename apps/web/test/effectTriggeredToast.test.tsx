// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
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

/**
 * The match screen treats the first batch of events it sees as replayed history
 * and narrates none of it, so a notice is only raised for an event that arrives
 * after the board is already up.
 */
async function renderThenNarrate(connection: Record<string, unknown>, event: unknown) {
  mocked.roomResult.current = { ...connection, events: [] };
  const { GameScreen } = await import("../src/game/GameScreen");
  // A fresh element each time: React bails out of re-rendering when handed the
  // very same element object, and the second pass is the point of the exercise.
  const screenElement = (): ReactElement => (
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Red"
      startMode="casual"
      onExit={() => {}}
    />
  );
  const { rerender } = render(screenElement());
  mocked.roomResult.current = { ...connection, events: [event] };
  rerender(screenElement());
}

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

  await renderThenNarrate(
    {
      room: mocked.room,
      status: "connected",
      state: s.state,
      decision: undefined,
      error: undefined,
      sessionId: "viewer-session",
      stateVersion: 1,
      roomCode: "",
    },
    {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "ST12-15",
      effectKey: "st12-15-main",
      description: clause,
      timing: "Main",
    },
  );

  const notice = await screen.findByRole("status");
  expect(within(notice).getByText("From Master to Disciple")).toBeDefined();
  // The clause is rendered as linked fragments, so it is read off the notice as a whole.
  expect(notice.textContent).toContain(clause);
  expect(notice.getAttribute("data-variant")).toBe("effect");
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

  await renderThenNarrate(
    {
      room: mocked.room,
      status: "connected",
      state: s.state,
      decision: undefined,
      error: undefined,
      sessionId: "viewer-session",
      stateVersion: 1,
      roomCode: "",
    },
    {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "ST12-08",
      effectKey: "ST12-08/when-attacking-inherited-play-sistermon",
      description: inherited,
      timing: "OnAllyAttack",
    },
  );

  const notice = await screen.findByRole("status");
  // Printed as the card prints it: the inherited box carries no "[Inherited]" marker.
  expect(notice.textContent).toContain(inherited.replace("[Inherited]", ""));
  expect(within(notice).queryByText(/\[When Digivolving\].*unsuspended Digimon/)).toBeNull();
});

it("dims breeding only once the viewer can act, never during setup or the opponent's turn", async () => {
  const s = setupEngine({ 0: { security: 5 }, 1: { security: 5 } });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 0;
  s.state.phase = "Breeding";
  const connection = {
    room: mocked.room,
    status: "connected",
    state: s.state,
    events: [],
    sessionId: "viewer-session",
    stateVersion: 1,
    roomCode: "",
  };
  mocked.roomResult.current = { ...connection, decision: { kind: "optional", seat: 1 } };
  const { GameScreen } = await import("../src/game/GameScreen");
  const element = () => (
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Red"
      startMode="casual"
      onExit={() => {}}
    />
  );
  const { container, rerender } = render(element());
  expect(container.querySelector(".game-breeding-mode")).toBeNull();

  mocked.roomResult.current = connection;
  rerender(element());
  expect(container.querySelector(".game-breeding-mode")).not.toBeNull();

  s.state.turnSeat = 1;
  rerender(element());
  expect(container.querySelector(".game-breeding-mode")).toBeNull();

  s.state.turnSeat = 0;
  s.state.phase = "Main";
  rerender(element());
  expect(container.querySelector(".game-breeding-mode")).toBeNull();
});
