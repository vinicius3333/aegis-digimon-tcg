import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-100.js";

describe("BT14-100", () => {
  it("draws when trashed from hand by an effect and deletes an opposing level 4 or lower Digimon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenTrashedFromHand", actions: [{ kind: "Draw", amount: 1 }] });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } });
  });
  it("activates main in security", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }));
});
