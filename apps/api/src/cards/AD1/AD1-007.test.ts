import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-007 Siriusmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-007");
    const compiled = registeredCompiledCards.get("AD1-007") ?? getCompiledCard("AD1-007");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-007");
    expect(definition?.nameEn).toBe("Siriusmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));

  });

  it("places three qualifying Gammamon-text Digimon and deletes only within its DP ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "canoweissmon" },
            { card: "BT10-050", as: "wezen" },
            { card: "BT10-078", as: "gulus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 12000 },
            { card: "BT1-010", as: "over-ceiling", dp: 12001 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("siriusmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
  });
});
