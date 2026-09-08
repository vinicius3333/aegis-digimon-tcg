import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-036.js";
import "../index.js";

const CARD_ID = "EX10-036";

/**
 * EX10-036 Magneticdramon (Black, Lv.7 Mega, [Rock Dragon]/[LIBERATOR]/[Mineral]).
 *
 * Printed clauses:
 *  1. [Digivolve] While you have [Close], [Proganomon]: Cost 6
 *  2. ＜Fragment (3)＞
 *  3. [When Digivolving] [When Attacking] By trashing 3 [Mineral] or [Rock] trait cards from
 *     any of your Digimon's digivolution cards, delete 1 of your opponent's Digimon and trash
 *     their top security card.
 *  4. [When Digivolving] [When Attacking] [Once Per Turn] By placing 3 [Mineral] or [Rock]
 *     trait cards from your trash as this Digimon's bottom digivolution cards, it unsuspends.
 *
 * Every clause is proved through public intents (`digivolve`, `attack`) so the timing windows
 * are the production ones. Fixtures use cards with no printed or inherited text at all
 * (BT10-062 [Mineral], BT10-064 [Rock], BT4-065 [Rock], BT1-009, BT1-013, BT1-014, BT1-019,
 * BT2-064) so nothing but this card can move the board. BT2-011 Vorvomon is the near-miss
 * control: its only trait is [Rock Dragon], which must NOT satisfy an exact [Rock] filter.
 */
