import { Client, type Room } from "@colyseus/sdk";
import type { GameState } from "@aegis/shared";
import { BLUE_DECK, type Decklist } from "@aegis-api/engine/testDecks.js";
import { expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "./testingLibrary";
import { endBreedingStep, waitForBoardActions } from "./breedingStep";
import { joinHeadlessOpponent, type HeadlessOpponent } from "./headlessOpponent";
import { resolveIncidentalDecisionsThroughUi, respondToHeadlessDecision } from "./decisions";
import type { TestServer } from "./server";
import { tap } from "./tap";

/** Observe the real owner connection; never replace room state or intent handling. */
export async function connectScenario(server: TestServer, deck: Decklist, seed: number) {
  vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
  let owner: Room<GameState> | undefined;
  let calls = 0;
  const join = Client.prototype.joinOrCreate;
  vi.spyOn(Client.prototype, "joinOrCreate").mockImplementation(async function (
    this: Client,
    ...args: Parameters<Client["joinOrCreate"]>
  ) {
    const index = calls++;
    const room = await join.apply(this, args);
    if (index === 0) owner = room as Room<GameState>;
    return room;
  });
  const { GameScreen } = await import("../../src/game/GameScreen");
  render(
    <GameScreen
      joinOptions={{ displayName: "Protagonist", deck, ...{ seed } }}
      identityColor="Red"
      startMode="casual"
      onExit={() => {}}
    />,
  );
  await screen.findByText(/finding an opponent/i);
  const opponent = await joinHeadlessOpponent(server.endpoint, { displayName: "Opponent", deck: BLUE_DECK });
  opponent.onDecision((request) => {
    if (request.kind === "mulligan") opponent.mulligan(true);
    else respondToHeadlessDecision(opponent, request);
  });
  opponent.ready();
  fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));
  expect(owner).toBeDefined();
  return { owner: owner!, opponent };
}

/** Explicitly pass the other player's two windows; no repeated state-change sender. */
export async function passOpponentTurn(opponent: HeadlessOpponent): Promise<void> {
  await vi.waitFor(
    () => {
      expect(opponent.room.state.turnSeat).toBe(1);
      expect(opponent.room.state.phase).toBe("Breeding");
    },
    { timeout: 10_000 },
  );
  opponent.endPhase();
  await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });
  opponent.endPhase();
  for (let round = 0; round < 10; round += 1) {
    await vi.waitFor(
      () => expect(opponent.room.state.turnSeat === 0 || opponent.room.state.pendingDecision !== undefined).toBe(true),
      { timeout: 10_000 },
    );
    if (opponent.room.state.turnSeat === 0) break;
    await resolveIncidentalDecisionsThroughUi(opponent);
  }
  await vi.waitFor(
    () => {
      expect(opponent.room.state.turnSeat).toBe(0);
      expect(opponent.room.state.phase).toBe("Breeding");
    },
    { timeout: 10_000 },
  );
}

export async function enterMain(opponent: HeadlessOpponent): Promise<void> {
  await endBreedingStep();
  await vi.waitFor(
    () => {
      expect(opponent.room.state.turnSeat).toBe(0);
      expect(opponent.room.state.phase).toBe("Main");
    },
    { timeout: 10_000 },
  );
  await waitForBoardActions();
}

export async function chooseHandPlay(name: RegExp): Promise<void> {
  tap(within(screen.getByTestId("hand")).getAllByRole("img", { name })[0]!);
  fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));
}

export function ownBattle(): HTMLElement {
  return document.querySelector('[data-drop="battle-you"]') as HTMLElement;
}

/** Finish optional follow-ups through UI, including gaps between resolution windows. */
export async function finishTriggeredTurn(opponent: HeadlessOpponent): Promise<void> {
  for (let round = 0; round < 10; round += 1) {
    await vi.waitFor(
      () => expect(opponent.room.state.turnSeat === 1 || opponent.room.state.pendingDecision !== undefined).toBe(true),
      { timeout: 10_000 },
    );
    if (opponent.room.state.turnSeat === 1) return;
    await resolveIncidentalDecisionsThroughUi(opponent);
  }
  throw new Error("The paid action did not finish its turn after ten decision windows");
}
