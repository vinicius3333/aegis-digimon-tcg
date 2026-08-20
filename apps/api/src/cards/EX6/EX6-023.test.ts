import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-023.js";

describe("EX6-023 Cho-Hakkaimon", () => {
  it("shares a once-per-turn DigiXros effect that grants Security Attack -1 and deletes a 6000 DP or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }, { kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } }, condition: { kind: "digiXrosCount", minimum: 1 } }]);
  });
  it("returns an opposing yellow Digimon to hand instead of leaving play", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "Return", to: "hand", target: { filter: { colors: ["Yellow"] } } }] }));
});
