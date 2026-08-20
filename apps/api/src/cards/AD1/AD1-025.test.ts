import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-025 Omnimon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-025");
    const compiled = registeredCompiledCards.get("AD1-025") ?? getCompiledCard("AD1-025");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-025");
    expect(definition?.nameEn).toBe("Omnimon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("bottom-decks opponent Digimon with no more sources than itself, then deletes one", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "AD1-025", as: "omnimon" }] },
      1: { battleArea: [{ card: "BT1-019", as: "no-sources" }, { card: "BT1-020", as: "with-sources", under: ["BT1-010", "BT1-015"] }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 15;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-019");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([]);
  });
});
