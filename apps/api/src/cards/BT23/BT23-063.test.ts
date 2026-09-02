import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-063.js";

describe("BT23-063 Sangloupmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-063")).toMatchObject({
      cardId: "BT23-063",
      nameEn: "Sangloupmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Animal", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves the attacking source into an Undead card from trash and pays its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: "BT23-066", as: "matadormon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    const before = s.state.memory;
    await s.ready();
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

  it("accepts the CS branch independently when evolving itself from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-063", as: "sangloupmon" }],
          trash: [{ card: "BT23-067", as: "ladydevimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnUseAttack, { subjectPermanentId: s.perm("sangloupmon").permanentId });
    expect(s.perm("sangloupmon").topCard?.instanceId).toBe(s.inst("ladydevimon").instanceId);
    expect(s.state.memory).toBe(2);
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
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-048", as: "base" }], hand: [{ card: "BT23-063", as: "sangloupmon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("sangloupmon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT23-063", as: "sangloupmon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("sangloupmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
