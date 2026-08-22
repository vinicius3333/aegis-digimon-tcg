import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-003.js";

describe("EX5-003 Nyaromon", () => {
  it("gets 1000 DP while suspended on all turns", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });
});
