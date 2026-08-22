import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-044.js";

describe("BT24-044 Muchomon", () => {
  it("suspends either side, searches two distinct printed categories only after suspending your Digimon", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        expect.objectContaining({
          kind: "Suspend",
          optional: true,
          target: { filter: { controllerDefault: "any", levelComparison: { op: "lte", value: 6 } } },
        }),
        expect.objectContaining({
          kind: "RevealAdd",
          revealCount: 3,
          condition: { kind: "lastSuspendedIsMine" },
          add: [{ to: "hand" }, { to: "hand" }],
          rest: "deckBottom",
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn" });
  });
});
