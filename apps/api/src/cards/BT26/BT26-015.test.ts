import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-015.js";

describe("BT26-015 compiled fidelity", () => {
  it("encodes the shared play/evolution debuff, trash return deletion, deck-add buff attack, and explicit inherited seam", () => {
    const card = getCompiledCard("BT26-015");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["The inherited watcher still lacks a host-text predicate for 'this Digimon with Chronomon in its text'; the unsuspend action is retained without silently claiming that gate."]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "ModifyDP", amount: -4000 }, { kind: "Return", to: "deckBottom", trackCount: "returnedTrash" }, { kind: "Delete", condition: { kind: "ifThisEffectActed" } }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenEffectAddsToDeck", actions: [{ kind: "SelectBind" }, { kind: "ModifyDP", amount: 3000 }, { kind: "Attack" }] }]);
    expect(card?.effects?.[3]).toMatchObject({ isInherited: true, actions: [{ kind: "SubTrigger", event: "whenEffectAddsToDeck" }] });
  });
});
