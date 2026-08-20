import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-001 Greymon", () => {
  it("returns a matching Greymon-family card from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-001", as: "greymon" }],
          trash: [{ card: "AD1-010", as: "trashGarurumon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(false);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-001", as: "greymon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({ ok: false, reason: "insufficient-memory" });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-001");
    const compiled = registeredCompiledCards.get("AD1-001") ?? getCompiledCard("AD1-001");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-001");
    expect(definition?.nameEn).toBe("Greymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });
});
