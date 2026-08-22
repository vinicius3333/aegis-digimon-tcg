import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-075.js";
import "../index.js";
describe("BT21-075 SkullGreymon", () => {
  it("grants Raid and Retaliation and recurs ADVENTURE", () => {
    for (const t of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((e) => e.trigger === t)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Raid" } });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        target: { sameTarget: true },
      });
    }
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
    expect(compiled.effects.find((e) => e.trigger === "OnDeletion" && e.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays a qualifying ADVENTURE Digimon from trash when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-075", as: "skullgreymon" }],
          trash: [{ card: "BT21-057", as: "adventureGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-057"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-057")).toBe(true);
  });
});
