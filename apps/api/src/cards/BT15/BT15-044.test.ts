import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-044.js";

describe("BT15-044", () => {
  it("prevents one opposing Digimon from unsuspending until the opponent's turn ends on deletion", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }],
    }));
});
