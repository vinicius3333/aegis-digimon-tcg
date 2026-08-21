import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-059.js";

describe("EX8-059", () => {
  it("makes an opposing Digimon gain an On Deletion effect that trashes a card in your hand on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      effectText: "[On Deletion] Trash 1 card in your hand.",
      optional: true,
      cost: { kind: "trash" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
    });
  });
  it("inherits draw 1 then trash 1 when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { count: 1 } }],
    }));
});
