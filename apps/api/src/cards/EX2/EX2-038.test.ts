import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-038.js";
import "./EX2-031.js";
import "./EX2-033.js";
import "./EX2-035.js";
import "./EX2-038.js";
import "./EX2-032.js";
import "../BT1/BT1-088.js";
import "../BT1/BT1-036.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

describe("EX2-038 Justimon: Blitz Arm", () => {
  it("matches the catalog and compiled modal/inherited effects", () => {
    expect(getCardDefinition("EX2-038")).toMatchObject({
      cardId: "EX2-038",
      nameEn: "Justimon: Blitz Arm",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      effectText:
        "[When Digivolving] Activate 1 of the effects below. ・This Digimon gets +2000 DP for the turn. ・Unsuspend this Digimon. ・Delete 1 of your opponent's Digimon with a play cost of 5 or less.[When Attacking][Once Per Turn] For each Tamer you have in play, activate this Digimon's [When Digivolving] effect.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Modal",
              choose: 1,
              options: [
                [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn" }],
                [{ kind: "Unsuspend" }],
                [{ kind: "Delete", target: { filter: { controller: "opponent", playCostLte: 5 }, count: 1 } }],
              ],
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "ReactivateEffect",
              fromTrigger: "WhenDigivolving",
              count: 1,
              scaling: {
                per: 1,
                unit: "cards",
                filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"] },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("pays the level-5 evolution, draws, and chooses +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-035", as: "base" }],
          hand: [{ card: "EX2-038", as: "evolution" }],
          deck: [{ card: "BT1-009", as: "draw" }, ...inertDeck],
          security: inertSecurity,
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 13000 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw").instanceId);
  });

  it("chooses unsuspend after a legal evolution of a suspended source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-035", as: "base", suspended: true }],
          hand: [{ card: "EX2-038", as: "evolution" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.cardId).toBe("EX2-038");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-035"]);
  });

  it("deletes play-cost 5 but not play-cost 6 or higher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-035", as: "base" }],
          hand: [{ card: "EX2-038", as: "evolution" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "EX2-031", as: "atLimit" },
            { card: "EX2-033", as: "aboveLimit" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoChooseOption: true, preferOptionIndex: 2, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    const atLimitId = s.perm("atLimit").permanentId;
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atLimitId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([aboveLimitId]);
    expect(s.state.memory).toBe(2);
  });

  it("closes the public attack after repeated ReactivateEffect modal continuations", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-035", as: "base", under: ["EX2-032"] },
            { card: "BT1-088", as: "firstTamer" },
            { card: "BT1-088", as: "secondTamer" },
          ],
          hand: [
            { card: "EX2-038", as: "evolution" },
            { card: "BT1-036", as: "unsuspender" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const evolutionDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolutionDecision.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 13000 && s.state.pendingDecision === undefined);

    const decisionsBeforeFirstAttack = s.decisions.length;
    const unsuspenderId = s.inst("unsuspender").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const attackModeIds: string[] = [];
    for (let activation = 0; activation < 3; activation += 1) {
      await settle(() => {
        const pending = s.state.pendingDecision;
        return pending?.kind === "chooseOption" || (activation > 0 && !observe(s.engine).isAttacking());
      });
      const mode = s.state.pendingDecision;
      if (mode === undefined) break;
      expect(mode.kind).toBe("chooseOption");
      if (mode.kind !== "chooseOption") {
        break;
      }
      attackModeIds.push(mode.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: mode.decisionId,
          response: { kind: "chooseOption", optionIndex: 0 },
        }),
      ).toEqual({ ok: true });
    }
    expect(attackModeIds).toHaveLength(2);
    expect(s.decisions.length).toBe(decisionsBeforeFirstAttack + 2);
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("base").currentDP).toBe(17000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: unsuspenderId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !s.perm("base").isSuspended);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(unsuspenderId);

    const decisionsAfterFirstAttack = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.decisions).toHaveLength(decisionsAfterFirstAttack);
    expect(s.perm("base").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").isSuspended).toBe(false);

    const decisionsBeforeResetAttack = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const resetFirstMode = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: resetFirstMode.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseOption" &&
        s.state.pendingDecision.decisionId !== resetFirstMode.decisionId,
    );
    const resetSecondMode = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: resetSecondMode.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.decisions.length).toBe(decisionsBeforeResetAttack + 2);
    expect(s.perm("base").currentDP).toBe(15000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("does not activate When Attacking with no Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-038", as: "justimon" }], deck: inertDeck, security: inertSecurity },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("justimon").currentDP).toBe(11000);
  });

  it("rejects evolution from a nonmatching blue level-4 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "wrongSource" }],
        hand: [{ card: "EX2-038", as: "evolution" }],
        deck: inertDeck,
        security: inertSecurity,
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
