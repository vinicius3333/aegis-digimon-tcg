import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-063.js";

describe("BT23-063 Sangloupmon", () => {
  it("digivolves the attacking source into an Undead card from trash and pays its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: "BT23-066", as: "matadormon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const before = s.state.memory;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnUseAttack, {
      subjectPermanentId: s.perm("sangloupmon").permanentId,
    });
    expect(s.perm("sangloupmon").topCard?.cardId).toBe("BT23-066");
    expect(s.state.memory).toBe(before - 3);
  });

  it("may digivolve itself into an Undead or CS Digimon from trash while attacking", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited) as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, isSelf: true },
      into: { nameOrTrait: [{ tokens: ["Undead", "CS"], match: "trait" }] },
      from: ["trash"],
      payCost: true,
      optional: true,
    });
  });

  it("has the inherited once-per-turn trash digivolution into Undead or Dark Animal", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking" && entry.isInherited) as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] } },
          into: { nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
        },
      ],
    });
  });

  it("requires a level 3 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
  });
});
