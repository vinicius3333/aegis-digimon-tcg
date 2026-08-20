import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-022 Izzy Izumi & Tai Kamiya", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-022");
    const compiled = registeredCompiledCards.get("AD1-022") ?? getCompiledCard("AD1-022");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-022");
    expect(definition?.nameEn).toBe("Izzy Izumi & Tai Kamiya");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("suspends itself and digivolves a Digimon when another ADVENTURE card is played", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-022", as: "tamer" }, { card: "ST20-10", as: "base" }], hand: [{ card: "AD1-001", as: "trigger" }, { card: "AD1-001", as: "evolve" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "AD1-001");
    await settle(() => false, 60);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("AD1-001");
  });
});
