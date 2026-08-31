import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-162.js";

describe("P-162 Coelamon", () => {
  it("protects one DS Digimon from DP reduction and opponent De-Digivolve effects", () => {
    const compiled = runtimeCompiledCard("P-162")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GrantStatic",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DS"], match: "trait" }] },
          count: 1,
        },
        grant: { kind: "Protection", protections: ["dpReduction", "deDigivolve"], from: "opponent" },
        duration: "untilOpponentTurnEnd",
      });
    }
  });

  it("encodes inherited Blocker and DS level-3 digivolution", () => {
    const compiled = runtimeCompiledCard("P-162")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["DS"], cost: 2, isAlternate: true }]);
  });

  it("protects a DS Digimon when Coelamon is played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-162", as: "coelamon" },
            { card: "BT26-018", as: "ds" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ds").permanentId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("coelamon"));
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("ds"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ds"), "cantBeDeDigivolved")).toBe(true);
  });
});
