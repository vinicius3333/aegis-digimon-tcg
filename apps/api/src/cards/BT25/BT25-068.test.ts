import { describe, expect, it } from "vitest";
import { compiled as BT25_068 } from "./BT25-068.js";
import "../index.js";

describe("BT25-068 Angoramon", () => {
  it("de-digivolves an opponent when this Digimon suspends", () => {
    expect(BT25_068.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
    ]);
    const allTurns = BT25_068.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect((allTurns?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(BT25_068.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
    });
  });
});
