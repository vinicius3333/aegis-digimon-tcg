import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-029.js";

describe("BT17-029", () => {
  it("draws by suspending a yellow Tamer while attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Draw", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } }] });
  });

  it("reduces all opposing security Digimon by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }] });
  });
});
