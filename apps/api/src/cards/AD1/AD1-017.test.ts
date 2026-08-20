import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-017 Dynasmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-017");
    const compiled = registeredCompiledCards.get("AD1-017") ?? getCompiledCard("AD1-017");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-017");
    expect(definition?.nameEn).toBe("Dynasmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("trashes one security card and gives every opposing Digimon -6000 DP on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "AD1-017", as: "dynasmon" }], security: ["BT1-028", "BT1-029"] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "chooseOption"));
    const choice = s.decisions.find((decision) => decision.req.kind === "chooseOption");
    expect(choice).toBeDefined();
    s.engine.applyIntent(0, { type: "respondDecision", decisionId: choice!.req.decisionId, response: { kind: "chooseOption", optionIndex: 0 } });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
