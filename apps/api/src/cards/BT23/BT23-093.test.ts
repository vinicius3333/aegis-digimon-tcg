import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-093.js";

/**
 * Fixture vocabulary.
 *
 * `[Appmon]` is a FORM on Digimon records (BT21-009 / BT22-016 -> `forms: ["Stnd.","Appmon"]`),
 * and the engine's trait set is forms ∪ attributes ∪ types, so `match: "trait"` (exact) matches.
 * `<Link>` eligibility is the structured `linkRequirement` field, not text: BT21-009 carries
 * "[Link] [Appmon] trait: Cost 1" and BT22-016 carries none — that pair is the Q5367 control.
 */
const APPMON_WITH_LINK = "BT21-009"; // Gatchmon, red, [Appmon] form, Link cost 1
const APPMON_NO_LINK = "BT22-016"; // Mcmon, blue, [Appmon] form, no [Link]
const APPMON_TAMER = "BT21-084"; // Haru Shinkai, red Tamer, [Appmon] type
const VANILLA_ROOKIE = "BT1-009"; // Monodramon, red, no [Appmon]
const WEAK_SECURITY = "BT1-011"; // Agumon Expert, 1000 DP main-deck Digimon
/** Mcmon prints only 1000 DP, which trades with WEAK_SECURITY; give attackers headroom. */
const SURVIVES_SECURITY = 4000;

/**
 * Probe a permanent by id without the alias helper's "must still exist" assertion, so a
 * `settle` predicate can poll across a battle window that transiently rebuilds the board.
 */
function suspended(s: ReturnType<typeof setupEngine>, seat: 0 | 1, permanentId: string): boolean {
  return s.state.players[seat]!.battleArea.find((p) => p.permanentId === permanentId)?.isSuspended === true;
}

