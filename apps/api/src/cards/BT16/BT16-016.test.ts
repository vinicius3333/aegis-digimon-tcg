import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-016.js";

describe("BT16-016", () => {
  it("may digivolve into a level 4 Angel/Free from hand for 1 less on your turn or play", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }] });
  });
  it("trashes one opposing digivolution card when attacking as inherited", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }] }));
});
