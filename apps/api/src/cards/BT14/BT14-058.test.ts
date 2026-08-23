import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-058.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-058", () => {
  it("may grant own Digimon Rush on play or digivolution by placing Satsuki Tamahime underneath", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Rush" },
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          target: { filter: { nameOrTrait: [{ tokens: ["Satsuki Tamahime"], match: "name" }] } },
        },
      });
  });
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("runtime", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-058", as: "numemon" },
            { card: "BT14-086", as: "satsuki" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("numemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const p = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT14-058");
      return (
        p !== undefined && p.stack.some((card) => card.cardId === "BT14-086") && observe(s.engine).hasKeyword(p, "Rush")
      );
    });
    const p = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT14-058")!;
    expect(observe(s.engine).hasKeyword(p, "Rush")).toBe(true);
  });
});
