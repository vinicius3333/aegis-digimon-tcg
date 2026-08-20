import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-036.js";

describe("EX5-036 Aquilamon", () => {
  it("has Fortitude and gains 1000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Fortitude" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } });
  });
});
