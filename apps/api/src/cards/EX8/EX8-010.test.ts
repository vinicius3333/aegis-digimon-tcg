import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-010.js";

describe("EX8-010", () => {
  it("deletes an opposing Digimon with 4000 DP or less on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 4000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 4000 } } },
    });
  });
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("deletes a 4000-DP opposing Digimon on live On Play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-010", as: "meramon" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes at 4000 DP on deletion and preserves a 5000-DP target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-010", as: "meramon" }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "exact", dp: 4000 },
            { card: "AD1-001", as: "above", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const above = s.perm("above");
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("meramon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toContain(above);
  });

  it("applies its inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-010", as: "meramon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("digivolves from an off-color level-3 NSo card for 2 and rejects an off-color non-NSo card", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX8-030", as: "nsoBase" }], hand: [{ card: "EX8-010", as: "meramon" }] },
    });
    eligible.state.memory = 3;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("nsoBase").permanentId,
        instanceId: eligible.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("nsoBase").topCard.instanceId === eligible.inst("meramon").instanceId);
    expect(eligible.state.memory).toBe(1);

    const ineligible = setupEngine({
      0: { battleArea: [{ card: "BT10-058", as: "blackBase" }], hand: [{ card: "EX8-010", as: "meramon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("blackBase").permanentId,
        instanceId: ineligible.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
