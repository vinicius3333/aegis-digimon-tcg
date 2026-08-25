import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-029.js";

describe("BT22-029 Shoemon", () => {
  it("grants Blocker to one Puppet Digimon on play/deletion and reduces an opponent Digimon's DP when attacking", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        duration: "untilOpponentTurnEnd",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
          count: 1,
        },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      });
    }
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("grants Blocker only to one Puppet through both printed timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.OnDeletion]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT22-029", as: "shoemon" },
              { card: "BT22-032", as: "puppet" },
              { card: "BT22-024", as: "nonPuppet" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("shoemon"));
      await settle();

      expect(
        [s.perm("shoemon"), s.perm("puppet")].filter((permanent) => observe(s.engine).hasKeyword(permanent, "Blocker")),
      ).toHaveLength(1);
      expect(observe(s.engine).hasKeyword(s.perm("nonPuppet"), "Blocker")).toBe(false);
    }
  });

  it("applies inherited -2000 DP once per turn from a realistic Puppet stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-032", under: ["BT22-029"], as: "host" }] },
        1: {
          battleArea: [
            { card: "BT22-024", as: "firstTarget" },
            { card: "BT22-024", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstDP = s.perm("firstTarget").currentDP;
    const secondDP = s.perm("secondTarget").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.perm("firstTarget").currentDP).toBe(firstDP - 2000);
    expect(s.perm("secondTarget").currentDP).toBe(secondDP);
  });
});
