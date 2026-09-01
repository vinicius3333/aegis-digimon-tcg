import { describe, expect, it } from "vitest";
import { assemblyRequirementFor, digivolutionRequirementsFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-047.js";
import "../index.js";

describe("BT26-047 TyrantKabuterimon", () => {
  it("encodes immediate optional battle and the suspend-paid Option immunity/DP effect in every printed window", () => {
    expect(digivolutionRequirementsFor("BT26-047")).toContainEqual({
      level: 5,
      traits: ["Insectoid", "TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(assemblyRequirementFor("BT26-047")).toEqual([
      { reduceCost: 6, materials: [{ traits: ["Larva", "Insectoid", "Titan"], count: 4, differentLevels: true }] },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effects = compiled.effects?.filter((effect) => effect.trigger === trigger) ?? [];
      expect(effects).toHaveLength(2);
      expect(effects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            actions: [{ kind: "Battle", optional: true, attacker: expect.any(Object), defender: expect.any(Object) }],
          }),
          expect.objectContaining({
            actions: [
              expect.objectContaining({
                kind: "CostGatedBlock",
                cost: { kind: "suspend", target: expect.any(Object) },
                actions: [
                  expect.objectContaining({ kind: "Restrict", restriction: "beAffected", fromSourceKind: ["Option"] }),
                  expect.objectContaining({ kind: "ModifyDP", amount: 3000 }),
                ],
              }),
            ],
          }),
        ]),
      );
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "CostGatedBlock", cost: { kind: "suspend" } }],
    });
  });

  it("uses the Lv.5 TS alternate evolution path for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-083", as: "purpleTsBase" }],
        hand: [{ card: "BT26-047", as: "tyrant" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleTsBase").permanentId,
        instanceId: s.inst("tyrant").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleTsBase").topCard.cardId === "BT26-047");

    expect(s.state.memory).toBe(0);
    expect(s.perm("purpleTsBase").stack.map((card) => card.cardId)).toEqual(["BT25-083"]);
  });

  it("plays by Assembly with four matching cards at four different levels", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-047", as: "tyrant" }],
        trash: [
          { card: "ST4-05", as: "level3" },
          { card: "ST4-07", as: "level4" },
          { card: "ST4-09", as: "level5" },
          { card: "ST4-13", as: "level6" },
        ],
      },
    });
    s.state.memory = 7;
    const materials = ["level3", "level4", "level5", "level6"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tyrant").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT26-047")?.stack.length ===
        4,
    );

    const tyrant = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT26-047")!;
    expect(s.state.memory).toBe(0);
    expect(tyrant.stack.map((card) => card.instanceId)).toEqual([...materials].reverse());
    expect(tyrant.stack.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects Assembly when matching materials repeat a level", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-047", as: "tyrant" }],
        trash: [
          { card: "ST4-05", as: "level3a" },
          { card: "BT1-066", as: "level3b" },
          { card: "ST4-07", as: "level4" },
          { card: "ST4-09", as: "level5" },
        ],
      },
    });
    s.state.memory = 7;
    const materials = ["level3a", "level3b", "level4", "level5"].map((alias) => s.inst(alias).instanceId);

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("tyrant").instanceId,
      assembly: { materialInstanceIds: materials },
    } as never);

    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(materials);
  });

  it("may decline both optional On Play effects without changing the board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-047", as: "tyrant" },
            { card: "BT26-045", as: "eligible", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tyrant"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("eligible").currentDP).toBe(11000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("eligible"), "beAffected", "Option")).toBe(false);
  });

  it("publicly plays, buffs only suspended Insectoid or Titan Digimon, and protects them from opposing Options", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-047", as: "tyrant" }],
          battleArea: [
            { card: "BT26-045", as: "eligible", suspended: true },
            { card: "BT1-065", as: "nonMatching", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tyrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tyrant").topCard.cardId === "BT26-047" && s.perm("eligible").currentDP === 14000);

    expect(s.perm("eligible").currentDP).toBe(14000);
    expect(s.perm("nonMatching").currentDP).toBe(4000);
    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string, source?: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("eligible").permanentId, "beAffected", "Option")).toBe(true);
  });

  it("offers the two simultaneous On Play effects for ordering (Q7043)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-047", as: "tyrant" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tyrant"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("immediately battles and can delete an effect-immune opponent by the battle rules (Q7040-Q7041)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-047", as: "tyrant" }] },
        1: { battleArea: [{ card: "BT1-009", as: "immuneDefender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const defender = s.perm("immuneDefender");
    advance(s.engine).ledgers.continuous.addRestriction(defender.permanentId, "beAffected", EffectDuration.Permanent, {
      fromSourceKind: ["Digimon"],
      byOpponentEffectsOnly: true,
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("tyrant"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(defender.topCard.instanceId);
  });

  it("may suspend an opponent Digimon as its cost, then offers immune targets without affecting them (Q7042, Q7044-Q7045)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-047", as: "tyrant", suspended: true },
            { card: "BT26-045", as: "otherImmune", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "costDigimon" },
            { card: "BT1-087", as: "yellowSource" },
          ],
          hand: [{ card: "BT1-106", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("costDigimon").permanentId, s.perm("tyrant").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tyrant"));
    expect(s.perm("costDigimon").isSuspended).toBe(true);
    expect(s.perm("tyrant").currentDP).toBe(16000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("tyrant"), "beAffected", "Option")).toBe(true);

    const before = s.perm("tyrant").currentDP;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-106"));

    const optionTargetDecision = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .find(({ req }) => req.options?.candidateInstanceIds?.includes(s.perm("tyrant").permanentId));
    expect(optionTargetDecision?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("tyrant").permanentId, s.perm("otherImmune").permanentId]),
    );
    expect(s.perm("tyrant").currentDP).toBe(before);
  });

  it("stops an already-active opposing Option grant as soon as immunity is gained (Q7047)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-047", as: "tyrant" }] },
        1: {
          battleArea: [{ card: "BT1-087", as: "yellowSource" }],
          hand: [{ card: "ST3-15", as: "grantOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grantOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("tyrant"), "SecurityAttack") === -3);
    expect(observe(s.engine).keywordAmount(s.perm("tyrant"), "SecurityAttack")).toBe(-3);

    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tyrant"));
    expect(observe(s.engine).keywordAmount(s.perm("tyrant"), "SecurityAttack")).toBe(0);
  });

  it("retains opposing Option-granted effects while immune, suppresses their trigger, and activates them after immunity lapses (Q7046, Q7048-Q7049)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-047", as: "tyrant" }] },
        1: {
          battleArea: [
            { card: "BT1-087", as: "yellowSource" },
            { card: "BT2-090", as: "purpleSource" },
          ],
          hand: [
            { card: "ST3-15", as: "keywordOption" },
            { card: "EX7-072", as: "triggerOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tyrant"));
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("keywordOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST3-15"));
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("triggerOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX7-072"));

    expect(observe(s.engine).keywordAmount(s.perm("tyrant"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).subscriptions("endOfOpponentTurn", s.perm("tyrant").permanentId)).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    // End the immunity source's opponent-turn window without ending the longer grants.
    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 1);
    expect(observe(s.engine).keywordAmount(s.perm("tyrant"), "SecurityAttack")).toBe(-3);

    await advance(s.engine).fireSubTrigger("endOfOpponentTurn");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
