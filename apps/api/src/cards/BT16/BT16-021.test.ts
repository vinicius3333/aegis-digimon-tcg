import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-021.js";

describe("BT16-021", () => {
  it("models Blocker and Armor Purge", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }] });
  });

  it("trashes and restricts an opponent Digimon when it suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ actions: [
      expect.objectContaining({ kind: "Trash", target: expect.objectContaining({ count: 1 }) }),
      expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
    ] });
  });
});
