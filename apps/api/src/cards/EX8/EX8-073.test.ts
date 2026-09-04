import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../BT14/BT14-035.js";
import "../BT18/BT18-062.js";
import "./EX8-059.js";
import { compiled } from "./EX8-073.js";

describe("EX8-073", () => {
  it("gains +4000 DP when Gallantmon or X Antibody is in its digivolution cards when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 4000, condition: { kind: "anyOf" } },
      { kind: "ModifyDP", amount: -4000, target: { filter: { controller: "opponent" } } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 4000, condition: { kind: "anyOf" } },
      { kind: "ModifyDP", amount: -4000, target: { filter: { controller: "opponent" } } },
    ]);
  });
  it("once per turn deletes an opposing Digimon up to 10000 DP or trashes one if deletion fails, and grants immunity at 0 or less memory", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving" && entry.frequency === "OncePerTurn")
        ?.actions,
    ).toMatchObject([
      { kind: "Delete", target: { filter: { dp: { op: "lte", value: 10000 } } } },
      { kind: "trashSecurityTop", controller: "opponent", condition: { kind: "ifThisEffectDidNotDelete" } },
      { kind: "Unsuspend", condition: { kind: "ifThisEffectDidNotDelete" } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentDigimonEffects",
      condition: { kind: "memoryAtMost", value: 0 },
    });
  });

  it("publicly grants the printed opponent-Digimon immunity at exactly 0 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-073", as: "gallantmon-x" }] } });
    s.state.memory = 0;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("gallantmon-x"), "beAffected", "Digimon")).toBe(true);

    s.state.memory = 1;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("gallantmon-x"), "beAffected", "Digimon")).toBe(false);
  });

  it("evolves from Gallantmon for 1, applies both DP modifiers, then takes the no-delete fallback", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-020", as: "gallantmon", suspended: true }],
          hand: [{ card: "EX8-073", as: "gallantmonX" }],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "target", dp: 15000 }],
          security: [{ card: "BT1-001", as: "topSecurity" }, "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    const topSecurityId = s.inst("topSecurity").instanceId;
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: s.inst("gallantmonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gallantmon").topCard.cardId === "EX8-073" && s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.perm("gallantmon").currentDP).toBe(16000);
    expect(s.perm("target").currentDP).toBe(11000);
    expect(s.perm("gallantmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === topSecurityId)).toBe(true);
  });

  it("independently accepts an X Antibody trait source on the attacking path", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", under: ["BT10-080"] }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").currentDP).toBe(16000);
    expect(s.perm("target").currentDP).toBe(8000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("source").currentDP).toBe(12000);
    expect(s.perm("target").currentDP).toBe(12000);
  });

  it("mandatorily deletes the exact 10000-DP boundary without taking the fallback", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", suspended: true }] },
        1: {
          battleArea: [{ card: "AD1-001", as: "target", dp: 10000 }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("takes the Q3977 fallback when a deletion-prevention effect prevents the selected deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-073", as: "source", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT14-035", as: "protected" },
            { card: "BT18-062", as: "granter", dp: 15000 },
          ],
          hand: [{ card: "BT18-099", as: "protection-cost" }],
          security: [
            { card: "BT1-001", as: "fallback-security" },
            { card: "BT1-002", as: "other-security" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const fallbackSecurityId = s.inst("fallback-security").instanceId;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("granter"));
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await resolution;
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT14-035",
      "BT18-062",
    ]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === fallbackSecurityId)).toBe(true);
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("shares once-per-turn use between When Digivolving and End of Attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("source"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("ignores an actual opponent-granted On Deletion effect at memory 0 (Q3984)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-073", as: "immune" }],
          hand: [{ card: "BT1-011", as: "would-trash" }],
        },
        1: {
          battleArea: [{ card: "EX8-059", as: "granter" }],
          hand: [{ card: "BT1-010", as: "grant-cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("granter"));
    await settle(() => s.state.players[1]!.hand.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("grant-cost").instanceId);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("immune").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("would-trash").instanceId);
  });

  it("offers the controller Q3975 ordering for its simultaneous When Digivolving effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", under: ["BT10-080"] }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 14000 }] },
      },
      { autoOrderTriggers: false, autoSelectCards: true },
    );
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const first = s.state.pendingDecision!;
    const firstRequest = s.decisions.find(({ req }) => req.decisionId === first.decisionId)!.req;
    expect(firstRequest.options?.triggerKeys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "orderTriggers", order: [firstRequest.options!.triggerKeys![0]!] },
      }),
    ).toEqual({ ok: true });
    await resolution;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
