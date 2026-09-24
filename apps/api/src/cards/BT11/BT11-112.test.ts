import { describe, it, expect, afterEach } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { registerIrCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { CompiledCard } from "@aegis/shared";
import "../index.js";

describe("BT11-112 [On Play] grant Blocker + Evade to a [Veemon]/[Veedramon] Digimon", () => {
  it("grants Blocker and Evade to the owner's Veemon-named Digimon", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT11-023", dp: 1000, as: "veemon" }],
          hand: [{ card: "BT11-112", as: "card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const veemon = s.perm("veemon");
    const card = s.inst("card");
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });

    await settle(() => false, 60);

    const rejected = s.events.find((e) => e.kind === "actionRejected");
    expect(rejected).toBeUndefined();

    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, k: string): boolean } }).continuous;
    expect(ledger.hasKeyword(veemon.permanentId, "Blocker")).toBe(true);
    expect(ledger.hasKeyword(veemon.permanentId, "Evade")).toBe(true);
  });
});

const TARGET_CARD = "EX3-031";

describe("BT11-112 [All Turns] Veedramon-named Digimon suspended -> reactivate its [When Digivolving]", () => {
  const original = runtimeCompiledCard(TARGET_CARD);
  const stub: CompiledCard = {
    effects: [{ trigger: "WhenDigivolving", actions: [{ kind: "GainMemory", amount: 1 }] }],
    coverage: "full",
    residual: [],
  };

  afterEach(() => {
    if (original !== undefined) registerIrCard(TARGET_CARD, original);
  });

  it("suspends the Tamer and re-fires the suspended Veedramon's [When Digivolving] effect", async () => {
    registerIrCard(TARGET_CARD, stub);

    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", dp: 0, as: "kouji" },
            { card: TARGET_CARD, dp: 3000, as: "veedramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kouji = s.perm("kouji");
    const veedramon = s.perm("veedramon");
    s.state.memory = 5;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

    await advance(s.engine).verb.suspend([veedramon.permanentId]);

    await settle(() => s.state.memory > 5, 400);

    expect(s.state.memory).toBeGreaterThan(5);
    expect(kouji.isSuspended).toBe(true);
  });

  it("Q2142: still suspends Rina when an eligible Veedramon has no When Digivolving effect", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", dp: 0, as: "rina" },
            { card: "BT11-027", dp: 6000, as: "veedramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rina = s.perm("rina");
    const veedramon = s.perm("veedramon");
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.suspend([veedramon.permanentId]);
    await settle(() => false, 60);

    expect(rina.isSuspended).toBe(true);
    expect(veedramon.isSuspended).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("does not reactivate the effect when this Tamer is already suspended", async () => {
    registerIrCard(TARGET_CARD, stub);

    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", dp: 0, as: "kouji" },
            { card: TARGET_CARD, dp: 3000, as: "veedramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kouji = s.perm("kouji");
    const veedramon = s.perm("veedramon");
    s.state.memory = 5;
    kouji.isSuspended = true;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

    await advance(s.engine).verb.suspend([veedramon.permanentId]);

    await settle(() => false, 60);

    expect(s.state.memory).toBe(5);
    expect(kouji.isSuspended).toBe(true);
  });

  it("does NOT reactivate when the suspended Digimon does not have [Veedramon] in its name", async () => {
    registerIrCard(TARGET_CARD, stub);

    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", dp: 0, as: "kouji" },
            { card: "BT3-073", dp: 6000, as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kouji = s.perm("kouji");
    const other = s.perm("other");
    s.state.memory = 5;

    await advance(s.engine).verb.suspend([other.permanentId]);

    await settle(() => false, 60);

    expect(s.state.memory).toBe(5);
    expect(kouji.isSuspended).toBe(false);
  });
});

describe("BT11-112 [Your Turn][Once Per Turn] blue Digimon unsuspend -> memory", () => {
  it("gains memory once on its turn, ignores the opponent's turn, and resets next turn", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", as: "kouji" },
            { card: "BT11-023", as: "blue" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("blue").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("blue").permanentId]);
    await settle(() => s.state.memory === 4, 200);
    expect(s.state.memory).toBe(4);

    await advance(s.engine).verb.suspend([s.perm("blue").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("blue").permanentId]);
    await settle(() => false, 60);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.suspend([s.perm("blue").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("blue").permanentId]);
    await settle(() => false, 60);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("blue").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("blue").permanentId]);
    await settle(() => s.state.memory === 4, 200);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

describe("BT11-112 delegated [When Digivolving] stays the Veedramon's own Digimon effect", () => {
  it("cannot return a Digimon immune to opponent Digimon effects, but still returns a non-immune one", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT25-060", as: "reboot" },
            { card: "BT1-013", as: "control" },
          ],
          hand: [{ card: "BT25-072", as: "linked" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT11-112", as: "rina" },
            { card: "EX13-023", as: "ulforce" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["BT11-112"],
        // Rina offers Ulforce's two [When Digivolving] effects in printed order: orientation, then return.
        preferOptionIndex: 1,
      },
    );
    await s.ready();
    s.state.memory = 3;
    const rebootId = s.perm("reboot").permanentId;
    const controlTopId = s.perm("control").topCard!.instanceId;

    // Rebootmon's link reaction: until the turn ends, opponent Digimon effects do not affect it.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: rebootId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(rebootId, "beAffected", "Digimon"));

    // An attacker's Digimon effect suspends UlforceVeedramon (Logimon's link reaction in the report).
    await advance(s.engine).verb.suspend([s.perm("ulforce").permanentId], 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("rina").isSuspended).toBe(true);
    const remaining = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId);
    expect(remaining).toContain("BT25-060");
    expect(remaining).not.toContain("BT1-013");
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(controlTopId);
    const ulforceNoticeTimings = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && event.sourceCardId === "EX13-023" ? [event.timing] : [],
    );
    expect(ulforceNoticeTimings).toContain("WhenDigivolving");
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT11-112")).toBe(true);
  });
});

describe("BT11-112 IR target ownership", () => {
  it("binds both On Play keywords and gates reactivation behind the Tamer's optional suspend cost", () => {
    const card = runtimeCompiledCard("BT11-112")!;
    expect(card.effects?.[0]?.actions[1]).toMatchObject({ kind: "GainKeyword", target: { sameTarget: true } });
    expect(card.effects?.[1]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      actions: [
        {
          kind: "ActivateEffect",
          target: { sourceRef: "triggerSubject" },
          effectType: "WhenDigivolving",
          cost: { kind: "suspend", target: { isSelf: true } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });
});
