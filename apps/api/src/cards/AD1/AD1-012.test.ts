import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-012 CresGarurumon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-012");
    const compiled = registeredCompiledCards.get("AD1-012") ?? getCompiledCard("AD1-012");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-012");
    expect(definition?.nameEn).toBe("CresGarurumon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("returns exactly one opposing lowest-level Digimon to its owner's hand on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "AD1-012", as: "cres" }] },
      1: { battleArea: [{ card: "BT1-010", as: "lowest" }, { card: "AD1-001", as: "higher" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cres").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("higher").permanentId);
  });
});
