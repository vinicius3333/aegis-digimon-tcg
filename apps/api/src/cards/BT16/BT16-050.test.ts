import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-050.js";

describe("BT16-050", () => {
  it("gives your other D-Brigade or DigiPolice Digimon 1000 DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { filter: { controller: "mine", excludeSelf: true }, count: "all" } }] });
  });

  it("retains the same DP effect as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
