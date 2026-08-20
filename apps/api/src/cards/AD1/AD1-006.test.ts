import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-006 Shoutmon X7", () => {
  it("bottom-decks an opposing Digimon within its DP ceiling when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-006", as: "x7" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-010");
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-006", as: "x7" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: false, reason: "insufficient-memory" });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-006");
    const compiled = registeredCompiledCards.get("AD1-006") ?? getCompiledCard("AD1-006");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-006");
    expect(definition?.nameEn).toBe("Shoutmon X7");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });
});
