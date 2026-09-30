import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT14/BT14-035.js";
import "../BT18/BT18-062.js";
import "./EX8-059.js";
import "../BT1/BT1-055.js";
import "../BT1/BT1-070.js";
import "../P/P-134.js";
import { compiled } from "./EX8-073.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("EX8-073", () => {
  it("matches the committed catalog identity and every printed clause", () => {
    expect(getCardDefinition("EX8-073")).toMatchObject({
      cardId: "EX8-073",
      nameEn: "Gallantmon (X Antibody)",
      colors: ["Red", "Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
      effectText: expect.stringContaining("+4000 DP"),
    });
    expect(getCardDefinition("EX8-073")?.effectText).toContain("10000 DP or less");
    expect(getCardDefinition("EX8-073")?.effectText).toContain("0 or less memory");
    expect(getCardDefinition("EX8-073")?.securityEffectText).toBeUndefined();
    expect(getCardDefinition("EX8-073")?.inheritedEffectText).toBeUndefined();
  });
  it("gains +4000 DP when Gallantmon or X Antibody is in its digivolution cards when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 4000, condition: { kind: "anyOf" } },
      { kind: "ModifyDP", amount: -4000, target: { filter: { controller: "opponent" } } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 4000, condition: { kind: "anyOf" } },
      { kind: "ModifyDP", amount: -4000, target: { filter: { controller: "opponent" } } },
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "anyOf",
          conditions: [
            {
              kind: "selfDigivolutionStackMatchesFilter",
              filter: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "nameExact" }] },
            },
            {
              kind: "selfDigivolutionStackHasTrait",
              filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] },
            },
          ],
        },
      });
    }
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
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      duration: "permanent",
      condition: { kind: "memoryAtMost", value: 0, controller: "mine" },
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
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010"],
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

  it("independently accepts the [X Antibody] card on the attacking path", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", under: ["BT9-109"] }] },
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

  it("applies the attacking modifiers through a real player attack and expires them", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", under: ["BT9-109"] }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 20000 }], security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").currentDP === 16000 && s.perm("target").currentDP === 16000);
    expect(s.perm("source").currentDP).toBe(16000);
    expect(s.perm("target").currentDP).toBe(16000);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("source").currentDP).toBe(12000);
    expect(s.perm("target").currentDP).toBe(20000);
  });

  it("mandatorily deletes the exact 10000-DP boundary without taking the fallback", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", suspended: true }] },
        1: {
          battleArea: [{ card: "AD1-001", as: "target", dp: 10000 }],
          security: ["BT1-009"],
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
            { card: "BT1-009", as: "fallback-security" },
            { card: "BT1-010", as: "other-security" },
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

  it("publicly evolves into Gallantmon X and takes Q3977 fallback against Gladimon's protection", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-020", as: "gallantmon", suspended: true }],
          hand: [{ card: "EX8-073", as: "gallantmonX" }],
        },
        1: {
          battleArea: [{ card: "BT14-035", as: "protected" }],
          hand: [
            { card: "BT18-062", as: "granter" },
            { card: "BT18-099", as: "protection-cost" },
          ],
          security: [
            { card: "BT1-009", as: "fallback-security" },
            { card: "BT1-010", as: "other-security" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard.instanceId);
    const fallbackSecurityId = s.inst("fallback-security").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("granter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beDeleted"));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("protection-cost").instanceId);
    expect(s.state.memory).toBe(0);

    s.state.turnSeat = 0;
    expect(observe(s.engine).isRestricted(s.perm("protected"), "beDeleted")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: s.inst("gallantmonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gallantmon").topCard.cardId === "EX8-073" &&
        s.state.players[1]!.security.length === 1 &&
        !s.perm("gallantmon").isSuspended,
    );

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "effectResolved", sourceCardId: "EX8-073", timing: "WhenDigivolving" }),
    );
    expect(s.perm("gallantmon").currentDP).toBe(16000);
    expect(s.perm("protected").currentDP).toBe(1000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT14-035",
      "BT18-062",
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(fallbackSecurityId);
    expect(s.perm("gallantmon").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares once-per-turn use between When Digivolving and End of Attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-010", as: "next-turn" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("source"));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
  it("resets the shared End of Attack once-per-turn effect on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-073", as: "source", under: ["BT9-109"] }],
          deck: Array(12).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 10000 },
            { card: "BT1-011", as: "second", dp: 10000 },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: Array(12).fill("BT1-012"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("second").instanceId),
    ).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("second").instanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
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

  it("Q3984: public EX8-059 play and battle deletion do not trigger its granted effect at memory 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-073", as: "immune", suspended: true }],
          hand: [{ card: "BT1-011", as: "would-trash" }],
        },
        1: {
          hand: [
            { card: "EX8-059", as: "granter" },
            { card: "BT1-010", as: "grant-cost" },
          ],
          battleArea: [{ card: "BT1-031", as: "attacker", dp: 15000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("granter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("grant-cost").instanceId));
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasRestriction(s.perm("immune"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).customEffectGrants(s.perm("immune"))).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("would-trash").instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("immune").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("immune").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("immune").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("would-trash").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("grant-cost").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("offers the controller Q3975 ordering for its simultaneous When Digivolving effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", under: ["BT9-109"] }] },
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

describe("EX8-073 Gallantmon (X Antibody) — KB Q&A rulings", () => {
  const filler = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  function immunityBoard(opponentHand: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-073", as: "gallantmonX" },
            { card: "BT1-016", as: "bystander" },
          ],
          deck: filler,
        },
        1: { hand: [{ card: opponentHand, as: "played" }], security: ["BT1-009", "BT1-009"], deck: filler },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("gallantmonX").topCard.instanceId);
    return s;
  }

  async function seatOnePlays(s: EngineSetup, memoryBefore: number) {
    s.state.turnSeat = 1;
    s.state.memory = memoryBefore;
    await s.ready();
    const instanceId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    await settle(() => s.state.pendingDecision === undefined);
  }

  function offeredToSeatOne(s: EngineSetup): boolean {
    const ids = [s.perm("gallantmonX").permanentId, s.perm("gallantmonX").topCard.instanceId];
    return s.decisions
      .filter(({ seat, req }) => seat === 1 && req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])
      .some((id) => ids.includes(id));
  }

  function isUnaffected(s: EngineSetup): boolean {
    return observe(s.engine).hasRestriction(s.perm("gallantmonX"), "beAffected", "Digimon");
  }

  it("must delete an opposing Digimon with 10000 DP or less, so declining the choice cannot reach the fallback (Q3976)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-073", as: "source", suspended: true }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "boundary", dp: 10000 },
            { card: "BT1-009", as: "small" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoOrderTriggers: true },
    );
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe("EX8-073");
    expect(request.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("boundary").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolution;
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("boundary").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("reads 0 or less memory from its owner's side of the gauge on either turn (Q3978)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-073", as: "gallantmonX" }] } });
    const unaffectedAt = async (turnSeat: 0 | 1, memory: number) => {
      s.state.turnSeat = turnSeat;
      s.state.memory = memory;
      await advance(s.engine).recompute();
      return observe(s.engine).hasRestriction(s.perm("gallantmonX"), "beAffected", "Digimon");
    };

    expect(await unaffectedAt(0, 0)).toBe(true);
    expect(await unaffectedAt(0, 1)).toBe(false);
    expect(await unaffectedAt(1, 0)).toBe(true);
    expect(await unaffectedAt(1, 3)).toBe(true);
    expect(await unaffectedAt(1, -1)).toBe(false);
  });

  it("does not suspend or lose DP to an opposing Digimon's effect while unaffected (Q3979)", async () => {
    const suspendedAfterKuwagamon = async (memoryBefore: number) => {
      const s = immunityBoard("BT1-070");
      await seatOnePlays(s, memoryBefore);
      return s.perm("gallantmonX").isSuspended;
    };
    expect(await suspendedAfterKuwagamon(10)).toBe(false);
    expect(await suspendedAfterKuwagamon(3)).toBe(true);

    const dpAfterAngemon = async (memoryBefore: number) => {
      const s = immunityBoard("BT1-055");
      await seatOnePlays(s, memoryBefore);
      return s.perm("gallantmonX").currentDP;
    };
    expect(await dpAfterAngemon(10)).toBe(12000);
    expect(await dpAfterAngemon(4)).toBe(9000);
  });

  it("can still be chosen by the opponent's effect, which then does nothing to it (Q3980)", async () => {
    const s = immunityBoard("BT1-070");
    await seatOnePlays(s, 10);

    expect(isUnaffected(s)).toBe(true);
    expect(offeredToSeatOne(s)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(0);
  });

  it("can be given an opponent's <Security A. -1> without being considered to have it (Q3981)", async () => {
    const securityAttackAfterShoemon = async (memoryBefore: number) => {
      const s = immunityBoard("P-134");
      await seatOnePlays(s, memoryBefore);
      expect(offeredToSeatOne(s)).toBe(true);
      return observe(s.engine).keywordAmount(s.perm("gallantmonX"), "SecurityAttack");
    };
    expect(await securityAttackAfterShoemon(10)).toBe(0);
    expect(await securityAttackAfterShoemon(2)).toBe(-1);
  });

  it("stops an opposing DP reduction already on it as soon as it becomes unaffected (Q3982)", async () => {
    const s = immunityBoard("BT1-055");
    await seatOnePlays(s, 4);
    expect(s.state.memory).toBe(-1);
    expect(isUnaffected(s)).toBe(false);
    expect(s.perm("gallantmonX").currentDP).toBe(9000);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(isUnaffected(s)).toBe(true);
    expect(s.perm("gallantmonX").currentDP).toBe(12000);
  });

  it("applies an opposing effect given during the immunity as soon as the immunity ends (Q3983)", async () => {
    const checksAfterShoemon = async (seatZeroMemory: number) => {
      const s = immunityBoard("P-134");
      await seatOnePlays(s, 10);
      expect(observe(s.engine).keywordAmount(s.perm("gallantmonX"), "SecurityAttack")).toBe(0);

      s.state.turnSeat = 0;
      s.state.memory = seatZeroMemory;
      await advance(s.engine).recompute();
      const securityAttack = observe(s.engine).keywordAmount(s.perm("gallantmonX"), "SecurityAttack");
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("gallantmonX").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      return { securityAttack, checks: 2 - s.state.players[1]!.security.length };
    };
    expect(await checksAfterShoemon(0)).toEqual({ securityAttack: 0, checks: 1 });
    expect(await checksAfterShoemon(1)).toEqual({ securityAttack: -1, checks: 0 });
  });
});

describe("EX8-073 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("EX8-073")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});
