import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-137.js";

describe("P-137 Flamedramon", () => {
  it("digivolves from Veemon and exposes Armor Purge and Raid", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-023", as: "veemon" }], hand: [{ card: "P-137", as: "flamedramon" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("veemon").permanentId, instanceId: s.inst("flamedramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("flamedramon").instanceId);
    expect(getCompiledCard("P-137")?.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    ]));
    expect(getCompiledCard("P-137")?.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [{
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1 }],
        }],
      }),
    ]));
    assertNoLoudGap(s);
  });
});
