import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-041.js";

describe("BT23-041 Kabuterimon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-041")).toMatchObject({
      cardId: "BT23-041",
      nameEn: "Kabuterimon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Insectoid", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives Piercing and +3000 DP to the same selected Digimon when it suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ally" },
            { card: "BT23-041", as: "kabuterimon", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const allyBaseDp = s.perm("ally").currentDP;
    const kabuterimonBaseDp = s.perm("kabuterimon").currentDP;

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("kabuterimon").permanentId,
    });

    const allyPiercing = observe(s.engine).hasPierce(s.perm("ally"));
    const kabuterimonPiercing = observe(s.engine).hasPierce(s.perm("kabuterimon"));
    expect([allyPiercing, kabuterimonPiercing].filter(Boolean)).toHaveLength(1);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + (allyPiercing ? 3000 : 0));
    expect(s.perm("kabuterimon").currentDP).toBe(kabuterimonBaseDp + (kabuterimonPiercing ? 3000 : 0));

    const selected = allyPiercing ? s.perm("ally") : s.perm("kabuterimon");
    const afterFirst = selected.currentDP;
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("kabuterimon").permanentId,
    });
    expect(selected.currentDP).toBe(afterFirst);
  });

  it("exposes Alliance through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-041", as: "kabuterimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kabuterimon"), "Alliance")).toBe(true);
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn reacts only when this Digimon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "Piercing" },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    });
  });

  it("does not react when another Digimon suspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-041", as: "kabuterimon" },
          { card: "BT1-009", as: "ally" },
        ],
      },
    });
    const kabuterimonDp = s.perm("kabuterimon").currentDP;
    const allyDp = s.perm("ally").currentDP;
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("ally").permanentId });
    expect(s.perm("kabuterimon").currentDP).toBe(kabuterimonDp);
    expect(s.perm("ally").currentDP).toBe(allyDp);
  });

  it("digivolves for 2 from an off-color level-3 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-037", as: "base" }], hand: [{ card: "BT23-041", as: "kabuterimon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-003", as: "base" }], hand: [{ card: "BT23-041", as: "kabuterimon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
