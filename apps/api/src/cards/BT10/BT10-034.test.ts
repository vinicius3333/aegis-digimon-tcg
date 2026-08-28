import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-034.js";

describe("BT10-034 Dorulumon", () => {
  it("encodes alternate evolution, conditional -3000 DP, Save, and global Security DP reduction", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Xros Heart"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" })],
      }),
      expect.objectContaining({ trigger: "OnDeletion", keywords: [expect.objectContaining({ keyword: "Save" })] }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifySecurityDP", controller: "opponent", amount: -2000 })],
      }),
    ]);
  });

  it("digivolves for 2 from an off-color level 3 with Xros Heart", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-008", as: "base" }],
        hand: [{ card: "BT10-034", as: "evolving" }],
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

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT10-008"]);
  });

  it("gives an opposing Digimon -3000 DP when another Xros Heart permanent is in play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT10-034", as: "source" }], battleArea: ["BT10-087"] },
        1: { battleArea: [{ card: "BT10-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("does not apply the On Play DP reduction when Dorulumon is the only Xros Heart permanent", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT10-034", as: "source" }] },
        1: { battleArea: [{ card: "BT10-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("may save itself under its owner's Tamer after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-087", as: "tamer" },
            { card: "BT10-034", as: "dorulumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const dorulumonId = s.perm("dorulumon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("dorulumon").permanentId])).toBe(1);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === dorulumonId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === dorulumonId)).toBe(false);
  });

  it("reduces all opposing Security Digimon DP only while its host has Shoutmon in its name", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-034"] }] },
      1: { battleArea: [{ card: "BT10-020", as: "battleTarget", dp: 5000 }] },
    });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).securityDp(1)).toBe(-2000);
    expect(matching.perm("battleTarget").currentDP).toBe(5000);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-034"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).securityDp(1)).toBe(0);
  });
});
