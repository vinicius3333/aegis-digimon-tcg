import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-039.js";

describe("BT18-039 Mistymon", () => {
  it("has Barrier and changes an opponent's original DP after trashing exact security cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-039", as: "mistymon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-030", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("target").permanentId);

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Barrier" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "SetBaseDP",
          target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 },
          value: 6000,
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);

    expect(observe(s.engine).hasKeyword(s.perm("mistymon"), "Barrier")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").baseDP).toBe(3000);
    expect(s.perm("target").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });

  it("can change a friendly Digimon's original DP while preserving an existing +1000 modifier", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-053", as: "base" },
            { card: "BT1-030", as: "friendlyTarget", dp: 3000 },
          ],
          hand: [{ card: "BT18-039", as: "mistymon" }],
          security: [{ card: "BT1-009", as: "securityCost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("friendlyTarget").permanentId);
    await advance(s.engine).verb.modifyDP(s.perm("friendlyTarget").permanentId, 1000, EffectDuration.UntilEachTurnEnd);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mistymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("friendlyTarget").currentDP === 7000);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("securityCost").instanceId)).toBe(
      true,
    );
    expect(s.perm("friendlyTarget").baseDP).toBe(3000);
    expect(s.perm("friendlyTarget").currentDP).toBe(7000);
    assertNoLoudGap(s);
  });

  it("may decline without trashing security or changing the selected Digimon's original DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-039", as: "mistymon" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.perm("target").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("inherits a once-per-turn unsuspend only when its controller's security is removed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-039"], suspended: true }],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT17-063", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended === false);

    expect(s.perm("host").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("keeps the inherited watcher limited to the controller's security and one firing per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-039"], suspended: true }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("host").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
