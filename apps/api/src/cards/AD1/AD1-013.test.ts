import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-013 ZeigGreymon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-013");
    const compiled = registeredCompiledCards.get("AD1-013") ?? getCompiledCard("AD1-013");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-013");
    expect(definition?.nameEn).toBe("ZeigGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("deletes the opponent's Digimon with the fewest digivolution cards on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "AD1-013", as: "zeig" }] },
      1: { battleArea: [{ card: "BT1-010", as: "no-sources" }, { card: "AD1-001", as: "with-source", under: ["BT1-010"] }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeig").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("with-source").permanentId);
  });
});
