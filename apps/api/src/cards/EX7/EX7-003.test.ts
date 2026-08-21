import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-003.js";

describe("EX7-003 Kyaromon", () => {
  it("inherits -2000 DP to the opposing security Digimon battle value on your turn", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifySecurityDP", amount: -2000, duration: "permanent" }] }));
});
