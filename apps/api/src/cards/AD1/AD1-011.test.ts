import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-011 Paildramon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-011");
    const compiled = registeredCompiledCards.get("AD1-011") ?? getCompiledCard("AD1-011");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-011");
    expect(definition?.nameEn).toBe("Paildramon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("protects the digivolved Paildramon from battle deletion until the opponent's turn ends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-053", as: "base" }], hand: [{ card: "AD1-011", as: "paildramon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent", dp: 12000 }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("paildramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "AD1-011");
    await settle(() => false, 40);

    const continuous = (s.engine as unknown as { continuous: { hasRestriction(id: string, restriction: string): boolean } }).continuous;
    expect(continuous.hasRestriction(s.perm("base").permanentId, "beDeletedInBattle")).toBe(true);
  });
});
