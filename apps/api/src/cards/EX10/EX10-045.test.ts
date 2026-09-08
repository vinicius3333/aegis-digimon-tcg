import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-045.js";
import "../index.js";

const CARD_ID = "EX10-045";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

// [Bagra Army] trait Digimon that stay quiet while merely sitting on the board: their printed
// clauses are [On Play] / [When Digivolving] / [On Deletion] only.
const BAGRA_HOST = "EX10-026"; // SkullKnightmon, Lv.4 4000, [Undead]/[Bagra Army]/[Twilight]
const BAGRA_TARGET = "EX10-044"; // Damemon, Lv.4 3000, [Mutant]/[Bagra Army] — the DigiXros material
const CHUUCHUUMON = "EX10-039"; // ChuuChuumon, Lv.3, [Beast]/[Bagra Army] — the other material
// Lv.4 [Mineral]/[LIBERATOR]: a digivolution-card pool the [Bagra Army] hostFilter must refuse.
const NON_BAGRA_HOST = "EX10-028";
// Level 3 Black Digimon with no printed text: a legal NORMAL evolution source for Tuwarmon
// (Black Lv.3, cost 3) but an illegal source for the "[Damemon]: Cost 1" alternate route.
const NON_DAMEMON_LV3 = "BT2-052";
const NEUTRAL_TAMER = "BT12-094"; // Yuu Amano: no [On Deletion] / battle-time clause of its own

