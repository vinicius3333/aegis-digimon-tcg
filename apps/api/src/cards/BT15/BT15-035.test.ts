import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-035.js";

describe("BT15-035", () => {
  it("may trash Numemon/Sukamon from hand to give an opposing Digimon Security Attack -1", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
      cost: { kind: "trash" },
      optional: true,
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainKeyword", keyword: { amount: -1 } }],
    });
  });
  it("also grants the same inherited attack reduction and the Numemon rule name", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Numemon"] }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
    });
  });

  it("On Play trashes a Numemon-name card before giving exactly one opponent Security Attack -1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-035", as: "geremon" }],
          hand: [
            { card: "BT14-058", as: "numemonCost" },
            { card: "BT1-009", as: "nonmatch" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-029", as: "target" },
            { card: "BT15-029", as: "peer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geremon"));
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("numemonCost").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonmatch").instanceId]);
    expect(s.perm("target").securityAttack).toBe(0);
    expect(s.perm("peer").securityAttack).toBe(1);
  });

  it("does not apply the reduction when the named hand cost is unavailable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-035", as: "geremon" }], hand: ["BT1-009"] },
        1: { battleArea: [{ card: "BT15-029", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geremon"));

    expect(s.perm("target").securityAttack).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("On Deletion pays from the leaving owner's hand and applies the reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-035", as: "geremon" }],
          hand: [{ card: "BT14-034", as: "sukamonCost" }],
        },
        1: { battleArea: [{ card: "BT15-029", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("geremon").permanentId])).toBe(1);
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("sukamonCost").instanceId);
    expect(s.perm("target").securityAttack).toBe(0);
  });

  it("publishes the Numemon rule name and inherited attack reduction behaviorally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-035", as: "geremon" },
            { card: "BT15-029", as: "host", under: ["BT15-035"] },
          ],
        },
        1: {
          battleArea: [{ card: "BT15-029", as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("geremon"))).toContain("numemon");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").securityAttack === 0);

    expect(s.perm("target").securityAttack).toBe(0);
  });
});
