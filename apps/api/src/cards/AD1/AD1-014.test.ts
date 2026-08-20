import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-014 MetalGarurumon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-014");
    const compiled = registeredCompiledCards.get("AD1-014") ?? getCompiledCard("AD1-014");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-014");
    expect(definition?.nameEn).toBe("MetalGarurumon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("deletes one opposing level-five-or-lower Digimon on play and leaves a higher level intact", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "AD1-014", as: "metal" }] },
      1: { battleArea: [{ card: "BT1-010", as: "low" }, { card: "AD1-014", as: "high" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
  });
});
