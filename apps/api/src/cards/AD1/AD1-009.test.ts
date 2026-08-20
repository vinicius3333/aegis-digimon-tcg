import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-009 BlitzGreymon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-009");
    const compiled = registeredCompiledCards.get("AD1-009") ?? getCompiledCard("AD1-009");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-009");
    expect(definition?.nameEn).toBe("BlitzGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("de-digivolves three sources on play and grants the same-turn Garurumon protection", async () => {
    const compiled = registeredCompiledCards.get("AD1-009") ?? getCompiledCard("AD1-009");
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-009", as: "blitz" }],
          battleArea: [{ card: "BT1-040", as: "garurumon" }],
        },
        1: { battleArea: [{ card: "ST6-08", as: "stacked", under: ["BT1-010", "BT1-009", "BT1-020"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("stacked").stack.length === 1);

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(compiled?.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      expect.anything(),
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" },
      { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" },
    ]);
  });
});
