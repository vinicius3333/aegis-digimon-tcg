import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-041.js";
import type { EngineSetup } from "../../engine/testkit/harness.js";

/**
 * BT23-041 Kabuterimon
 *   [Digivolve] Lv.3 w/[CS] trait: Cost 2
 *   ＜Alliance＞
 *   [All Turns] [Once Per Turn] When this Digimon suspends, 1 of your Digimon gains
 *   ＜Piercing＞ and +3000 DP for the turn.
 *
 * Every clause is driven by a public intent: `attack` (the ordinary way a Digimon suspends),
 * an opponent's Option that suspends it, `respondAlliance`, and `digivolve`.
 *
 * ＜Alliance＞ (comprehensive rules §16-24-1) belongs to the ATTACKER: when Kabuterimon
 * attacks it may suspend 1 of your OTHER Digimon for that Digimon's DP and ＜Security A. +1＞.
 * So every attack by Kabuterimon opens an Alliance prompt that the test must answer.
 */

/** Answer Kabuterimon's ＜Alliance＞ prompt with "no ally", leaving the attack otherwise plain. */
async function declineAlliance(s: EngineSetup): Promise<void> {
  await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
  expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
}

describe("BT23-041 Kabuterimon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-041")).toMatchObject({
      cardId: "BT23-041",
      nameEn: "Kabuterimon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Insectoid", "Hudie", "CS"],
    });
    const effectText = getCardDefinition("BT23-041")!.effectText;
    expect(effectText).toContain("[Digivolve] Lv.3 w/[CS] trait: Cost 2");
    expect(effectText).toContain("＜Alliance＞");
    expect(effectText).toContain(
      "[All Turns] [Once Per Turn] When this Digimon suspends, 1 of your Digimon gains ＜Piercing＞ and +3000 DP for the turn.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("declares Alliance as a static keyword and the suspension clause as an All Turns once-per-turn SubTrigger", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    });
  });

  it("exposes Alliance on the live board", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-041", as: "kabuterimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kabuterimon"), "Alliance")).toBe(true);
  });

  it("suspends by attacking, then the chosen Digimon wins its battle at +3000 DP and pierces for a security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-041", as: "kabuterimon" },
            { card: "BT1-009", as: "ally" },
          ],
          deck: Array(8).fill("BT1-011"),
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "defender", suspended: true }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: Array(8).fill("BT1-011"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // Bias the "1 of your Digimon" prompt to the ally, so the recipient is not the source.
    preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
    const allyBaseDp = s.perm("ally").currentDP;
    const kabuterimonBaseDp = s.perm("kabuterimon").currentDP;
    expect(allyBaseDp).toBe(3000);
    expect(s.perm("defender").currentDP).toBe(4000);
    const defenderPermanentId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());

    expect(s.perm("kabuterimon").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("kabuterimon"))).toBe(false);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);
    expect(s.perm("kabuterimon").currentDP).toBe(kabuterimonBaseDp);

    // The recipient beats a 4000 DP defender only because of the +3000, and its ＜Piercing＞
    // turns that win into a further security check.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: defenderPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderPermanentId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("ally").permanentId,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also triggers when an opponent's effect suspends it during the opponent's turn", async () => {
    // Only Kabuterimon is on the controller's board, so the recipient it picks is itself.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-041", as: "kabuterimon" }] },
        1: {
          battleArea: [{ card: "BT23-039", as: "greenSource" }],
          hand: [{ card: "BT1-110", as: "flowerCannon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const kabuterimonBaseDp = s.perm("kabuterimon").currentDP;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flowerCannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("kabuterimon").isSuspended && observe(s.engine).hasPierce(s.perm("kabuterimon")));

    expect(s.perm("kabuterimon").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("kabuterimon"))).toBe(true);
    expect(s.perm("kabuterimon").currentDP).toBe(kabuterimonBaseDp + 3000);
    expect(observe(s.engine).hasPierce(s.perm("greenSource"))).toBe(false);
    expect(s.perm("greenSource").currentDP).toBe(1000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-110");
  });

  it("grants only once in a turn even when it suspends a second time", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-041", as: "kabuterimon" },
            { card: "BT1-009", as: "ally" },
            { card: "BT1-011", as: "second" },
          ],
          hand: [{ card: "BT4-108", as: "unsuspendOption" }],
          deck: Array(8).fill("BT1-011"),
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "opposing" }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: Array(8).fill("BT1-011"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 6;
    preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
    const allyBaseDp = s.perm("ally").currentDP;
    const secondBaseDp = s.perm("second").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")) && !observe(s.engine).isAttacking());
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);
    expect(s.perm("kabuterimon").isSuspended).toBe(true);

    // Unsuspend Kabuterimon publicly so it can suspend a second time in the same turn.
    preferred.length = 0;
    preferred.push(
      s.perm("kabuterimon").permanentId,
      s.perm("kabuterimon").topCard.instanceId,
      s.perm("opposing").permanentId,
      s.perm("opposing").topCard.instanceId,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("kabuterimon").isSuspended);
    expect(s.perm("kabuterimon").isSuspended).toBe(false);

    preferred.length = 0;
    preferred.push(s.perm("second").permanentId, s.perm("second").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.perm("kabuterimon").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("second"))).toBe(false);
    expect(s.perm("second").currentDP).toBe(secondBaseDp);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);
    expect(s.state.players[0]!.battleArea.filter((permanent) => observe(s.engine).hasPierce(permanent))).toHaveLength(
      1,
    );
  });

  it("expires the grant at the turn boundary and triggers again on the next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-041", as: "kabuterimon" },
            { card: "BT1-009", as: "ally" },
          ],
          deck: Array(8).fill("BT1-011"),
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: Array(8).fill("BT1-011") },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
    const allyBaseDp = s.perm("ally").currentDP;

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")) && !observe(s.engine).isAttacking());
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    // "For the turn" ends with the turn that granted it.
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("kabuterimon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await declineAlliance(s);
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")) && !observe(s.engine).isAttacking());
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await nextOwnTurn;
  });

  it("offers only the controller's own Digimon and rejects an opponent's Digimon as the recipient", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-041", as: "kabuterimon" },
          { card: "BT1-009", as: "ally" },
        ],
        deck: Array(8).fill("BT1-011"),
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "opposing" }],
        security: ["BT1-010", "BT1-010"],
        deck: Array(8).fill("BT1-011"),
      },
    });
    await s.ready();
    const opposingPermanentId = s.perm("opposing").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));

    const request = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("kabuterimon").permanentId, s.perm("ally").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(opposingPermanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "chooseTargets", instanceIds: [opposingPermanentId] },
      }),
      // A forged id outside the candidate set fails the decision registry's minimum-valid
      // count check, which reports the generic "still waiting for a decision" code.
    ).toEqual({ ok: false, reason: "decision-pending" });
    expect(s.state.pendingDecision?.decisionId).toBe(request.decisionId);

    // The legal answer resolves the same decision and leaves the opponent untouched.
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ally").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")));

    expect(observe(s.engine).hasPierce(s.perm("opposing"))).toBe(false);
    expect(s.perm("opposing").currentDP).toBe(4000);
    expect(s.perm("ally").currentDP).toBe(6000);
  });

  it("suspends an ally for Alliance without re-triggering its own suspension clause", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-041", as: "kabuterimon" },
            { card: "BT1-009", as: "ally" },
          ],
          deck: Array(8).fill("BT1-011"),
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: Array(8).fill("BT1-011") },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").permanentId, s.perm("ally").topCard.instanceId);
    const allyBaseDp = s.perm("ally").currentDP;
    const kabuterimonBaseDp = s.perm("kabuterimon").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "allianceResolved") && !observe(s.engine).isAttacking());

    // §16-24-1: the attacker gains the suspended ally's DP and ＜Security A. +1＞ for the
    // attack. Both are attack-scoped, so the observable endpoint is the extra security check:
    // 3 cards down to 1 rather than 2.
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("kabuterimon").currentDP).toBe(kabuterimonBaseDp);
    expect(s.state.players[1]!.security).toHaveLength(1);
    // The ally's suspension is not this Digimon's own, so the clause fired exactly once.
    expect(s.state.players[0]!.battleArea.filter((permanent) => observe(s.engine).hasPierce(permanent))).toHaveLength(
      1,
    );
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 3000);
  });

  it.each([
    ["a Green/Yellow level-3 source on the normal route", "BT23-037", undefined, 3],
    ["an off-color level-3 [CS] source on the alternate route", "BT23-017", 0, 2],
  ])("digivolves from %s", async (_label, sourceCard, alternateRequirementIndex, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "BT23-041", as: "kabuterimon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
    });
    s.state.memory = cost;
    const sourceId = s.inst("source").instanceId;
    const kabuterimonId = s.inst("kabuterimon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: kabuterimonId,
        ...(alternateRequirementIndex === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === kabuterimonId);

    expect(s.perm("source").topCard.instanceId).toBe(kabuterimonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it.each([
    ["the normal route", undefined],
    ["the alternate [CS] route", 0],
  ])("rejects a level-3 source that is neither Green/Yellow nor [CS] on %s", async (_label, index) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "source" }],
        hand: [{ card: "BT23-041", as: "kabuterimon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;
    const sourceId = s.inst("source").instanceId;
    const kabuterimonId = s.inst("kabuterimon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: kabuterimonId,
        ...(index === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex: index }),
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("source").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(kabuterimonId);
    expect(s.state.memory).toBe(3);
  });

  it("does not react when another Digimon suspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-041", as: "kabuterimon" },
          { card: "BT1-009", as: "ally" },
        ],
        deck: Array(8).fill("BT1-011"),
      },
      1: { security: ["BT1-010", "BT1-010"], deck: Array(8).fill("BT1-011") },
    });
    await s.ready();
    const kabuterimonDp = s.perm("kabuterimon").currentDP;
    const allyDp = s.perm("ally").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("kabuterimon").isSuspended).toBe(false);
    expect(s.perm("kabuterimon").currentDP).toBe(kabuterimonDp);
    expect(s.perm("ally").currentDP).toBe(allyDp);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
    expect(s.decisions).toHaveLength(0);
  });
});
