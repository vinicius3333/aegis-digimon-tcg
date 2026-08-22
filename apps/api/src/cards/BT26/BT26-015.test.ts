import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-015.js";
import "./BT26-015.js";

describe("BT26-015 compiled fidelity", () => {
  it("encodes the shared play/evolution debuff, trash return deletion, and deck-add buff attack", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -4000 },
      { kind: "Return", to: "deckBottom", trackCount: "returnedTrash" },
      { kind: "Delete", condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenEffectAddsToDeck",
        actions: [{ kind: "SelectBind" }, { kind: "ModifyDP", amount: 3000 }, { kind: "Attack" }],
      },
    ]);
  });
});
