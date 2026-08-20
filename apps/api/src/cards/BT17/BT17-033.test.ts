import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-033.js";

describe("BT17-033", () => {
  it("gains 3000 DP while attacking by suspending a yellow Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "ModifyDP", amount: 3000, duration: "forTheTurn", optional: true, abortOnDecline: true, cost: { kind: "suspend" } }] });
  });

  it("reduces opposing Digimon DP by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: -3000, duration: "permanent", target: { count: "all" } }] });
  });
});
