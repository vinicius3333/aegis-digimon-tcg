import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-026 ZeigGreymon", () => {
  it("preserves conditional bounce, under-Tamer play, mandatory Save continuation, and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-026");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "DeDigivolve", amount: 2 },
          { kind: "Return", to: "hand", condition: { kind: "opponentHas", countMin: 2 } },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["underTamers"],
            payCost: false,
            optional: true,
            abortOnDecline: true,
            target: { filter: { zone: "underTamers", playCostLte: 5 } },
          },
          { kind: "PlaceUnder", optional: false, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] },
    ]);
  });
});
