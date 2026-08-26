import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-022.js";

describe("BT10-022 Brachiomon", () => {
  it("is represented as the printed vanilla blue/black level 5 Digimon", async () => {
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
    expect(definition.evoCosts).toEqual([
      { color: "Blue", level: 4, memoryCost: 3 },
      { color: "Black", level: 4, memoryCost: 3 },
    ]);
    expect(definition.forms).toEqual(["Ultimate"]);
    expect(definition.attributes).toEqual(["Data"]);
    expect(definition.types).toEqual(["Plesiosaur"]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 6 and digivolves from a black level 4 for 3 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-062", as: "base" }],
        hand: [
          { card: "BT10-022", as: "evolving" },
          { card: "BT10-022", as: "playing" },
        ],
      },
    });
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("playing").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
