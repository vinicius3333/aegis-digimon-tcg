import { expect, it, vi } from "vitest";
import { consumePrivateSealedRoomGrant } from "#api/rooms/sealed/consumePrivateSealedRoomGrant";
import { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import type { Client } from "colyseus";
import type { Intent } from "@aegis/shared/protocol/intents";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { Phase } from "@aegis/shared/schema/enums";
import { AegisRoom } from "#api/rooms/AegisRoom";
import type { GameEngine } from "#api/engine/GameEngine";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import fixture from "#api/engine/scenarios/sealed-rookie-placement.fixture";
import { addLogSink } from "#api/logger";
import { settle } from "#api/engine/testkit/harness";
import { extractReplay } from "#api/replays/inputs/extract";
import { createEngineSchemaCloner } from "#api/engine/snapshot/schema/createEngineSchemaCloner";
import { runReplay } from "#api/replays/inputs/run";

vi.mock("#api/rooms/sealed/consumePrivateSealedRoomGrant", () => ({
  consumePrivateSealedRoomGrant: vi.fn(),
}));

type Driver = {
  scenarioFixture: ScenarioFixture;
  engine: GameEngine;
  startScenarioNow(): void;
  handleIntent(client: Client, intent: Intent): void;
};

it("roundtrips recorded sealed placement and cross-color evolution through extraction, replay and a restored snapshot", async () => {
  const room = new AegisRoom();
  const driver = room as unknown as Driver;
  const lines: string[] = [];
  const stop = addLogSink((line) => lines.push(line));
  room.lock = async () => {};
  room.unlock = async () => {};
  room.setMatchmaking = async () => {};
  room.broadcast = () => true;
  room.setPrivate = vi.fn(async () => {});
  const gameId = "sealed-replay-game";
  const capability = "a".repeat(64);
  const deck = {
    mainDeck: Array<string>(40).fill("BT1-009"),
    eggDeck: [] as string[],
    mainDeckArts: Array<string>(40).fill("BT1-009"),
    eggDeckArts: [] as string[],
  };
  const grant = vi.mocked(consumePrivateSealedRoomGrant);
  grant.mockImplementationOnce(async (input) => {
    if (input.capability !== capability) throw new Error("Unexpected sealed capability");
    return { code: "REPLAY", gameId };
  });
  const authorize = vi.spyOn(PrivateSealedStore.prototype, "authorize").mockImplementation(async (input) => {
    const seat = input.token === "sealed-replay-token-0" ? 0 : input.token === "sealed-replay-token-1" ? 1 : -1;
    if (input.gameId !== gameId || input.roomId !== room.roomId || (seat !== 0 && seat !== 1)) {
      throw new Error("Unexpected sealed authorization");
    }
    return { seat, name: "Replay entrant", deck: structuredClone(deck) };
  });
  try {
    await room.onCreate({ privateSealedRoom: true, privateSealedCapability: capability });
    expect(grant).toHaveBeenCalledTimes(1);
    expect(room.state.rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    driver.scenarioFixture = fixture;
    const clients = [0, 1].map((seat) => ({ sessionId: `sealed-replay-${seat}`, send: () => {} }) as unknown as Client);
    for (const [seat, client] of clients.entries()) {
      const options = {
        privateSealedGame: { gameId, roomId: room.roomId, token: `sealed-replay-token-${seat}` },
        displayName: "Untrusted entrant",
        deck: { mainDeck: [] as string[], eggDeck: [] as string[] },
      };
      expect(await room.onAuth(client, options)).toBe(true);
      room.clients.push(client);
      room.onJoin(client, options);
    }
    expect(authorize).toHaveBeenCalledTimes(2);
    driver.startScenarioNow();
    await settle(() => driver.engine.breeding.isOpen);
    const player = room.state.players[0]!;
    const rookie = player.hand.find((card) => card.cardId === "BT1-029")!;
    const deckSize = player.deck.length;
    driver.handleIntent(clients[0]!, { type: "placeSealedRookie", instanceId: rookie.instanceId });
    await settle(() => room.state.phase === Phase.Main && driver.engine.mainPhase.isOpen);
    expect(player.breeding!.topCard.instanceId).toBe(rookie.instanceId);
    expect(player.deck).toHaveLength(deckSize);
    driver.handleIntent(clients[0]!, {
      type: "digivolve",
      instanceId: player.hand.find((card) => card.cardId === "BT1-016")!.instanceId,
      permanentId: player.breeding!.permanentId,
    });
    await settle(
      () => driver.engine.mainVerbContinuationsInFlight === 0 && player.breeding?.topCard.cardId === "BT1-016",
    );
    const record = extractReplay(lines, room.state.matchLogId);
    expect(record.rules.rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    const placement = record.inputs.find(
      (input) => input.kind === "intent" && input.intent.type === "placeSealedRookie",
    );
    expect(placement).toMatchObject({ kind: "intent", ok: true, intent: { instanceId: rookie.instanceId } });
    const cut = record.inputs.findIndex((input) => input.kind === "intent" && input.intent.type === "digivolve");
    expect(cut).toBeGreaterThan(0);
    const prefix = await runReplay(record, { untilInput: cut, stopOnDivergence: true });
    const snapshot = JSON.parse(JSON.stringify(prefix.getSnapshot()));
    const replay = await runReplay(record, { stopOnDivergence: true });
    const restored = await runReplay(record, { snapshot, stopOnDivergence: true });
    expect(prefix.divergences).toEqual([]);
    expect(replay.divergences).toEqual([]);
    expect(restored.divergences).toEqual([]);
    expect(restored.state.toJSON()).toEqual(replay.state.toJSON());
    expect(restored.state.rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    expect(createEngineSchemaCloner().clone(restored.state).rulesPolicy).toBe(GameRulesPolicy.SEALED.value);
    expect(restored.state.players[0]!.breeding!.topCard.cardId).toBe("BT1-016");
    expect(restored.state.memory).toBe(room.state.memory);
    expect(restored.state.players[0]!.deck.length).toBe(player.deck.length);
    expect(JSON.stringify(record)).not.toContain('"packs"');
  } finally {
    try {
      stop();
      room.onDispose();
      room.clock.stop();
    } finally {
      authorize.mockRestore();
      grant.mockReset();
    }
  }
});
