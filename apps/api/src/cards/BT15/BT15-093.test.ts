import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-093.js";

describe("BT15-093", () => {
  it("gives one opposing Digimon -6000 DP, then requires security payment for a second -6000 DP effect", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      cost: { kind: "trash" },
    });
  });

  it("naturally applies both reductions to the same opposing Digimon after trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-033", as: "source" }],
          hand: [{ card: "BT15-093", as: "option" }],
          security: [{ card: "BT15-034", as: "top" }, { card: "BT15-037", as: "bottom" }],
        },
        1: { battleArea: [{ card: "BT15-052", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("bottom").instanceId);
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));
});
