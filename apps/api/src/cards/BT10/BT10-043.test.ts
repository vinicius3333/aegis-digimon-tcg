import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-043.js";
describe("BT10-043 Mushroomon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-043")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Green"], 3, 2, 3000, undefined]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 2, memoryCost: 0 }]);
    expect(d.forms).toEqual(["Rookie"]);
    expect(d.attributes).toEqual(["Virus"]);
    expect(d.types).toEqual(["Vegetation"]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 2 and digivolves from a green level 2 for 0 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-004", as: "base" }],
        hand: [
          { card: "BT10-043", as: "evolving" },
          { card: "BT10-043", as: "playing" },
        ],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(2);

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
