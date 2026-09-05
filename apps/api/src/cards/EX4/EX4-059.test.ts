import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX4-059.js";
import "./EX4-069.js";

describe("EX4-059 Cherubimon", () => {
  it("registers full residual-free IR with Alliance", () => {
    expect(getEffectModule("EX4-059")).toBeDefined();
    expect(runtimeCompiledCard("EX4-059")).toMatchObject({ coverage: "full", residual: [] });
    expect(
      runtimeCompiledCard("EX4-059")?.effects?.find((entry) => entry.trigger === "Static")?.keywords,
    ).toMatchObject([{ keyword: "Alliance" }]);
    expect(
      runtimeCompiledCard("EX4-059")?.effects?.filter(
        (entry) => entry.trigger === "Static" && entry.keywords?.some((keyword) => keyword.keyword === "Alliance"),
      ),
    ).toHaveLength(1);
  });

  it("grants optional On Deletion replay to itself and one eligible ally", () => {
    const effect = runtimeCompiledCard("EX4-059")?.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions).toHaveLength(2);
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      duration: "untilOpponentTurnEnd",
    });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      target: { filter: { excludeSelf: true, levelComparison: { op: "lte", value: 5 } } },
    });
    const gainedEffect = effect?.actions?.[0];
    const gainedActions = gainedEffect?.kind === "GainTriggeredEffect" ? gainedEffect.gainedActions : undefined;
    expect(gainedActions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-059");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves from a green two-color level-five for the alternate cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-057", as: "antylamon" }],
        hand: [{ card: "EX4-059", as: "cherubimon" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("antylamon").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").topCard?.cardId === "EX4-059");
    expect(s.perm("antylamon").topCard?.cardId).toBe("EX4-059");
    expect(s.state.memory).toBe(0);
  });

  it("uses a real Alliance attack to suspend an ally and add its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-059", as: "attacker", dp: 12000 },
            { card: "BT1-010", as: "ally", dp: 2000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "target", dp: 15000, suspended: true },
            { card: "ST18-07", as: "blocker", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("attacker").keywords).toContain("Alliance");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const activeCombat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
      return s.perm("ally").isSuspended && activeCombat.hasOpenBlockWindow;
    });
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(14000);
    expect(s.perm("attacker").securityAttack).toBe(2);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
  });

  it("replays the deleted source from trash, while excluding a level 6 ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-058", as: "black" }],
          hand: [{ card: "EX4-069", as: "reactor" }],
        },
        1: {
          battleArea: [
            { card: "EX4-059", as: "cherubimon" },
            { card: "BT1-083", as: "level6Ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("cherubimon"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reactor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-059"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-059")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX4-059")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-083")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("level6Ally").permanentId], "byEffect");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-083")).toBe(true);
  });
  ex4CardBehaviorTests("EX4-059");
});
