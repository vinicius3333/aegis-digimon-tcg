import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-053.js";
import "../index.js";

const CARD_ID = "EX10-053";

/**
 * EX10-053 Regulusmon (Lv.5 Purple/Red Virus Evil Dragon, DP 10000, play cost 10).
 *
 * "[Digivolve] Lv.4 w/[Gammamon] in name: Cost 5"
 * "＜Rush＞ ＜Blocker＞"
 * "[On Play] [When Digivolving] You may place up to 5 differently named Digimon cards with
 *  [Gammamon] in their names from your trash as this Digimon's bottom digivolution cards.
 *  Then, delete 1 of your opponent's Digimon with as much or less DP as this Digimon."
 * "[End of Your Turn] [Once Per Turn] If this Digimon has 5 or more digivolution cards, it
 *  may attack without suspending."
 * Inherited: "[Your Turn] [Once Per Turn] When any of your opponent's Digimon are deleted,
 *  gain 1 memory."
 *
 * Every clause is driven through public intents (`playCard`, `digivolve`, `attack`,
 * `declareBlock`, `respondDecision`) and the production turn loop. No injected timing.
 *
 * Five differently named [Gammamon] cards whose OWN inherited text is empty, so a stack
 * built from them cannot move this Digimon's DP or open a decision of its own:
 * P-058 Gammamon, BT8-013 BetelGammamon, BT9-023 KausGammamon, BT10-050 WezenGammamon,
 * RB1-029 GulusGammamon.
 */
const GAMMAMON_TRASH = ["P-058", "BT8-013", "BT9-023", "BT10-050", "RB1-029"] as const;

async function answerOptional(s: EngineSetup, seat: 0 | 1, accept: boolean): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const pending = s.state.pendingDecision;
  expect(pending?.kind, "an optional prompt was expected").toBe("optional");
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: pending!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
}

/**
 * The [End of Your Turn] clause's only observable output is the attack it offers, so the
 * count of security checks in a board where nothing else attacks IS the count of firings.
 */
const endOfTurnAttacks = (s: EngineSetup): number =>
  s.events.filter((event) => event.kind === "securityChecked").length;

