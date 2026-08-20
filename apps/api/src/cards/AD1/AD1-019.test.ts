import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-019 Matt Ishida & T.K. Takaishi", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-019");
    const compiled = registeredCompiledCards.get("AD1-019") ?? getCompiledCard("AD1-019");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-019");
    expect(definition?.nameEn).toBe("Matt Ishida & T.K. Takaishi");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("suspends itself and plays an ADVENTURE card after an ADVENTURE digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-019", as: "tamer" }, { card: "ST20-10", as: "base" }],
        hand: [{ card: "AD1-001", as: "evolving" }, { card: "AD1-001", as: "adventure" }],
      },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "AD1-001" && perm.permanentId !== s.perm("base").permanentId));
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
