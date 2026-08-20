import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-002 Aldamon", () => {
  it("deletes an opposing Digimon within its DP ceiling when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "AD1-002", as: "aldamon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("aldamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-002", as: "aldamon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aldamon").instanceId })).toEqual({ ok: false, reason: "insufficient-memory" });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-002");
    const compiled = registeredCompiledCards.get("AD1-002") ?? getCompiledCard("AD1-002");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-002");
    expect(definition?.nameEn).toBe("Aldamon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });
});
