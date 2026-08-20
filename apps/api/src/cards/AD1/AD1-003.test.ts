import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-003 WarGrowlmon", () => {
  it("plays Takato and deletes an opposing Digimon at the printed DP limit when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "AD1-003", as: "wargrowlmon" }, { card: "BT12-089", as: "takato" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("wargrowlmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("takato").instanceId)).toBe(true);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-003", as: "wargrowlmon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({ ok: false, reason: "insufficient-memory" });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-003");
    const compiled = registeredCompiledCards.get("AD1-003") ?? getCompiledCard("AD1-003");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-003");
    expect(definition?.nameEn).toBe("WarGrowlmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });
});
