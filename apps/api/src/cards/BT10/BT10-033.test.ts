import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-033.js";
describe("BT10-033 Shortmon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-033")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Yellow"], 4, 3, 3000, undefined]);
    expect(d.evoCosts).toEqual([{ color: "Yellow", level: 3, memoryCost: 1 }]);
    expect(d.forms).toEqual(["Champion"]);
    expect(d.attributes).toEqual(["Data"]);
    expect(d.types).toEqual(["Food"]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 3 and digivolves from a yellow level 3 for 1 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-030", as: "base" }],
        hand: [
          { card: "BT10-033", as: "evolving" },
          { card: "BT10-033", as: "playing" },
        ],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(3);

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