describe("EX10-053 Regulusmon", () => {
  it("records the exact catalog and the live ＜Rush＞/＜Blocker＞ keywords", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Regulusmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 10,
      dp: 10000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 5 },
        { color: "Red", level: 4, memoryCost: 5 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Evil Dragon"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your opponent's Digimon are deleted, gain 1 memory.",
    });
    expect(getCardDefinition(CARD_ID)!.securityEffectText ?? "").toBe("");
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "regulus" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("regulus"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("regulus"), "Blocker")).toBe(true);
  });

  it("records the compiled clause shapes the behavioral tests exercise", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // `names` is the SUBSTRING gate (cardData.ts `req.names` -> `name.includes(n)`), which is
    // what "w/[Gammamon] in name" prints: GulusGammamon/BetelGammamon qualify, not only "Gammamon".
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Gammamon"], cost: 5, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((candidate) => candidate.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "PlaceUnder",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
              },
              count: 5,
              upTo: true,
              distinctNames: true,
              from: ["trash"],
            },
            position: "bottom",
            optional: true,
          },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
              count: 1,
            },
          },
        ],
      });
      // "Then, delete" is not part of the "you may place" option: it has no `optional`.
      expect(effect?.actions?.[1]?.optional).toBeUndefined();
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          withoutSuspending: true,
          optional: true,
          condition: { kind: "selfDigivolutionCountAtLeast", value: 5 },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("[On Play] from hand: places 5 differently named [Gammamon] cards, deletes within its DP, then ＜Rush＞ attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014"],
          trash: [
            { card: "P-058", as: "g1" },
            { card: "BT8-013", as: "g2" },
            { card: "BT9-023", as: "g3" },
            { card: "BT10-050", as: "g4" },
            { card: "RB1-029", as: "g5" },
            // A SIXTH [Gammamon] card sharing g1's name: `distinctNames` must exclude it.
            { card: "P-059", as: "duplicateName" },
            { card: "BT1-013", as: "nonMatch" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "equalDp", dp: 10000 },
            { card: "BT1-014", as: "overDp", dp: 11000 },
          ],
          security: ["BT1-009", "BT1-013"],
          deck: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      ...(["g1", "g2", "g3", "g4", "g5"] as const).map((alias) => s.inst(alias).instanceId),
      s.perm("equalDp").topCard.instanceId,
    );
    s.state.memory = 10;
    await s.ready();
    const overDpId = s.perm("overDp").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    const regulus = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === CARD_ID)!;
    // All five landed as digivolution cards. The engine places them one at a time at the
    // stack bottom, so the placed group ends up in reverse selection order; the printed text
    // fixes only that they go to the BOTTOM, which the digivolve test below asserts exactly.
    expect(regulus.stack.map((card) => card.instanceId)).toEqual(
      (["g5", "g4", "g3", "g2", "g1"] as const).map((alias) => s.inst(alias).instanceId),
    );
    expect(new Set(regulus.stack.map((card) => getCardDefinition(card.cardId)!.nameEn)).size).toBe(5);
    // The same-named sixth card and the non-[Gammamon] card stayed in trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("duplicateName").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    // The 10000 DP Digimon was deleted; the 11000 DP one was never a legal target.
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([overDpId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    // 10 memory paid for the play cost. The stack cards were placed, not played: no extra cost.
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    // ＜Rush＞: it entered the battle area THIS turn and still attacks.
    expect(observe(s.engine).hasKeyword(regulus, "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: regulus.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    // No opposing ＜Blocker＞ is on the board, so the attack resolves without a block window.
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(regulus.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("[When Digivolving] over EX10-042 GulusGammamon on the Lv.4 w/[Gammamon] route: cost 5, bonus draw, TRUE bottom placement", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-042",
              as: "gulus",
              under: [
                { card: "BT1-009", as: "under1" },
                { card: "BT1-013", as: "under2" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "regulus" }],
          deck: [{ card: "BT1-014", as: "bonusDraw" }, "BT1-009"],
          trash: [
            { card: "P-058", as: "g1" },
            { card: "BT8-013", as: "g2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("g1").instanceId, s.inst("g2").instanceId, s.perm("victim").topCard.instanceId);
    s.state.memory = 6;
    await s.ready();

    // GulusGammamon is a Lv.4 Purple/Red base, so the PRINTED evoCost (5) also matches.
    // `alternateRequirementIndex: 0` declares the printed "[Digivolve] Lv.4 w/[Gammamon] in
    // name: Cost 5" route explicitly; the server revalidates the level and substring name gate.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gulus").permanentId,
        instanceId: s.inst("regulus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const regulus = s.perm("gulus");
    expect(regulus.topCard.instanceId).toBe(s.inst("regulus").instanceId);
    // "bottom digivolution cards": the placed cards sit BELOW the two cards that were already
    // under the base and below the base card itself. `Permanent.stack` is bottom-first.
    expect(regulus.stack.map((card) => card.instanceId)).toEqual([
      s.inst("g2").instanceId,
      s.inst("g1").instanceId,
      s.inst("under1").instanceId,
      s.inst("under2").instanceId,
      s.inst("gulus").instanceId,
    ]);
    // 6 - 5 (the alternate route's cost) = 1.
    expect(s.state.memory).toBe(1);
    // The digivolution bonus draw took the top card of the deck.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses an illegal digivolution source: a green Lv.4 base, and the Lv.4-only route from a Lv.3 [Gammamon]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "green" },
          { card: "P-058", as: "lv3Gammamon" },
        ],
        hand: [{ card: CARD_ID, as: "regulus" }],
        deck: ["BT1-013", "BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    // BT1-064 Goblimon is GREEN: neither printed evoCost (Purple/Red Lv.4) nor the alternate
    // route (Lv.4 w/[Gammamon] in name) matches.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("regulus").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    // P-058 Gammamon is Lv.3: the name gate passes but the printed `Lv.4` gate does not.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lv3Gammamon").permanentId,
        instanceId: s.inst("regulus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(s.perm("green").topCard.cardId).toBe("BT1-064");
    expect(s.perm("lv3Gammamon").topCard.cardId).toBe("P-058");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("regulus").instanceId]);
    expect(s.state.memory).toBe(10);
  });

  it("Q5136: the deletion resolves even when the optional placement is DECLINED", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013"],
          // A legal placement IS available, so the decline is a real choice, not an empty set.
          trash: [{ card: "P-058", as: "g1" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim", dp: 10000 }], deck: ["BT1-014"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulus").instanceId })).toEqual({
      ok: true,
    });
    await answerOptional(s, 0, false);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const regulus = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === CARD_ID)!;
    expect(regulus.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("g1").instanceId]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).not.toContain(victimId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q5136: the deletion resolves when the trash holds no [Gammamon] card at all", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013"],
          trash: [{ card: "BT1-013", as: "nonMatch" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim", dp: 10000 }], deck: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const regulus = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === CARD_ID)!;
    expect(regulus.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("nonMatch").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("the DP bound is strict: an 11000 DP Digimon is no legal target, so nothing is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013"],
          trash: [{ card: "P-058", as: "g1" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "overDp", dp: 11000 }], deck: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const overDpId = s.perm("overDp").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 0);
    await settle(() => false, 30);

    // The placement still happened, so the clause did resolve; only the deletion found no target.
    const regulus = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === CARD_ID)!;
    expect(regulus.stack.map((card) => card.instanceId)).toEqual([s.inst("g1").instanceId]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toEqual([overDpId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("＜Blocker＞: it redirects the opponent's attack onto itself on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "regulus" }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("regulus").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // 10000 DP blocker versus a 3000 DP attacker: the attacker dies, security is untouched.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("regulus").topCard.cardId).toBe(CARD_ID);
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[End of Your Turn]: with 5 digivolution cards it attacks WITHOUT suspending, and the use resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "regulus", under: [...GAMMAMON_TRASH] }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("regulus").stack).toHaveLength(5);
    expect(endOfTurnAttacks(s)).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await answerOptional(s, 0, true);
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    // "attack without suspending": the attack happened and the Digimon is still unsuspended.
    expect(s.perm("regulus").isSuspended).toBe(false);
    expect(endOfTurnAttacks(s)).toBe(1);

    await advance(s.engine).waitForMainPhase(1);
    expect(endOfTurnAttacks(s)).toBe(1);
    // "[End of Your Turn]": the opponent's end of turn is not this Digimon's.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(endOfTurnAttacks(s)).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // Next own turn: the [Once Per Turn] use has reset and the clause fires again.
    advance(s.engine).endMainPhaseIfOpen(0);
    await answerOptional(s, 0, true);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(endOfTurnAttacks(s)).toBe(2);
    expect(s.perm("regulus").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[End of Your Turn]: with only 4 digivolution cards the clause offers nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "regulus", under: GAMMAMON_TRASH.slice(0, 4) }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("regulus").stack).toHaveLength(4);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.perm("regulus").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherited: gains 1 memory the first time an opponent's Digimon is deleted on your turn, and only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "carrier", dp: 20_000, under: [{ card: CARD_ID, as: "regulusCard" }] },
            { card: "BT1-013", as: "plain", dp: 20_000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "first", dp: 3000, suspended: true },
            { card: "BT1-014", as: "second", dp: 3000, suspended: true },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("carrier").stack.map((card) => card.instanceId)).toEqual([s.inst("regulusCard").instanceId]);
    const memoryBefore = s.state.memory;

    // First battle deletion of the turn: the inherited watcher pays out.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBefore + 1);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // Second deletion, same turn, by a Digimon that carries no copy of this card: the
    // [Once Per Turn] use on the carrier is spent, so no further memory is gained.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 30);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore + 1);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
