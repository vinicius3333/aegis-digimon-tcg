import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-010.js";

describe("BT10-010 Asuramon", () => {
  it("has the exact vanilla catalog identity and plays for 7 without opening an effect", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-010", as: "asuramon" }] } });
    const card = s.inst("asuramon");
    const definition = requireCardDefinition(card.cardId);
    expect(card.cardId).toBe("BT10-010");
    expect(definition.level).toBe(5);
    expect(definition.colors).toEqual(["Red"]);
    expect(definition.playCost).toBe(7);
    expect(definition.dp).toBe(8000);
    expect(definition.forms).toEqual(["Ultimate"]);
    expect(definition.attributes).toEqual(["Vaccine"]);
    expect(definition.types).toEqual(["Wizard"]);
    expect(definition.effectText ?? "").not.toContain("[On Play]");

    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === card.instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a red level 4 for exactly 2 and preserves the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-009", as: "base" }],
        hand: [{ card: "BT10-010", as: "asuramon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("asuramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("asuramon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT10-009")).toBe(true);
  });
});
