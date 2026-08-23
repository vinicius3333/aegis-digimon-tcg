import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-074.js";

describe("BT7-074 Antylamon", () => {
  it("plays a purple Tamer costing 3 or less from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "base" }],
          hand: [{ card: "BT7-074", as: "evolving" }],
          trash: [{ card: "BT7-091", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });
});
