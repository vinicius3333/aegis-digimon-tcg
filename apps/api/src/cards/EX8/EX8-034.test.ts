import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-034.js";

describe("EX8-034", () => {
  it("plays an NSo Digimon costing 3 or less when digivolving and gives two opposing Digimon Security Attack -1 on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { playCostLte: 3 } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      target: { count: 2 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });
  it("gives two opposing Digimon Security Attack -1 when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-034", as: "mammoth" }] },
      1: {
        battleArea: [
          { card: "AD1-001", as: "one" },
          { card: "EX8-040", as: "two" },
        ],
        security: 1,
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("mammoth").permanentId]);
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack") === -1 &&
        observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack") === -1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(-1);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(0);
  });

  it("Security Attack -1 suppresses an actual opposing security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-034", as: "mammoth" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "AD1-001", as: "one" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("mammoth").permanentId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack") === -1);

    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("one").controllerSeat).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack")).toBe(-1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("one").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("plays an NSo Digimon costing 3 or less when digivolving and rejects cost 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-034", as: "mammoth" }],
          hand: [
            { card: "EX8-008", as: "allowed" },
            { card: "EX8-010", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const allowedInstanceId = s.inst("allowed").instanceId;
    const tooExpensiveInstanceId = s.inst("tooExpensive").instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mammoth"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === allowedInstanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === allowedInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === tooExpensiveInstanceId)).toBe(true);
  });

  it("plays the eligible NSo card through a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-032", as: "base" }],
          hand: [
            { card: "EX8-034", as: "mammoth" },
            { card: "EX8-008", as: "allowed" },
            { card: "EX8-010", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mammoth").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-008"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-008")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooExpensive").instanceId)).toBe(true);
  });

  it("applies the inherited -4000 DP on a real attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-10", as: "host", under: ["EX8-034"] }] },
        1: { battleArea: [{ card: "EX8-029", as: "target" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === before - 4000);
    expect(s.perm("target").currentDP).toBe(before - 4000);
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(before - 4000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(before);
  });

  it("can decline the optional NSo play without consuming the card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-032", as: "base" }],
          hand: [
            { card: "EX8-034", as: "mammoth" },
            { card: "EX8-008", as: "candidate" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mammoth").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-034");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("base").topCard.cardId).toBe("EX8-034");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });
});
