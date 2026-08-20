import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-041.js";

describe("BT23-041 Kabuterimon", () => {
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
  });

  it("declares Alliance", () => {
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
});
