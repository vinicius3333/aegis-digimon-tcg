import { expect, it } from "vitest";
import type { Client } from "colyseus";
import type { Intent } from "@aegis/shared/protocol/intents";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { Phase } from "@aegis/shared/schema/enums";
import { AegisRoom } from "#api/rooms/AegisRoom";
import type { GameEngine } from "#api/engine/GameEngine";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import fixture from "#api/engine/scenarios/sealed-rookie-placement.fixture";
import { addLogSink } from "#api/logger";
import { settle } from "#api/engine/testkit/harness";
import { extractReplay } from "#api/replays/inputs/extract";
import { runReplay } from "#api/replays/inputs/run";

type Driver = {
  tournamentRules: unknown;
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
  driver.tournamentRules = {
    format: "standard",
    banlistCards: [],
    sealedConfiguration: getSealedConfiguration({ setId: "BT4" }),
  };
  try {
    await room.onCreate({ seed: 42 });
    driver.scenarioFixture = fixture;
    const clients = [0, 1].map((seat) => ({ sessionId: `sealed-replay-${seat}`, send: () => {} }) as unknown as Client);
    for (const client of clients) {
      room.clients.push(client);
      room.onJoin(client, {
        displayName: "Replay entrant",
        deck: { mainDeck: Array<string>(40).fill("BT1-009"), eggDeck: [] },
      });
    }
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
    expect(restored.state.players[0]!.breeding!.topCard.cardId).toBe("BT1-016");
    expect(restored.state.memory).toBe(room.state.memory);
    expect(restored.state.players[0]!.deck.length).toBe(player.deck.length);
    expect(JSON.stringify(record)).not.toContain('"packs"');
  } finally {
    stop();
    room.onDispose();
    room.clock.stop();
  }
});
