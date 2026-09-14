import { Client } from "colyseus.js";
import {
  CATALOG_DECKS,
  DECISION_CHANNEL,
  EVENT_CHANNEL,
  GameState,
  ROOM_TYPE_BOT,
  type DecisionRequest,
  type ServerEvent,
} from "@aegis/shared";
import { expect, it, vi } from "vitest";
import { roomRegistry } from "@aegis-api/rooms/AegisRoom.js";
import { startTestServer } from "./scenarioHarness/server";

it("runs the arena security battle through a real server and websocket intents", async () => {
  const server = await startTestServer();
  const room = await new Client(server.endpoint).create<GameState>(ROOM_TYPE_BOT, {
    displayName: "Arena tester",
    deck: CATALOG_DECKS.find((entry) => entry.deckId === "bt26-dgo-2026-08-28-7-chronomon")!.decklist,
    devScenario: "arena",
  });
  const events: ServerEvent[] = [];
  const decisions: DecisionRequest[] = [];
  room.onMessage(EVENT_CHANNEL, (event: ServerEvent) => events.push(event));
  room.onMessage(DECISION_CHANNEL, (request: DecisionRequest) => {
    decisions.push(request);
    if (request.kind === "orderTriggers") {
      room.send("respondDecision", {
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: request.options?.triggerKeys?.slice(0, 1) ?? [] },
      });
    } else if (request.kind === "optional") {
      room.send("respondDecision", {
        decisionId: request.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
  });
  try {
    await vi.waitFor(() => expect(roomRegistry.get(room.roomId)?.clients).toHaveLength(1));
    expect(roomRegistry.get(room.roomId)!.addBot("bt26-dgo-2026-08-28-8-plutomon")).toBe(true);
    await vi.waitFor(() => expect(room.state.phase).toBe("Breeding"));
    expect(room.state.pendingDecision).toBeUndefined();
    expect(room.state.players[0]!.battleArea).toHaveLength(3);
    const authoritative = roomRegistry.get(room.roomId)!.state;
    for (const seat of [0, 1] as const) {
      const player = authoritative.players[seat]!;
      const permanents = [...player.battleArea, ...(player.breeding ? [player.breeding] : [])];
      const cards = [
        ...player.deck,
        ...player.eggDeck,
        ...player.hand,
        ...player.security,
        ...player.trash,
        ...permanents.flatMap((permanent) => [permanent.topCard!, ...permanent.stack]),
      ];
      const deckId = seat === 0 ? "bt26-dgo-2026-08-28-7-chronomon" : "bt26-dgo-2026-08-28-8-plutomon";
      const recipe = CATALOG_DECKS.find((entry) => entry.deckId === deckId)!.decklist;
      expect(cards.map((card) => card.cardId).sort()).toEqual([...recipe.mainDeck, ...recipe.eggDeck].sort());
      expect(new Set(cards.map((card) => card.instanceId)).size).toBe(cards.length);
      expect(player.breeding!.inBreeding).toBe(true);
    }
    expect(room.state.players[1]!.securityCount).toBe(5);
    room.send("moveFromBreeding", { permanentId: "you-breeding" });
    await vi.waitFor(() => expect(room.state.phase).toBe("Main"));
    await vi.waitFor(() => {
      const hyokomonEffects = events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-009",
      );
      expect(hyokomonEffects).toHaveLength(2);
      expect(hyokomonEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sourcePermanentId: "you-hyokomon", sourceInstanceId: expect.any(String) }),
          expect.objectContaining({ sourcePermanentId: "you-breeding", sourceInstanceId: expect.any(String) }),
        ]),
      );
    });
    expect(decisions.filter((request) => request.kind === "optional" && request.sourceCardId === "BT26-009")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourcePermanentId: "you-hyokomon", sourceInstanceId: expect.any(String) }),
        expect.objectContaining({ sourcePermanentId: "you-breeding", sourceInstanceId: expect.any(String) }),
      ]),
    );
    room.send("attack", { attackerPermanentId: "you-hyokomon", target: { kind: "player" } });
    await vi.waitFor(
      () => {
        const check = events.find((event) => event.kind === "securityChecked");
        expect(check).toMatchObject({ kind: "securityChecked", revealedCardId: "BT24-045", resolution: "battle" });
      },
      { timeout: 15000 },
    );
    const check = events.find((event) => event.kind === "securityChecked")!;
    if (check.kind !== "securityChecked") throw new Error("Missing check");
    expect(check.battle!.attackerDP).toBeGreaterThan(0);
    expect(check.battle!.securityCardDP).toBe(4000);
    await vi.waitFor(() => expect(room.state.players[1]!.securityCount).toBe(4));
    expect(events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(events.some((event) => event.kind === "actionRejected")).toBe(false);
  } finally {
    await room.leave();
    await server.close();
  }
}, 20000);
