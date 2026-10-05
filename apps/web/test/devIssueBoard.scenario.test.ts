import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { Client } from "@colyseus/sdk";
import { Phase, ROOM_TYPE_BOT, type GameState } from "@aegis/shared";
import { roomRegistry } from "@aegis-api/rooms/AegisRoom.js";
import { RED_DECK } from "@aegis-api/engine/testDecks.js";
import { ISSUE_REPRO_SCENARIO_IDS } from "@aegis-api/engine/issueReproScenarios.js";
import { startTestServer, type TestServer } from "./scenarioHarness/server";

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

it.each(ISSUE_REPRO_SCENARIO_IDS)("sends the complete %s board on its first connection", async (devScenario) => {
  const room = await new Client(server.endpoint).create<GameState>(ROOM_TYPE_BOT, {
    displayName: "Scenario viewer",
    deck: RED_DECK,
    devScenario,
  });
  room.onMessage("*", () => {});
  try {
    const host = roomRegistry.get(room.roomId)!;
    expect(host.addBot()).toBe(true);
    await vi.waitFor(() =>
      expect(room.state.phase).toBe(
        devScenario === "arena-issue-4939-demon-lord-free-reduction" ? Phase.Main : Phase.Breeding,
      ),
    );
    await vi.waitFor(() => {
      for (const seat of [0, 1] as const) {
        const actual = room.state.players[seat]!;
        const expected = host.state.players[seat]!;
        expect(
          actual.battleArea.map((permanent) => ({
            card: permanent.topCard?.cardId,
            sources: permanent.stack.map((card) => card.cardId),
          })),
        ).toEqual(
          expected.battleArea.map((permanent) => ({
            card: permanent.topCard.cardId,
            sources: permanent.stack.map((card) => card.cardId),
          })),
        );
        expect(actual.breeding?.topCard?.cardId).toBe(expected.breeding?.topCard?.cardId);
        expect(actual.breeding?.stack.map((card) => card.cardId)).toEqual(
          expected.breeding?.stack.map((card) => card.cardId),
        );
        expect(actual.trash.map((card) => card.cardId)).toEqual(expected.trash.map((card) => card.cardId));
      }
      expect(room.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
        host.state.players[0]!.hand.map((card) => card.cardId),
      );
      expect(room.state.players[1]!.hand?.length ?? 0).toBe(0);
    });
  } finally {
    await room.leave();
  }
});
