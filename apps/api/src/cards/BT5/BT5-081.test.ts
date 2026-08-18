import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-081.js";
import "../BT10/BT10-073.js";

describe("BT5-081 ChaosGallantmon", () => {
  it("may delete another own Digimon to delete an opposing level 5 when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-012", as: "base" }, { card: "BT1-010", as: "cost" }], hand: [{ card: "BT5-081", as: "evolving" }] },
      1: { battleArea: ["AD1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.battleArea.length === 0);

    expect(s.state.players[0]?.battleArea).toHaveLength(1);
  });

  it("plays a purple level 3 after another own Digimon is deleted without activating its On Play effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-081", as: "chaos" }, { card: "BT5-071", as: "deleted" }],
        trash: [{ card: "BT10-073", as: "rookie" }],
        deck: ["BT10-073", "BT10-073", "BT10-073", "BT10-073"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const rookieId = s.inst("rookie").instanceId;
    await s.engine.recomputeContinuousEffects();

    await (s.engine as any).primitives.deletePermanent([s.perm("deleted").permanentId], "byEffect");
    await settle(() => s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.instanceId === rookieId) === true);

    expect(s.state.players[0]?.deck).toHaveLength(4);
  });
});
