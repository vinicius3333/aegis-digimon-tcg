import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-018 LordKnightmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-018");
    const compiled = registeredCompiledCards.get("AD1-018") ?? getCompiledCard("AD1-018");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-018");
    expect(definition?.nameEn).toBe("LordKnightmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("de-digivolves an opposing Digimon by two when a Knightmon is played", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-018", as: "lord" }], hand: [{ card: "BT18-069", as: "knight" }] },
      1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").stack.length === 0);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });
});
