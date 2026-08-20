import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-031.js";

describe("BT16-031", () => {
  it("models Barrier", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
  });

  it("returns a multicolor red and purple level 6 or lower Digimon from trash", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
      expect(effect.actions?.[0]).toMatchObject({ target: { filter: { zone: "trash", multicolor: true, colors: ["Red", "Purple"], levelComparison: { op: "lte", value: 6 } } } });
    }
    expect(compiled.effects?.[3]).toMatchObject({ isInherited: true, actions: [{ kind: "ModifyDP", amount: -3000, duration: "permanent" }] });
  });
});
