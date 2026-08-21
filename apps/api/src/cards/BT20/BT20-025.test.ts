import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-025.js";

describe("BT20-025 Wingdramon", () => {
  it("deletes up to 6000 DP and is treated as Slayerdramon only while in play", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 } }] });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "GrantStatic", target: { isSelf: true }, grant: "name", tokens: ["Slayerdramon"] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }]);
  });
});
