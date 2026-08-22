import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-077.js";

describe("BT13-077 Craniamon", () => {
  it("grants Blocker and opponent-Digimon effect immunity through the opponent's turn", () => {
    expect(
      compiled.effects
        ?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))
        .every((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Blocker")),
    ).toBe(true);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
        actions: [
          {
            kind: "GrantStatic",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            grant: "immuneToOpponentDigimonEffects",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
  });

  it("redirects an opponent's end-of-turn attack after choosing a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      actions: [
        { kind: "RedirectAttack", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
  });

  it("installs opponent Digimon-effect immunity when played", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-077", as: "craniamon" }] } });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("craniamon"));
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("craniamon"), "whenDigivolving"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("craniamon"), "whenDigivolving")).toBe(true);
  });
});
