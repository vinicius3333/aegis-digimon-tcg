import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-015 Beowolfmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-015");
    const compiled = registeredCompiledCards.get("AD1-015") ?? getCompiledCard("AD1-015");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-015");
    expect(definition?.nameEn).toBe("Beowolfmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("reduces an opposing Digimon by exactly 4000 DP when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "base" }], hand: [{ card: "AD1-015", as: "beowolf" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("beowolf").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });
});
