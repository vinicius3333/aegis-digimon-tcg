import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT10-022.js";

describe("BT10-022 Brachiomon", () => {
  it("is represented as the printed vanilla green level 5 Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-022", as: "brachiomon" }] } });
    await s.ready();
    const card = s.inst("brachiomon");
    const definition = getCardDefinition(card.cardId)!;
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === card.instanceId)).toBe(true);
    expect(definition.level).toBe(5);
    expect(definition.colors).toEqual(["Blue", "Black"]);
    expect(definition.playCost).toBe(6);
    expect(definition.dp).toBe(9000);
    expect(definition.effectText).toBeUndefined();
  });
});
