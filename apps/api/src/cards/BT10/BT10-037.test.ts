import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-037.js";
describe("BT10-037 Weddinmon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-037")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Yellow"], 5, 7, 8000, undefined]);
    expect(d.evoCosts).toEqual([{ color: "Yellow", level: 4, memoryCost: 2 }]);
    expect(d.forms).toEqual(["Ultimate"]);
    expect(d.attributes).toEqual(["Vaccine"]);
    expect(d.types).toEqual(["Fairy"]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 7 and digivolves from a yellow level 4 for 2 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-033", as: "base" }],
        hand: [
          { card: "BT10-037", as: "evolving" },
          { card: "BT10-037", as: "playing" },
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
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("playing").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
