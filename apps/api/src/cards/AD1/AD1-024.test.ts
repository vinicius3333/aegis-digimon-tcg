import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-024 Imperialdramon: Fighter Mode", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-024");
    const compiled = registeredCompiledCards.get("AD1-024") ?? getCompiledCard("AD1-024");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-024");
    expect(definition?.nameEn).toBe("Imperialdramon: Fighter Mode");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("suspends an opposing Digimon and unsuspends itself when a Digimon is played", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }], hand: [{ card: "BT1-010", as: "played" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended && !s.perm("fighter").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("fighter").isSuspended).toBe(false);
  });
});