describe("EX10-036 Magneticdramon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Magneticdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Rock Dragon", "LIBERATOR", "Mineral"],
    });
  });

  it("compiles both timings of both clauses, the alternate route and the Fragment marker", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Proganomon"],
        cost: 6,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], namesExact: ["Close"], min: 1 },
      },
    ]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects?.filter((effect) => effect.trigger === trigger);
      expect(effects).toHaveLength(2);
      expect(effects?.[0]).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            allowCostWithoutTarget: true,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "trash",
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
                count: 3,
                from: ["digivolutionCards"],
              },
            },
          },
          { kind: "trashSecurityTop", controller: "opponent", count: 1 },
        ],
      });
      expect(effects?.[1]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
                },
                count: 3,
                from: ["trash"],
              },
            },
          },
        ],
      });
    }
  });

  it("Q5114 [When Digivolving] trashes 3 sources spread across two Digimon, deletes 1 and trashes top security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
              ],
            },
            {
              card: "BT1-009",
              as: "ally",
              dp: 20_000,
              under: [
                { card: "BT4-065", as: "c" },
                { card: "BT2-011", as: "nearMiss" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        // Resolve the [Once Per Turn] unsuspend clause FIRST (Q5112 lets the controller pick the
        // order). The trash is empty at that moment, so its "by placing 3" cost cannot be paid and
        // it does nothing, leaving the trash/delete clause's endpoints unpolluted.
        preferTriggerKeys: ["ir-shared-0"],
      },
    );
    preferred.push(
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
      s.perm("target").topCard!.instanceId,
    );
    s.state.memory = 4;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Fragment")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    const p0 = s.state.players[0]!;
    const magnetic = s.perm("magnetic");
    expect(magnetic.topCard!.cardId).toBe(CARD_ID);
    expect(observe(s.engine).hasKeyword(magnetic, "Fragment")).toBe(true);
    // Exactly the 3 chosen [Mineral]/[Rock] cards left the two stacks.
    expect(magnetic.stack.map((card) => card.cardId)).toEqual(["BT2-064"]);
    expect(s.perm("ally").stack.map((card) => card.instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(p0.trash.map((card) => card.instanceId)).toEqual([
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
    ]);
    // Delete + security trash both landed.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-013", "BT1-019"]),
    );
    // Lv.6 -> Lv.7 for 4, plus the digivolution draw. Nothing is pending.
    expect(s.state.memory).toBe(0);
    expect(p0.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5113 refuses a partial payment: 2 eligible digivolution cards buy nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT2-011", as: "nearMiss" },
              ],
            },
            { card: "BT1-009", as: "ally", dp: 20_000, under: [{ card: "BT4-065", as: "b" }] },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => false, 40);

    // "By" is all-or-nothing: the 2 eligible cards stay put and neither result happens.
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-062", "BT2-011", "BT2-064"]);
    expect(
      s
        .perm("base")
        .stack.map((card) => card.instanceId)
        .slice(0, 2),
    ).toEqual([s.inst("a").instanceId, s.inst("nearMiss").instanceId]);
    expect(s.perm("ally").stack.map((card) => card.instanceId)).toEqual([s.inst("b").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5115 [When Attacking] places exactly 3 matching trash cards at the BOTTOM, then unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "magnetic",
              under: [
                { card: "BT1-009", as: "old1" },
                { card: "BT1-013", as: "old2" },
              ],
            },
          ],
          // No [Mineral]/[Rock] card sits in any digivolution stack, so the delete clause's cost
          // cannot be paid and this test measures the placement clause alone.
          trash: [
            { card: "BT10-062", as: "t1" },
            { card: "BT10-064", as: "t2" },
            { card: "BT4-065", as: "t3" },
            { card: "BT2-011", as: "tNear" },
          ],
          hand: ["BT1-013"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    const magnetic = s.perm("magnetic");
    // Bottom-most first: the 3 placed cards sit UNDER the two cards that were already there.
    // The relative order among the 3 placed cards is the placing player's choice, so only
    // their membership in the bottom 3 is asserted; the two pre-existing cards keep their
    // exact positions on top of them.
    expect(magnetic.stack).toHaveLength(5);
    expect(
      magnetic.stack
        .slice(0, 3)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("t1").instanceId, s.inst("t2").instanceId, s.inst("t3").instanceId].sort());
    expect(magnetic.stack.slice(3).map((card) => card.instanceId)).toEqual([
      s.inst("old1").instanceId,
      s.inst("old2").instanceId,
    ]);
    // The near-miss [Rock Dragon] card was never eligible.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("tNear").instanceId]);
    // Attacking suspended it; the clause unsuspended it again.
    expect(magnetic.isSuspended).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5115 refuses a partial placement: 2 matching cards in the trash leave it suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "magnetic", under: [{ card: "BT1-009", as: "old1" }] }],
          trash: [
            { card: "BT10-062", as: "t1" },
            { card: "BT4-065", as: "t2" },
            { card: "BT2-011", as: "tNear" },
          ],
          hand: ["BT1-013"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    expect(s.perm("magnetic").stack.map((card) => card.instanceId)).toEqual([s.inst("old1").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("t1").instanceId,
      s.inst("t2").instanceId,
      s.inst("tNear").instanceId,
    ]);
    expect(s.perm("magnetic").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes the top security card even when the opponent controls no Digimon to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
                { card: "BT4-065", as: "c" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => false, 40);

    // The deletion has no legal target, but the clause is still usable and its second result
    // lands: the cost is paid and the opponent's top security card is trashed.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5112 offers both simultaneous [When Digivolving] effects as one orderTriggers choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              // Suspended, so "it unsuspends" has a live effect and the clause is offered.
              suspended: true,
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
                { card: "BT4-065", as: "c" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
          trash: ["BT10-062", "BT10-064", "BT4-065"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const logged = s.decisions.filter((entry) => entry.req.kind === "orderTriggers");
    expect(logged).toHaveLength(1);
    const { seat, req: request } = logged[0]!;
    expect(seat).toBe(0);
    expect(request.decisionId).toBe(s.state.pendingDecision!.decisionId);
    expect(request.sourceCardId).toBe(CARD_ID);
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    // Both entries belong to the same physical card and the same window; the controller
    // picks which resolves next.
    const selfInstanceId = s.perm("magnetic").topCard!.instanceId;
    expect(keys.every((key) => key.startsWith(`${selfInstanceId}::`))).toBe(true);
    expect(keys.some((key) => key.endsWith("/ir-shared-0"))).toBe(true);
    expect(keys.some((key) => !key.endsWith("/ir-shared-0"))).toBe(true);
    expect(request.options?.triggerTimings).toEqual(["WhenDigivolving", "WhenDigivolving"]);

    // Answer with the placement clause first; the engine then re-prompts for the remainder.
    const placementKey = keys.find((key) => key.endsWith("/ir-shared-0"))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: [placementKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    // Placement first, deletion second: the stack gained 3 cards from the trash and then lost 3
    // to the delete clause's cost, the opponent's Digimon is gone and their top security is trashed.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn] is shared by both timings and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              // Nothing here matches [Mineral]/[Rock], so the delete clause never competes for
              // the same window and only the shared [Once Per Turn] clause can move the trash.
              under: [{ card: "BT1-009", as: "old1" }],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          trash: ["BT10-062", "BT10-064", "BT4-065", "BT10-062", "BT10-064", "BT4-065"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Attack first so the source is suspended: "it unsuspends" then has a live effect when
    // the [When Digivolving] window opens, which is what makes the clause offerable at all.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4);
    expect(s.perm("base").isSuspended).toBe(true);

    // First use of the turn, through the [When Digivolving] window.
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.perm("base").stack).toHaveLength(5);
    expect(s.perm("base").isSuspended).toBe(false);

    // Same turn, [When Attacking] window: the shared use is spent, so no second placement and
    // the attacker stays suspended. The uncapped delete clause still fires and spends the 3
    // cards that were just placed, which is why the stack falls back to 2.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 6);
    await settle(() => false, 30);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT2-064"]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("base").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the active phase unsuspended it and the shared use has reset, so the same
    // clause pays again. No [Mineral]/[Rock] card is in any stack now, so the delete clause
    // cannot compete for this window.
    expect(s.perm("base").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 5);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("base").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Fragment (3)＞ saves it from battle deletion by trashing 3 of its own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "magnetic",
              // Deliberately non-[Mineral]/[Rock] so neither [When Attacking] clause can pay.
              under: [
                { card: "BT1-009", as: "u1" },
                { card: "BT1-013", as: "u2" },
                { card: "BT1-014", as: "u3" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("magnetic"), "Fragment")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    await settle(() => false, 30);

    // 14000 DP loses to 20000 DP, but Fragment (3) pays with its own digivolution cards.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("magnetic").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("magnetic").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("u1").instanceId, s.inst("u2").instanceId, s.inst("u3").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the Close-gated Proganomon evolution for 6 and rejects it without Close", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-032", as: "base", under: [{ card: "BT1-009", as: "under1" }] },
          { card: "EX10-063", as: "close" },
        ],
        hand: [{ card: CARD_ID, as: "magnetic" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    valid.state.memory = 6;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("magnetic").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => false, 30);
    expect(valid.state.memory).toBe(0);
    // The whole source stack is carried under the new top card, and digivolving drew 1.
    expect(valid.perm("magnetic").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX10-032"]);
    expect(valid.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "EX10-032", as: "base" }],
        hand: [{ card: CARD_ID, as: "magnetic" }],
        deck: ["BT1-013"],
      },
    });
    blocked.state.memory = 6;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blocked.perm("base").permanentId,
        instanceId: blocked.inst("magnetic").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    // And a Lv.5 source cannot reach a Lv.7 by the printed requirement either.
    expect(
      blocked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blocked.perm("base").permanentId,
        instanceId: blocked.inst("magnetic").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("[When Digivolving] does not fire for a card that merely sits in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-064", as: "host", dp: 20_000, under: [{ card: CARD_ID, as: "buried" }] },
            { card: "BT1-009", as: "ally", dp: 20_000, under: [{ card: "BT10-062", as: "a" }] },
          ],
          trash: ["BT10-062", "BT10-064", "BT4-065"],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => false, 30);

    // Its clauses are main-body text, not inherited text: the carrier gains nothing.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
