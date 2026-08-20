import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-008 Gallantmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-008");
    const compiled = registeredCompiledCards.get("AD1-008") ?? getCompiledCard("AD1-008");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-008");
    expect(definition?.nameEn).toBe("Gallantmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("deletes the opponent's lowest-DP Digimon when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-014", as: "base" }], hand: [{ card: "AD1-008", as: "gallantmon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "low", dp: 5000 }, { card: "BT1-010", as: "high", dp: 6000 }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("gallantmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
  });
});