describe("EX10-045 Tuwarmon", () => {
  it("records the exact catalog and the [Damemon] alternate evolution", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 4,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mutant", "Bagra Army"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Damemon"], cost: 1, isAlternate: true }]);
  });

  it("compiles one shared once-per-turn clause, a [DigiXros -2] pair, and a bottom-positioned ＜Save＞", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // `count` on a DigiXros requirement is the PER-MATERIAL cost reduction (xrosLink.ts), so
    // "[DigiXros -2] [Damemon] x [ChuuChuumon]" is two distinct slots at -2 each.
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Damemon"] }, { names: ["ChuuChuumon"] }], count: 2 },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "GainKeyword",
            target: { bindAs: "chosen" },
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
            cost: {
              kind: "trash",
              target: {
                filter: { hostFilter: { nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] } },
                from: ["digivolutionCards"],
              },
            },
          },
          {
            kind: "GainKeyword",
            target: { fromSelectionRef: "chosen", filter: {}, count: 1 },
            keyword: { keyword: "Retaliation" },
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    // Comprehensive Rules 4-3: ＜Save＞ places this card at the BOTTOM of the Tamer's stack.
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          target: { isSelf: true },
          underFilter: { kind: ["Tamer"] },
          position: "bottom",
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "Static" && effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("＜Rush＞: attacks the turn it is played, where a plain Digimon cannot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: BAGRA_HOST, as: "slow" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("slow").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === BAGRA_HOST));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    // Both arrived this turn. Only the one printing ＜Rush＞ may attack (§16-1).
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("slow").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tuwarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("＜Collision＞: a Digimon without ＜Blocker＞ may block it, but not a plain attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: "BT1-009", as: "plainAttacker", dp: 20_000 },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "noBlocker", dp: 20_000 }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // The plain attacker offers no ＜Collision＞, so the blockerless defender is an illegal blocker.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plainAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The plain attacker grants no ＜Collision＞ and the defender has no ＜Blocker＞, so no block
    // window ever opens for this attack — there is no such milestone to wait on here.
    await drainMicrotasks();
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("noBlocker").permanentId }),
    ).toMatchObject({ ok: false });
    await settle(() => s.state.players[1]!.security.length === 2);

    // Tuwarmon's ＜Collision＞ (§16-30) makes the very same defender a legal blocker.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tuwarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("noBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.events.filter((event) => event.kind === "blocked")).toHaveLength(1);
    // The block stopped the second security check.
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("[On Play]: pays from a friendly [Bagra Army] stack and grants both keywords to one chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BAGRA_HOST, as: "costHost", under: [{ card: "BT1-009", as: "cost" }] },
            { card: BAGRA_TARGET, as: "target" },
            { card: "BT1-009", as: "plain" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard.instanceId);
    await s.ready();
    s.state.memory = 7;
    const costId = s.inst("cost").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === costId) &&
        s.state.pendingDecision === undefined,
    );

    // Play cost paid in full, cost card moved stack -> trash.
    expect(s.state.memory).toBe(0);
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([costId]);
    // Both keywords land on the SAME chosen Digimon (`fromSelectionRef: "chosen"`).
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(true);
    // Not on the non-[Bagra Army] board-mate, and not spread across the whole board.
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Retaliation")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("costHost"), "Retaliation")).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play]: a non-[Bagra Army] host's digivolution cards cannot pay, so neither keyword is granted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NON_BAGRA_HOST, as: "wrongTraitHost", under: [{ card: "BT1-009", as: "offLimits" }] },
            { card: BAGRA_TARGET, as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("wrongTraitHost").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("offLimits").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play]: declining the trash cost grants neither keyword and keeps the digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BAGRA_HOST, as: "costHost", under: [{ card: "BT1-009", as: "cost" }] },
            { card: BAGRA_TARGET, as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("costHost").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(false);
  });

  it("[When Digivolving]: the [Damemon] route costs 1, keeps the source in the stack, and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BAGRA_TARGET, as: "damemon" }],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const damemonId = s.inst("damemon").instanceId;
    const tuwarmonId = s.inst("tuwarmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("damemon").permanentId,
        instanceId: tuwarmonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("damemon").topCard.instanceId === tuwarmonId && s.state.pendingDecision === undefined);

    // Cost 1, not the printed EvoCost of 3.
    expect(s.state.memory).toBe(3);
    // `stack` holds only the cards beneath the top card: Damemon became a digivolution card.
    expect(s.perm("damemon").stack.map(({ instanceId }) => instanceId)).toEqual([damemonId]);
    expect(s.perm("damemon").topCard.cardId).toBe(CARD_ID);
    // The digivolution bonus draw.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("[When Digivolving]: a non-[Damemon] level 3 source is refused the cost-1 route but legal at the printed 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NON_DAMEMON_LV3, as: "source" }],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // 5 memory covers even the printed EvoCost of 3, so the refusal is the [Damemon] name gate.
    s.state.memory = 5;
    const tuwarmonId = s.inst("tuwarmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: tuwarmonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("source").topCard.cardId).toBe(NON_DAMEMON_LV3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: tuwarmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(2);
  });

  it("[Once Per Turn] is shared across the timings of one Digimon and resets on its next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BAGRA_TARGET, as: "damemon" },
            {
              card: BAGRA_HOST,
              as: "costHost",
              under: [
                { card: "BT1-009", as: "cost1" },
                { card: "BT1-013", as: "cost2" },
              ],
            },
            { card: BAGRA_TARGET, as: "targetA" },
            { card: BAGRA_TARGET, as: "targetB" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          deck: INERT_DECK,
          security: INERT_SECURITY,
          hand: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost1").instanceId, s.perm("targetA").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    const tuwarmonId = s.inst("tuwarmon").instanceId;

    // Use 1 of 1 on this Digimon: the [When Digivolving] arm.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("damemon").permanentId,
        instanceId: tuwarmonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("targetA"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("targetA"), "Retaliation")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost1").instanceId]);

    // Same turn, SAME Digimon, the [When Attacking] arm of the same clause: the shared
    // once-per-turn use is spent, so no second grant and the second cost card is untouched.
    preferred.length = 0;
    preferred.push(s.inst("cost2").instanceId, s.perm("targetB").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.pendingDecision === undefined);
    expect(observe(s.engine).hasKeyword(s.perm("targetB"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("targetB"), "Retaliation")).toBe(false);
    expect(s.perm("costHost").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost2").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost1").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // The first grant expired with the opponent's turn, and the once-per-turn use has reset.
    expect(observe(s.engine).hasKeyword(s.perm("targetA"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("targetA"), "Retaliation")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("targetB"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("targetB"), "Retaliation")).toBe(true);
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("cost1").instanceId, s.inst("cost2").instanceId].sort(),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("the granted ＜Blocker＞ and ＜Retaliation＞ work on the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BAGRA_HOST, as: "costHost", under: [{ card: "BT1-009", as: "cost" }] },
            { card: BAGRA_TARGET, as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
          hand: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;
    const targetId = s.perm("target").topCard.instanceId;
    const attackerId = s.perm("attacker").topCard.instanceId;

    // The grant comes from [On Play] on my own turn; no combat of mine is involved.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => observe(s.engine).hasKeyword(s.perm("target"), "Blocker") && s.state.pendingDecision === undefined,
    );
    // Neutral memory so ending Main hands the turn straight to the opponent.
    s.state.memory = 0;

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // The grant survives into the opponent's turn ("until your opponent's turn ends").
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    // The granted ＜Blocker＞ is what makes this a legal block: Damemon prints none.
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("target").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === attackerId) &&
        s.state.pendingDecision === undefined,
    );

    // 3000 vs 20000: the blocker died, and ＜Retaliation＞ (§16-13) took the attacker with it.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(targetId);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(attackerId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(attackerId);
    // The block stopped the security check.
    expect(s.state.players[0]!.security).toHaveLength(3);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[DigiXros -2]: one [Damemon] and one [ChuuChuumon] each cut 2 from the play cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: BAGRA_TARGET, as: "damemon" },
            { card: CHUUCHUUMON, as: "chuu" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const damemonId = s.inst("damemon").instanceId;
    const chuuId = s.inst("chuu").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tuwarmon").instanceId,
        digiXros: { materialInstanceIds: [damemonId, chuuId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    // Printed cost 7, reduced by 2 per material.
    expect(s.state.memory).toBe(4);
    const xrosed = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(xrosed.stack.map(({ instanceId }) => instanceId).sort()).toEqual([damemonId, chuuId].sort());
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("[DigiXros -2]: a card matching neither named slot is refused as material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: BAGRA_TARGET, as: "damemon" },
            // [Bagra Army] but not [ChuuChuumon]: the recipe names cards, not the trait.
            { card: BAGRA_HOST, as: "wrongMaterial" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tuwarmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("damemon").instanceId, s.inst("wrongMaterial").instanceId],
        },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("[On Deletion] ＜Save＞: the deleted card goes to the BOTTOM of the Tamer's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tuwarmon" },
            {
              card: NEUTRAL_TAMER,
              as: "tamer",
              under: [
                { card: "BT1-013", as: "under0" },
                { card: "BT1-014", as: "under1" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tuwarmonId = s.inst("tuwarmon").instanceId;
    // `under` is bottom-most first, so the Tamer already holds under0 (bottom), under1 (top).
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("under0").instanceId,
      s.inst("under1").instanceId,
    ]);

    // 7000 into a suspended 20000 wall: Tuwarmon loses the battle and is deleted.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tuwarmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === tuwarmonId));

    // Comprehensive Rules 4-3: the saved card goes to the BOTTOM of the stack, not directly
    // beneath the Tamer.
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      tuwarmonId,
      s.inst("under0").instanceId,
      s.inst("under1").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(tuwarmonId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(tuwarmonId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] ＜Save＞ is declinable: refusing sends this card to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: NEUTRAL_TAMER, as: "tamer" },
          ],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tuwarmonId = s.inst("tuwarmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tuwarmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === tuwarmonId));

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(tuwarmonId);
  });

  it("inherited: ＜Draw 1＞ when an effect trashes THIS card from a [Bagra Army] host's stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BAGRA_HOST, as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: BAGRA_TARGET, as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("source").instanceId, s.perm("target").topCard.instanceId);
    await s.ready();
    s.state.memory = 7;
    const sourceId = s.inst("source").instanceId;

    // The played copy's own trash cost is the effect that trashes the digivolution card.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === sourceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    // The inherited clause drew exactly the top card of the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
  });

  it("inherited: trashing a different card from the same host draws nothing (`sourceFilter: isSelfRef`)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BAGRA_HOST, as: "host", under: [{ card: "BT1-009", as: "source" }] },
            { card: BAGRA_TARGET, as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "tuwarmon" }],
          deck: [{ card: "BT1-009", as: "notDrawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("source").instanceId, s.perm("target").topCard.instanceId);
    await s.ready();
    s.state.memory = 7;
    const sourceId = s.inst("source").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === sourceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
  });
});
