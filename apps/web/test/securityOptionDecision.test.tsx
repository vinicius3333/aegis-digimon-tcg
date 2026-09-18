// @vitest-environment jsdom

/* A [Security] effect on a revealed Option asks the viewer a question, and the server
   cannot close the check until it is answered. The prompt has to open anyway: the check's
   own beats must never be a prerequisite for the answer they are waiting on.

   Reproduces the match where checking "Cooties Kick" (BT11-106) froze the board — a
   deletion inside the check queued behind a battle beat that no Option check ever plays,
   and the prompt that would have released it was held back by that queued beat. */

import { afterEach, expect, it, vi } from "vitest";
import type { DecisionRequest, ServerEvent } from "@aegis/shared";
import { setupEngine } from "@aegis-api/engine/testkit/harness.js";
import { cleanup, render, screen, within } from "./scenarioHarness/testingLibrary";

const mocked = vi.hoisted(() => ({
  roomResult: { current: undefined as unknown },
  room: { roomId: "security-option-decision-room" },
}));

vi.mock("../src/net/useRoom", () => ({
  useRoom: () => mocked.roomResult.current,
}));

afterEach(() => cleanup());

const DECISION: DecisionRequest = {
  decisionId: "dec-53",
  seat: 0,
  kind: "selectCards",
  promptText: "KingSukamon",
  sourceCardId: "EX13-031",
  options: {
    candidateInstanceIds: ["revealed-playable"],
    visibleInstanceIds: ["revealed-playable"],
    visibleCards: [{ instanceId: "revealed-playable", cardId: "BT11-040", artId: "BT11-040" }],
    min: 0,
    max: 1,
  },
};

it("opens the prompt a still-running Option security check asked for", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT13-065", as: "victim" }], deck: ["BT1-010"], security: ["BT11-106"] },
    1: { battleArea: [{ card: "BT24-018", as: "attacker" }], deck: ["BT1-029"], security: 5 },
  });
  s.state.players[0]!.sessionId = "viewer-session";
  s.state.players[1]!.sessionId = "opponent-session";
  s.state.turnSeat = 1;
  s.state.phase = "Main";
  await s.ready();

  const attacker = s.perm("attacker");
  const victim = s.perm("victim");
  const events: ServerEvent[] = [
    {
      kind: "attackDeclared",
      seat: 1,
      attackerPermanentId: attacker.permanentId,
      attackerCardId: "BT24-018",
      attackerArtId: "BT24-018",
      target: { kind: "player", seat: 0 },
    },
    {
      kind: "securityRevealed",
      seat: 0,
      artId: "BT11-106",
      revealedCardId: "BT11-106",
      attackerPermanentId: attacker.permanentId,
      attackerArtId: "BT24-018",
      attackerDP: 14000,
      securityCountBefore: 1,
      hasSecurityEffect: true,
      isDigimon: false,
    },
    // The check deletes one of the viewer's Digimon before it asks its question. The
    // close that would draw a battle beat never comes: there is no battle, and the
    // server is blocked on the answer.
    {
      kind: "cardsMoved",
      instanceIds: [victim.topCard!.instanceId],
      from: "battleArea",
      to: "trash",
      deletedPermanents: [
        {
          permanentId: victim.permanentId,
          instanceId: victim.topCard!.instanceId,
          cardId: "BT13-065",
          artId: "BT13-065",
          seat: 0,
        },
      ],
    },
  ];

  const connection = (extra: Record<string, unknown>) => ({
    room: mocked.room,
    status: "connected",
    state: s.state,
    error: undefined,
    sessionId: "viewer-session",
    roomCode: "",
    ...extra,
  });

  mocked.roomResult.current = connection({ events: [], decision: undefined, stateVersion: 1 });
  const { GameScreen } = await import("../src/game/GameScreen");
  const element = () => (
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Black"
      startMode="casual"
      onExit={() => {}}
    />
  );
  const { rerender } = render(element());

  mocked.roomResult.current = connection({ events, decision: undefined, stateVersion: 2 });
  rerender(element());

  mocked.roomResult.current = connection({ events, decision: DECISION, stateVersion: 2 });
  rerender(element());

  // Well inside the deletion beat's own ceiling for a security blow, and inside the stall
  // watchdog that is only ever a backstop.
  const prompt = await screen.findByRole("dialog", undefined, { timeout: 8_000 });
  expect(within(prompt).getByRole("button", { name: /^sukamon$/i })).toBeTruthy();
}, 20_000);
