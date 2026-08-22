import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-028.js";

describe("BT21-028 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("requires the printed bottom-material cost before each lowest-DP deletion", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: { from: ["hand"] },
        },
      });
      expect(effect?.actions[0]).not.toHaveProperty("optional");
      expect(effect?.actions[0]).not.toHaveProperty("abortOnDecline");
    }
  });

  it("places a qualifying hand card under itself before deleting the lowest-DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon" }],
          hand: [{ card: "BT21-010", as: "gammamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("siriusmon"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowId));

    expect(s.perm("siriusmon").stack.some((card) => card.cardId === "BT21-010")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
  });
});