describe("BT23-093 Big Bang Punch", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-093")).toMatchObject({
      cardId: "BT23-093",
      nameEn: "Big Bang Punch!",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Appmon"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const staticEffect = compiled.effects.find((effect) => effect.trigger === "Static") as any;
    expect(staticEffect.actions[0].condition.filter.zone).toEqual(["battleArea", "breeding"]);
    expect(staticEffect.actions[0].condition.filter.kind).toEqual(["Digimon", "Tamer"]);
    expect(staticEffect.actions[0].condition.filter.nameOrTrait).toEqual([{ tokens: ["Appmon"], match: "trait" }]);
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions.map((action: any) => action.kind)).toEqual(["Draw", "PlaceInBattleAreaSelf"]);
    expect(main.actions[0].amount).toBe(1);
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.isSecurity).toBe(true);
    expect(security.actions.map((action: any) => action.kind)).toEqual(["PlaceInBattleAreaSelf"]);
  });

  // C1 (Q5366): "on the field" is the battle area OR the breeding area.
  it("waives the blue color requirement from an off-color Appmon Digimon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: APPMON_WITH_LINK, as: "appmonInBreeding" },
        hand: [{ card: "BT23-093", as: "option" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    assertNoLoudGap(s);
  });

  // C1 (Q5366): the battle-area half, satisfied by a TAMER rather than a Digimon.
  it("waives the color requirement from an off-color Appmon Tamer in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: APPMON_TAMER, as: "tamer" }],
        hand: [{ card: "BT23-093", as: "option" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  // C1 negative: no [Appmon] card on the field, so the printed blue requirement stands.
  it("refuses the off-color play with no Appmon Digimon or Tamer on the field", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: VANILLA_ROOKIE, as: "vanilla" },
        hand: [{ card: "BT23-093", as: "option" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  // C1 controller boundary: "you have" is your field only, so an opponent Appmon does not waive.
  it("refuses the off-color play when only the opponent controls an Appmon card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT23-093", as: "option" }],
        deck: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: APPMON_TAMER, as: "opponentTamer" }],
        breeding: { card: APPMON_WITH_LINK, as: "opponentAppmon" },
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([optionId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  // C3 source-zone boundary: the link card must come from HAND, not from the trash.
  it("does not link an Appmon card sitting in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_NO_LINK, as: "attacker", dp: SURVIVES_SECURITY },
          ],
          trash: [{ card: APPMON_WITH_LINK, as: "inTrash" }],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const trashedId = s.inst("inTrash").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => suspended(s, 0, attackerId));
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([trashedId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  // C2: "＜Draw 1＞. Then, place this card in the battle area."
  it("draws exactly 1 and then places itself in the battle area for memory 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: APPMON_NO_LINK, as: "appmon" }],
        hand: [{ card: "BT23-093", as: "option" }],
        deck: [
          { card: "BT1-010", as: "topOfDeck" },
          { card: "BT1-012", as: "secondOfDeck" },
        ],
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("topOfDeck").instanceId;
    const untouchedId = s.inst("secondOfDeck").instanceId;
    await s.ready();
    expect(s.state.players[0]!.hand).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([untouchedId]);
    const placed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  // C3 + Q5367: the Delay pays its own trash cost, links only the <Link>-capable Appmon,
  // and leaves the no-<Link> Appmon physically in hand.
  it("pays intrinsic Delay and links only a Link-capable Appmon to the suspending subject", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_NO_LINK, as: "recipient" },
          ],
          hand: [
            { card: APPMON_WITH_LINK, as: "eligible" },
            { card: APPMON_NO_LINK, as: "noLink" },
          ],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const eligibleId = s.inst("eligible").instanceId;
    const invalidId = s.inst("noLink").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("recipient").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    expect(s.perm("recipient").linked.map((card) => card.instanceId)).toEqual([eligibleId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([invalidId]);
    assertNoLoudGap(s);
  });

  // C3: "to 1 of THOSE Digimon" — the recipient is the suspending Digimon, not any Appmon.
  it("links to the suspending Appmon, not to an idle Appmon bystander", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_NO_LINK, as: "attacker", dp: SURVIVES_SECURITY },
            { card: APPMON_NO_LINK, as: "bystander" },
          ],
          hand: [{ card: APPMON_WITH_LINK, as: "eligible" }],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const eligibleId = s.inst("eligible").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.perm("attacker").linked.map((card) => card.instanceId)).toEqual([eligibleId]);
    expect(s.perm("bystander").linked).toHaveLength(0);
    expect(s.perm("bystander").isSuspended).toBe(false);
  });

  // C3: "without paying the cost" — BT21-009's printed link cost is 1 and must not be paid.
  it("links the cost-1 Appmon without spending memory", async () => {
    expect(getCardDefinition(APPMON_WITH_LINK)?.linkRequirement ?? "").toMatch(/^\[Link\] \[Appmon\]\s*trait: Cost 1$/);
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_NO_LINK, as: "attacker", dp: SURVIVES_SECURITY },
          ],
          hand: [{ card: APPMON_WITH_LINK, as: "eligible" }],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.perm("attacker").linked).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("does not pay Delay when a non-Appmon Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: VANILLA_ROOKIE, as: "attacker" },
          ],
          hand: [{ card: APPMON_WITH_LINK, as: "eligible" }],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const eligibleId = s.inst("eligible").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => suspended(s, 0, attackerId));
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([eligibleId]);
  });

  it("does not pay Delay for an opponent-controlled Appmon suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-093", as: "option" }],
          security: [WEAK_SECURITY, WEAK_SECURITY],
          hand: [{ card: APPMON_WITH_LINK, as: "eligible" }],
        },
        1: { battleArea: [{ card: APPMON_NO_LINK, as: "opponentAttacker", dp: SURVIVES_SECURITY }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const eligibleId = s.inst("eligible").instanceId;
    const attackerId = s.perm("opponentAttacker").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => suspended(s, 1, attackerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("opponentAttacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([eligibleId]);
  });

  // Q5367 in isolation: the ONLY Appmon card in hand has no [Link], so `canAttemptLink`
  // fails the Delay before its optional ask and the source card is never trashed.
  it("keeps the Delay card when the only Appmon in hand has no [Link]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_NO_LINK, as: "attacker", dp: SURVIVES_SECURITY },
          ],
          hand: [{ card: APPMON_NO_LINK, as: "noLink" }],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const noLinkId = s.inst("noLink").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => suspended(s, 0, attackerId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([noLinkId]);
  });

  // §16-17-2: ＜Delay＞ is optional processing. Declining keeps the source card and the hand.
  it("keeps the card and the hand intact when the Delay is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_NO_LINK, as: "attacker", dp: SURVIVES_SECURITY },
          ],
          hand: [{ card: APPMON_WITH_LINK, as: "eligible" }],
        },
        1: { security: [WEAK_SECURITY, WEAK_SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const eligibleId = s.inst("eligible").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => suspended(s, 0, attackerId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([eligibleId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // §16-17-3: "You can't activate this effect the turn this card enters play." Proven on the
  // real turn loop: the option is PLAYED on turn 1 (C2 places it), the same-turn suspension
  // must not pay it, and the next own turn must.
  it("cannot pay Delay the turn it is placed and can on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: APPMON_NO_LINK, as: "attacker", dp: SURVIVES_SECURITY }],
          hand: [
            { card: "BT23-093", as: "option" },
            { card: APPMON_WITH_LINK, as: "eligible" },
            { card: VANILLA_ROOKIE, as: "neutral" },
          ],
          deck: Array(10).fill("BT1-010"),
          security: [WEAK_SECURITY, WEAK_SECURITY],
        },
        1: {
          deck: Array(10).fill("BT1-012"),
          security: [WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY, WEAK_SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const eligibleId = s.inst("eligible").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const placedTurn = s.state.turnCount;

    // Same turn as placement: the suspension must not arm the Delay.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => suspended(s, 0, attackerId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === eligibleId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnCount).not.toBe(placedTurn);
    expect(s.perm("attacker").isSuspended).toBe(false);

    // Next own turn: the same option now pays its Delay and links.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    expect(s.perm("attacker").linked.map((card) => card.instanceId)).toEqual([eligibleId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // C4: "[Security] Place this card in the battle area."
  it("places itself in the battle area from a security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: VANILLA_ROOKIE, as: "attacker" }] },
        1: { security: [{ card: "BT23-093", as: "securityOption" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("securityOption").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const placed = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("links an Appmon card from hand to the suspending Appmon Digimon", () => {
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.trigger).toBe("AllTurns");
    const subTrigger = delay.actions[0];
    expect(subTrigger).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(subTrigger.sourceFilter).toEqual({
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
    });
    const link = subTrigger.actions[0];
    expect(link).toMatchObject({ kind: "Link", from: ["hand"], optional: true, payCost: false });
    expect(link.target.filter.nameOrTrait).toEqual([{ tokens: ["Appmon"], match: "trait" }]);
    expect(link.target.count).toBe(1);
    expect(link.recipient).toEqual({ filter: { isTriggerSource: true }, count: 1 });
    expect(link.linkCardFilter).toBeUndefined();
  });
});
