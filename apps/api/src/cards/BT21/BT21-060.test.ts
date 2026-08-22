import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-060.js";

describe("BT21-060 Destromon", () => {
  it("uses the engine's stacked-card trash lock for the Digivolving protection", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toEqual({
      kind: "StackTrashLock",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Vemmon"], cost: 6, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("uses this stack's Vemmon cards for the inherited attack-prevention cost", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    const prevent = (inherited?.actions[0] as { actions?: unknown[] } | undefined)?.actions?.[0] as
      | { cost?: unknown }
      | undefined;

    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect(prevent).toMatchObject({ kind: "Prevent", optional: true, abortOnDecline: true });
    expect(prevent?.cost).toMatchObject({
      kind: "return",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
        },
        count: 2,
      },
    });
  });

  it("scales De-Digivolve by Vemmon cards in this Digimon's stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[1]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      scaling: {
        per: 2,
        unit: "digivolutionCards",
        filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
      },
    });
  });

  it("de-digivolves two cards when four Vemmon are in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-060", as: "destromon", under: ["BT21-056", "BT21-056", "BT21-056", "BT21-056"] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", under: ["BT1-010", "BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("destromon"));
    await settle(() => s.perm("opponent").stack.length === 0);

    expect(s.perm("opponent").stack).toHaveLength(0);
  });
});
