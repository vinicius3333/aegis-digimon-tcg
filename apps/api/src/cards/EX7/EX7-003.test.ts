import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-003.js";

describe("EX7-003 Togemon", () => {
  it("inherits permanent -2000 DP to all opposing Digimon on your turn", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: -2000, duration: "permanent", target: { count: "all" } }] }));
});
