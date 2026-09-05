import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-053.js";

describe("EX6-053 LadyDevimon", () => {
  it("has Retaliation and deletes a level 4 or lower Digimon when Mirei is present", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Retaliation");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      condition: { kind: "youHave" },
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    });
  });
  it("plays Mirei from trash only when absent and inherits conditional Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "youHaveNone" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Scapegoat" } },
          while: { kind: "selfHasTrait" },
        },
      ],
    });
  });
  it("publicly deletes an opposing level 4 Digimon when Mirei is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-053", as: "lady" },
            { card: "EX6-074", as: "mirei" },
          ],
        },
        1: { battleArea: [{ card: "BT1-053", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lady"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
