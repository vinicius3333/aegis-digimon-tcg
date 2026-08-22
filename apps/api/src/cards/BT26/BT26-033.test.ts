import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-033.js";
import "../index.js";

describe("BT26-033 compiled fidelity", () => {
  it("encodes keywords, security recovery, leave prevention, and the explicit turn seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(
      expect.arrayContaining(["Raid", "Alliance", "Engage"]),
    );
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand" },
      {
        kind: "Modal",
        condition: { kind: "isYourTurn" },
        options: [[{ kind: "PlayWithoutCost", reduceCostBy: 5 }], [{ kind: "UseOptionWithoutCost", reduceCostBy: 5 }]],
      },
    ]);
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          mode: "prevent",
          cost: { kind: "placeAsSecurity", position: "bottom", target: { filter: { isSelfRef: true }, isSelf: true } },
        },
      ],
    });
  });
});
