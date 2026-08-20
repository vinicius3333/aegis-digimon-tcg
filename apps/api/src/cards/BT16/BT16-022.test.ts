import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-022.js";

describe("BT16-022", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("trashes digivolution cards and grants Security Attack -1", () => {
    const actions = compiled.effects?.[1]?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, target: expect.objectContaining({ count: 1 }) });
    expect(actions?.[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" });
  });
});
