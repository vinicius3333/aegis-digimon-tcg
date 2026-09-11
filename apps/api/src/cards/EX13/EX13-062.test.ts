import { assemblyRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-062.js";

const CARD_ID = "EX13-062";

// Catalog fixtures, every field verified against `packages/shared/src/cards/data/cards.json`.
//
// Assembly materials, leftmost printed slot first — all mono-Black, all printing ＜Blocker＞ in
// their OWN effect text, and none carrying inherited text that could leak into the played stack:
const LV5_BLACK_BLOCKER = "BT2-061"; // Andromon, Black Lv.5, 7000 DP, ＜Blocker＞
const LV4_BLACK_BLOCKER = "BT2-058"; // Guardromon, Black Lv.4, 7000 DP, ＜Blocker＞
const LV3_BLACK_BLOCKER = "BT2-054"; // Gotsumon, Black Lv.3, 3000 DP, ＜Blocker＞
// Discriminators for the two printed Assembly predicates, one failing exactly one of them:
const LV4_BLACK_NO_BLOCKER = "BT3-067"; // Tankmon, Black Lv.4, no printed keyword at all
const LV4_GREEN_BLOCKER = "BT1-072"; // Woodmon, GREEN Lv.4, ＜Blocker＞
// Digivolution sources for the printed EvoCost (Black Lv.5 for 3) and its negatives:
const BLACK_LV5 = "BT2-060"; // Megadramon, Black Lv.5, 9000 DP, no printed text
const RED_LV5 = "BT1-024"; // MetalTyrannomon, Red Lv.5, 10000 DP, no printed text — wrong colour
// Opponent bodies with distinct PLAY COSTS, all inert (no printed effect, no inherited effect):
const COST2 = "BT1-009"; // Monodramon, play cost 2, 3000 DP — the lowest play cost
const COST3 = "BT1-013"; // Muchomon, play cost 3, 5000 DP
const COST4 = "BT4-065"; // Gotsumon, play cost 4, 6000 DP
const FILLER = "BT1-009";
const DECK = Array(20).fill(FILLER) as string[];

/** Hand the turn to seat 1 through the production turn loop and open its Main phase. */
async function openOpponentMain(s: ReturnType<typeof setupEngine>): Promise<void> {
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
}

/** Hand the turn back to seat 0 through the production turn loop and open its Main phase. */
async function openOwnMain(s: ReturnType<typeof setupEngine>): Promise<void> {
  advance(s.engine).endMainPhaseIfOpen(1);
  await advance(s.engine).waitForMainPhase(0);
}

describe("EX13-062 Craniamon", () => {
  it("matches the catalog identity and every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Craniamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      rarity: "SR",
      maxCountInDeck: 4,
    });
    const text = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(text).toContain("[Assembly -5] Lv.5 × Lv.4 × Lv.3, all Black w/＜Blocker＞");
    expect(text).toContain("＜Reboot＞");
    expect(text).toContain("＜Blocker＞");
    expect(text).toContain(
      "[On Play] [When Digivolving] Your opponent's effects don't affect this Digimon until their turn ends.",
    );
    expect(text).toContain(
      "[All Turns] [Once Per Turn] When this Digimon suspends, you may delete all of your opponent's Digimon with the lowest play cost.",
    );
    expect(text).toContain("[All Turns] When this Digimon unsuspends, it gets +3000 DP until your turn ends.");
    // No inherited effect and no security effect are printed.
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("");
    expect((getCardDefinition(CARD_ID)?.securityEffectText ?? "").trim()).toBe("");
  });

  it("compiles the keyword pair, both immunity windows, both watchers and the Assembly header", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(5);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }],
    });

    // "Your opponent's effects" carries no card-kind narrowing, so the immunity is the blanket
    // `opponentEffects` one, and both printed timings are separate un-budgeted windows.
    for (const [index, trigger] of (["OnPlay", "WhenDigivolving"] as const).entries()) {
      expect(compiled.effects[index + 1]).toMatchObject({
        trigger,
        actions: [
          {
            kind: "GrantImmunity",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            immuneFrom: "opponentEffects",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
      expect(compiled.effects[index + 1]?.frequency).toBeUndefined();
      expect(compiled.effects[index + 1]?.sharedUseKey).toBeUndefined();
    }

    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              optional: true,
              target: {
                count: "all",
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
              },
            },
          ],
        },
      ],
    });

    // The unsuspend clause prints no [Once Per Turn], so it must NOT carry a frequency budget.
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "untilYourTurnEnd",
            },
          ],
        },
      ],
    });
    expect(compiled.effects[4]?.frequency).toBeUndefined();

    const blockerInText = [{ tokens: ["＜Blocker＞"], match: "text" }];
    const assembly = [
      {
        reduceCost: 5,
        materials: [
          { count: 1, level: 5, colors: ["Black"], nameOrTrait: blockerInText },
          { count: 1, level: 4, colors: ["Black"], nameOrTrait: blockerInText },
          { count: 1, level: 3, colors: ["Black"], nameOrTrait: blockerInText },
        ],
      },
    ];
    expect(compiled.assemblyRequirement).toEqual(assembly);
    // The registered module is what the shared Assembly reader serves to the play subsystem.
    expect(assemblyRequirementFor(CARD_ID)).toEqual(assembly);
    // The printed EvoCost row is the only digivolve route; no `[Digivolve]` header is printed.
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("grants both printed keywords through the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "craniamon" }], deck: DECK } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Blocker")).toBe(true);
    expect(s.perm("craniamon").currentDP).toBe(12_000);
  });

  // ---------------------------------------------------------------------------
  // [Assembly -5] Lv.5 × Lv.4 × Lv.3, all Black w/＜Blocker＞
  // ---------------------------------------------------------------------------

  it("plays by Assembly from the trash for 5 less, stacking the leftmost slot closest to the top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "craniamon" },
            { card: FILLER, as: "spare" },
          ],
          trash: [
            { card: LV5_BLACK_BLOCKER, as: "lv5" },
            { card: LV4_BLACK_BLOCKER, as: "lv4" },
            { card: LV3_BLACK_BLOCKER, as: "lv3" },
          ],
          deck: DECK,
          security: [FILLER],
        },
        1: { deck: DECK, security: [FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("craniamon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => s.state.pendingDecision === undefined);

    // Printed 12 reduced by 5 = 7, paid from 8.
    expect(s.state.memory).toBe(1);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    // `Permanent.stack` is bottom-most first, so the leftmost printed slot (Lv.5) sits closest to
    // the top card (§7-3-2-6).
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("lv3").instanceId,
      s.inst("lv4").instanceId,
      s.inst("lv5").instanceId,
    ]);
    expect(played.currentDP).toBe(12_000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses Assembly declarations failing either printed predicate, the level order, the count or the zone", async () => {
    const cases: { label: string; trash: string[] }[] = [
      // Right colour and level, but the Lv.4 slot's card prints no ＜Blocker＞.
      { label: "Lv.4 without ＜Blocker＞", trash: [LV5_BLACK_BLOCKER, LV4_BLACK_NO_BLOCKER, LV3_BLACK_BLOCKER] },
      // Right level and keyword, but the Lv.4 slot's card is GREEN, not Black.
      { label: "green Lv.4 with ＜Blocker＞", trash: [LV5_BLACK_BLOCKER, LV4_GREEN_BLOCKER, LV3_BLACK_BLOCKER] },
      // Three qualifying cards, but two share a level: the Lv.4 slot goes unfilled.
      { label: "duplicate level", trash: [LV5_BLACK_BLOCKER, LV3_BLACK_BLOCKER, LV3_BLACK_BLOCKER] },
      // §7-3-2-4: the exact total count must be placed.
      { label: "partial count", trash: [LV5_BLACK_BLOCKER, LV4_BLACK_BLOCKER] },
    ];
    for (const { label, trash } of cases) {
      const s = setupEngine({
        0: {
          hand: [{ card: CARD_ID, as: "craniamon" }],
          trash: trash.map((card, index) => ({ card, as: `m${index}` })),
          deck: DECK,
        },
      });
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("craniamon").instanceId,
          assembly: { materialInstanceIds: trash.map((_card, index) => s.inst(`m${index}`).instanceId) },
        } as never),
        `${label}`,
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.memory, `${label}`).toBe(10);
      expect(s.state.players[0]!.trash, `${label}`).toHaveLength(trash.length);
      expect(s.state.players[0]!.battleArea, `${label}`).toHaveLength(0);
    }

    // §7-3-1: materials come from the TRASH only, never the hand.
    const fromHand = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "craniamon" },
          { card: LV5_BLACK_BLOCKER, as: "lv5" },
          { card: LV4_BLACK_BLOCKER, as: "lv4" },
          { card: LV3_BLACK_BLOCKER, as: "lv3" },
        ],
        deck: DECK,
      },
    });
    fromHand.state.memory = 10;
    await fromHand.ready();
    expect(
      fromHand.engine.applyIntent(0, {
        type: "playCard",
        instanceId: fromHand.inst("craniamon").instanceId,
        assembly: {
          materialInstanceIds: [
            fromHand.inst("lv5").instanceId,
            fromHand.inst("lv4").instanceId,
            fromHand.inst("lv3").instanceId,
          ],
        },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(fromHand.state.players[0]!.hand).toHaveLength(4);
    expect(fromHand.state.memory).toBe(10);
  });

  // ---------------------------------------------------------------------------
  // Printed EvoCost: Black Lv.5 for 3
  // ---------------------------------------------------------------------------

  it("digivolves from a black Lv.5 for 3, keeping source identity and drawing the bonus card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "base" }],
          hand: [
            { card: CARD_ID, as: "craniamon" },
            { card: FILLER, as: "spare" },
          ],
          deck: DECK,
          security: [FILLER],
        },
        1: { deck: DECK, security: [FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("craniamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("craniamon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    // Source identity survives: the Lv.5 is the single digivolution card under the new top.
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(12_000);
    // One card left the hand, one digivolution bonus draw arrived.
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("craniamon").instanceId);
  });

  it("refuses illegal digivolution sources: a red Lv.5 and a black Lv.4, on either cost preference", async () => {
    for (const base of [RED_LV5, LV4_BLACK_NO_BLOCKER] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: CARD_ID, as: "craniamon" }],
            deck: DECK,
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 10;
      await s.ready();

      for (const useAlternateCost of [false, true]) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("craniamon").instanceId,
            ...(useAlternateCost ? { useAlternateCost: true } : {}),
          }).ok,
          `${base} alt=${useAlternateCost}`,
        ).toBe(false);
      }
      // No alternate route exists on this card, so memory is untouched on both preferences.
      expect(s.state.memory, `${base}`).toBe(10);
      expect(s.perm("base").topCard.cardId, `${base}`).toBe(base);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("craniamon").instanceId]);
    }
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] Your opponent's effects don't affect this Digimon
  // ---------------------------------------------------------------------------

  it("is untouchable by any opponent effect after [On Play], while an un-triggered copy is deleted", async () => {
    const board = () =>
      setupEngine(
        {
          0: {
            hand: [
              { card: CARD_ID, as: "craniamon" },
              { card: FILLER, as: "spare" },
            ],
            trash: [
              { card: LV5_BLACK_BLOCKER, as: "lv5" },
              { card: LV4_BLACK_BLOCKER, as: "lv4" },
              { card: LV3_BLACK_BLOCKER, as: "lv3" },
            ],
            deck: DECK,
            security: [FILLER],
          },
          1: { deck: DECK, security: [FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    // NEGATIVE CONTROL: a copy seeded straight into the battle area never fired a window, so the
    // opponent's deletion lands.
    const idle = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "craniamon" }], deck: DECK }, 1: { deck: DECK } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await idle.ready();
    advance(idle.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(idle.engine).verb.deletePermanent([idle.perm("craniamon").permanentId], "byEffect")).toBe(1);
    advance(idle.engine).verb.leaveEffectResolution();
    expect(idle.state.players[0]!.battleArea).toHaveLength(0);

    // The same call against a copy played through Assembly (which fires [On Play]) is refused.
    const s = board();
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("craniamon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => s.state.pendingDecision === undefined);
    const craniamonId = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!.permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([craniamonId]);

    // "Your opponent's effects" is printed with no card-kind narrowing, so an OPTION-sourced
    // opponent effect is refused exactly like the Digimon-sourced one above. A Digimon-only
    // immunity (EX13-061's `fromSourceKind: ["Digimon"]` shape) would let this one through.
    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    advance(s.engine).verb.enterEffectResolution(1, ["Tamer"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();

    // The grant is the blanket `beAffected` immunity, not a delete-only shield. (The harness's
    // bare `verb.suspend` primitive bypasses target resolution entirely, so it is not a valid
    // probe for this restriction; the ledger entry and the controller-scoped negative below are.)
    expect(observe(s.engine).isRestricted(craniamonId, "beAffected")).toBe(true);

    // "YOUR OPPONENT's effects": the controller's own effect still affects it.
    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("reaches the same immunity on [When Digivolving], and it lapses once the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV5, as: "base" }],
          hand: [
            { card: CARD_ID, as: "craniamon" },
            { card: FILLER, as: "spare" },
          ],
          deck: DECK,
          security: [FILLER, FILLER],
        },
        1: { deck: DECK, security: [FILLER, FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const craniamonId = s.perm("base").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: craniamonId,
        instanceId: s.inst("craniamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("craniamon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([craniamonId]);

    // Still immune all through the opponent's turn ("until THEIR turn ends").
    await openOpponentMain(s);
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();

    // That turn ends: the immunity has expired by the controller's next main phase.
    await openOwnMain(s);
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([craniamonId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] When this Digimon suspends, you may delete all of your
  // opponent's Digimon with the lowest play cost.
  // ---------------------------------------------------------------------------

  it("deletes every tied lowest-play-cost opponent on an attack suspension, sparing dearer ones and breeding", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "craniamon" }], deck: DECK, security: [FILLER] },
        1: {
          battleArea: [
            { card: COST2, as: "low1" },
            { card: COST2, as: "low2" },
            { card: COST3, as: "mid" },
            { card: COST4, as: "high" },
          ],
          // Play cost 2 as well: if the sweep leaked into the raising area this card would be
          // deleted too (the filter must stay battle-area only).
          breeding: { card: COST2, as: "breeder" },
          deck: DECK,
          security: [FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const low1 = s.perm("low1").permanentId;
    const low2 = s.perm("low2").permanentId;
    const midId = s.perm("mid").permanentId;
    const highId = s.perm("high").permanentId;
    const breederId = s.perm("breeder").permanentId;
    const breederInstanceId = s.inst("breeder").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();

    expect(s.perm("craniamon").isSuspended).toBe(true);
    const remaining = s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);
    expect(remaining).not.toContain(low1);
    expect(remaining).not.toContain(low2);
    expect(remaining).toEqual(expect.arrayContaining([midId, highId]));
    expect(remaining).toHaveLength(2);
    expect(s.state.players[1]!.breeding?.permanentId).toBe(breederId);
    const trashedIds = s.state.players[1]!.trash.map(({ instanceId }) => instanceId);
    expect(trashedIds).toContain(s.inst("low1").instanceId);
    expect(trashedIds).toContain(s.inst("low2").instanceId);
    expect(trashedIds).not.toContain(breederInstanceId);
    // Two deletions plus the one checked security card.
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may decline the sweep, leaving every opposing Digimon alive", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "craniamon" }], deck: DECK, security: [FILLER] },
        1: {
          battleArea: [
            { card: COST2, as: "low" },
            { card: COST3, as: "mid" },
          ],
          deck: DECK,
          security: [FILLER, FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const midId = s.perm("mid").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();

    expect(s.perm("craniamon").isSuspended).toBe(true);
    // "You may": declining the printed option leaves the cheapest Digimon standing.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lowId, midId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual([FILLER]);
  });

  it("sweeps once per turn and re-arms on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "craniamon" }],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: DECK,
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: COST2, as: "first" },
            { card: COST3, as: "second" },
            { card: COST4, as: "survivor" },
          ],
          hand: [{ card: FILLER, as: "spare1" }],
          deck: DECK,
          security: [FILLER, FILLER, FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const secondId = s.perm("second").permanentId;
    const survivorId = s.perm("survivor").permanentId;

    expect(attackPlayer()).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([secondId, survivorId]);

    // A SECOND suspension in the same turn must not sweep again: the cost-3 body survives.
    await advance(s.engine).verb.unsuspend([s.perm("craniamon").permanentId]);
    expect(s.perm("craniamon").isSuspended).toBe(false);
    expect(attackPlayer()).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();
    expect(s.perm("craniamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([secondId, survivorId]);

    // A real opponent turn passes; the budget resets on the controller's own next turn.
    await openOpponentMain(s);
    await openOwnMain(s);
    expect(s.perm("craniamon").isSuspended).toBe(false);
    expect(attackPlayer()).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Blocker＞ intercepts an attack, and that block suspension is itself a sweep trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "craniamon" }],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: DECK,
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: COST2, as: "cheap" },
            { card: COST3, as: "mid" },
            { card: COST4, as: "attacker" },
          ],
          hand: [{ card: FILLER, as: "spare1" }],
          deck: DECK,
          security: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const securityBefore = s.state.players[0]!.security.length;
    const cheapId = s.perm("cheap").permanentId;
    const midId = s.perm("mid").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    await openOpponentMain(s);

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("craniamon").permanentId],
    });
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("craniamon").permanentId }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();

    // The block replaced the security check, and 12000 DP beat the 6000 DP attacker.
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([CARD_ID]);
    expect(s.perm("craniamon").isSuspended).toBe(true);
    // Blocking suspended it, so the sweep removed the cost-2 body and spared the cost-3 one; the
    // cost-4 attacker died to the battle, not to the sweep.
    const remaining = s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId);
    expect(remaining).toEqual([midId]);
    expect(remaining).not.toContain(cheapId);
    expect(remaining).not.toContain(attackerId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [All Turns] When this Digimon unsuspends, it gets +3000 DP until your turn ends.
  // ---------------------------------------------------------------------------

  it("gains +3000 DP on the ＜Reboot＞ unsuspension, keeps it through its own turn and loses it at that turn's end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "craniamon" }],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: DECK,
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [{ card: COST4, as: "bystander" }],
          hand: [{ card: FILLER, as: "spare1" }],
          deck: DECK,
          security: [FILLER, FILLER, FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("craniamon").currentDP).toBe(12_000);

    // Attacking is the public way to suspend on the own turn; the own unsuspend phase has already
    // run, so the next unsuspension can only come from ＜Reboot＞ on the opponent's turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();
    expect(s.perm("craniamon").isSuspended).toBe(true);
    expect(s.perm("craniamon").currentDP).toBe(12_000);

    // ＜Reboot＞ unsuspends it during the opponent's unsuspend phase, which fires the boost.
    await openOpponentMain(s);
    expect(s.perm("craniamon").isSuspended).toBe(false);
    expect(s.perm("craniamon").currentDP).toBe(15_000);

    // "until YOUR turn ends": the boost survives the opponent's turn end and the controller's own
    // unsuspend phase (already unsuspended, so no second trigger).
    await openOwnMain(s);
    expect(s.perm("craniamon").currentDP).toBe(15_000);

    // The controller's turn ends: the boost expires.
    await openOpponentMain(s);
    expect(s.perm("craniamon").currentDP).toBe(12_000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("has no once-per-turn cap on the unsuspend boost: two unsuspensions in one turn stack to +6000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "craniamon", suspended: true }], deck: DECK, security: [FILLER] },
        // No opposing Digimon, so the suspend sweep cannot interfere with the DP assertions.
        1: { deck: DECK, security: [FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const craniamonId = s.perm("craniamon").permanentId;

    await advance(s.engine).verb.unsuspend([craniamonId]);
    await settle(() => s.perm("craniamon").currentDP === 15_000);
    expect(s.perm("craniamon").currentDP).toBe(15_000);

    await advance(s.engine).verb.suspend([craniamonId]);
    await settle();
    expect(s.perm("craniamon").isSuspended).toBe(true);
    expect(s.perm("craniamon").currentDP).toBe(15_000);

    await advance(s.engine).verb.unsuspend([craniamonId]);
    await settle(() => s.perm("craniamon").currentDP === 18_000);
    // Two separate +3000 grants, both running until the controller's turn ends.
    expect(s.perm("craniamon").currentDP).toBe(18_000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
