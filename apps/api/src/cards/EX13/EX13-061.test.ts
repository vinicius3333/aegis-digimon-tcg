import {
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
  Phase,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-061.js";

const CARD_ID = "EX13-061";
const TOKEN_ID = "TOKEN-Hinukamuy-Token";

// Catalog fixtures, all verified against `packages/shared/src/cards/data/cards.json`:
//   BT10-064 Gogmamon           black Lv.5, 8000 DP, NO printed text at all and no [Huckmon]
//                               token — the printed-EvoCost base (Black Lv.5 for 5).
//   ST12-08  SaviorHuckmon      red Lv.5 printing [Huckmon] — the alternate-route base: it fails
//                               the printed black EvoCost outright, so the 4 it charges can only
//                               come from the [Digivolve] header.
//   BT1-020  Groundramon        red Lv.5, no [Huckmon] anywhere — legal on NEITHER route.
//   BT20-013 BaoHuckmon         Lv.4 printing [Huckmon] — right token, wrong level.
//   ST12-06 / ST12-04           BaoHuckmon / Huckmon, Assembly materials with distinct names.
//   BT23-076 Sistermon Blanc    white Lv.3 whose NAME lacks [Huckmon]; only its text carries it.
//   BT7-082  Sistermon Blanc (Awakened)  a third differently-named Lv.3 [Huckmon]-text card.
//   BT6-093  Judgement of the Blade     red Option, use cost 1, [Huckmon] in its text.
//   ST12-16  Quake! Blast! Fire! Father! black Option printing [Huckmon] at use cost 7 (over cap).
//   BT1-091  Scrap Claw         red Option, cost 3, no [Huckmon] anywhere.
const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

/** Fire a printed window on a permanent without running a whole combat or play. */
async function fireOnPlay(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm(alias));
}

describe("EX13-061 Gankoomon", () => {
  it("matches the catalog identity and every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Gankoomon",
      colors: ["Black", "White"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
    });
    const text = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(text).toContain("[Digivolve] Lv.5 w/[Huckmon] in text: Cost 4");
    expect(text).toContain("[Assembly -5] 3 [Huckmon] text Digimon cards w/different names");
    expect(text).toContain("＜Reboot＞");
    expect(text).toContain("＜Blocker＞");
    expect(text).toContain(
      "[On Play] [When Digivolving] You may play 1 [Hinukamuy] Token. (Digimon/White/6000 DP/＜Alliance＞ ＜Reboot＞ ＜Blocker＞) Then, until your opponent's turn ends, their Digimon effects don't affect 1 of your white Digimon.",
    );
    expect(text).toContain(
      "[All Turns] [Once Per Turn] When any of your white Digimon suspend, you may use 1 use cost 5 or lower Option card with [Huckmon] in its text from your hand or this Digimon's digivolution cards without paying the cost.",
    );
    // No printed inherited or security text, so the module declares neither.
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("");
    expect((getCardDefinition(CARD_ID)?.securityEffectText ?? "").trim()).toBe("");
    expect(compiled.effects.every((effect) => effect.isInherited !== true)).toBe(true);
    expect(compiled.effects.every((effect) => effect.isSecurity !== true)).toBe(true);
  });

  it("compiles the keyword grants, both token windows, the suspend watcher and both play headers", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }],
    });

    const tokenBody = [
      // The printed parenthetical stat line lives in the shared token registry, so the action names
      // the registry entry instead of minting a divergent inline TokenSpec. No "if you don't have"
      // gate is printed, so the action carries no `condition` (contrast EX13-014).
      { kind: "PlayToken", tokens: ["Hinukamuy Token"], count: 1, payCost: false, optional: true },
      {
        kind: "Restrict",
        restriction: "beAffected",
        // "their DIGIMON effects" — narrower than GrantImmunity's blanket opponentEffects.
        fromSourceKind: ["Digimon"],
        byOpponentEffectsOnly: true,
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], colors: ["White"] } },
      },
    ];
    // One printed line, two printed timings, no printed [Once Per Turn]: two independent windows
    // with neither a frequency nor a shared use key.
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay", actions: tokenBody });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenDigivolving", actions: tokenBody });
    expect(compiled.effects[1]).not.toHaveProperty("frequency");
    expect(compiled.effects[2]).not.toHaveProperty("frequency");
    expect(compiled.effects[1]).not.toHaveProperty("sharedUseKey");
    expect(compiled.effects[2]).not.toHaveProperty("sharedUseKey");
    // The PlayToken action carries no condition at all.
    expect(compiled.effects[1]?.actions[0]).not.toHaveProperty("condition");

    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          // Deliberately no isSelfRef: "any of your white Digimon" is board-wide, and a self-ref
          // whenSuspended gate would silently drop the `colors` narrowing.
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["White"] },
          actions: [
            {
              kind: "UseOptionWithoutCost",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              filter: {
                controller: "mine",
                kind: ["Option"],
                playCostLte: 5,
                nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
              },
              target: { count: 1, source: "thisDigimon" },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[3]?.actions[0]).not.toHaveProperty("sourceFilter.isSelfRef");
    expect(compiled.effects[3]).not.toHaveProperty("sharedUseKey");

    // The alternate header is cheaper than the catalog EvoCost (4 vs 5) AND wider (no colour), so
    // the two routes are separable behaviourally on this card.
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, texts: ["Huckmon"], cost: 4, isAlternate: true }]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(
      expect.arrayContaining([{ level: 5, texts: ["Huckmon"], cost: 4, isAlternate: true }]),
    );
    // ONE slot of three cards with distinct names, not three per-level slots: the printed header
    // names no level (contrast EX13-014's "Lv.5 × Lv.4 × Lv.3").
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      {
        materials: [
          {
            count: 3,
            kinds: ["Digimon"],
            nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
            differentNames: true,
          },
        ],
        reduceCost: 5,
      },
    ]);
    // The engine-canonical token identity the PlayToken action names.
    expect(getCardDefinition(TOKEN_ID)).toMatchObject({
      cardId: TOKEN_ID,
      nameEn: "Hinukamuy Token",
      kinds: ["Digimon"],
      colors: ["White"],
      dp: 6000,
      isToken: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Evolution routes
  // ---------------------------------------------------------------------------

  it("digivolves from a black Lv.5 on the printed EvoCost for 5, keeping source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gankoomon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(12000);
    // The card left the hand; the one card there is the digivolution bonus draw.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("gankoomon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a red Lv.5 [Huckmon]-text base on the alternate header for 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-08", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gankoomon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    // 4, not 5: the base is RED, so the printed Black Lv.5 EvoCost cannot have been the route used.
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").currentDP).toBe(12000);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("falls back to the printed EvoCost when the alternate header does not match", async () => {
    // `useAlternateCost` is a preference, not a gate: with no matching alternate the engine still
    // takes the printed route and still returns ok. The proof is the MEMORY charged, not `ok`.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gankoomon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["BT20-013", "right [Huckmon] token, wrong level (Lv.4)"],
    ["BT1-020", "right level, wrong colour and no [Huckmon] token"],
  ])("refuses %s as a source on both routes (%s)", async (base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gankoomon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }).ok,
        `${base} alt=${useAlternateCost}`,
      ).toBe(false);
    }
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard.cardId).toBe(base);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gankoomon").instanceId]);
  });

  // ---------------------------------------------------------------------------
  // [Assembly -5] 3 [Huckmon] text Digimon cards w/different names
  // ---------------------------------------------------------------------------

  it("plays through Assembly for 5 less, stacking all three trash materials", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          trash: [
            { card: "ST12-08", as: "first" },
            { card: "ST12-06", as: "second" },
            { card: "ST12-04", as: "third" },
          ],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gankoomon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID);
      return permanent?.stack.length === 3;
    });
    await settle(() => s.state.pendingDecision === undefined);

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    // Printed play cost 12 reduced by 5 = 7: the whole gauge is spent.
    expect(s.state.memory).toBe(0);
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["ST12-08", "ST12-06", "ST12-04"]));
    expect(played.stack).toHaveLength(3);
    // Comprehensive §7-3: the materials come OUT of the trash.
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("accepts three SAME-level materials: the printed header fixes no level per slot", async () => {
    // ST12-04 Huckmon, BT23-076 Sistermon Blanc and BT7-082 Sistermon Blanc (Awakened) are all
    // Lv.3, all print [Huckmon] and all carry distinct names. EX13-014's "Lv.5 × Lv.4 × Lv.3"
    // sibling would refuse exactly this set; this card's single unlevelled slot must take it.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          trash: [
            { card: "ST12-04", as: "first" },
            { card: "BT23-076", as: "second" },
            { card: "BT7-082", as: "third" },
          ],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    for (const id of ["ST12-04", "BT23-076", "BT7-082"]) {
      expect(getCardDefinition(id)?.level).toBe(3);
    }
    // BT23-076's NAME has no [Huckmon]; only its printed text does — the "in text" union at work.
    expect((getCardDefinition("BT23-076")?.nameEn ?? "").includes("Huckmon")).toBe(false);
    expect((getCardDefinition("BT23-076")?.effectText ?? "").includes("[Huckmon]")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gankoomon").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID);
      return permanent?.stack.length === 3;
    });

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["ST12-04", "BT23-076", "BT7-082"]),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it.each([
    // Two BaoHuckmon cards: both print [Huckmon], both are Digimon, but they share a NAME.
    ["duplicate names", ["ST12-06", "BT20-013", "ST12-04"]],
    // BT1-009 Monodramon prints no [Huckmon] token anywhere.
    ["a material without the [Huckmon] token", ["ST12-08", "ST12-06", "BT1-009"]],
    // BT6-093 prints [Huckmon] but is an Option, not one of the printed "Digimon cards".
    ["an Option in place of a Digimon card", ["ST12-08", "ST12-06", "BT6-093"]],
  ])("rejects Assembly with %s", (_why, materials) => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "gankoomon" }],
        trash: materials.map((card, index) => ({ card, as: `material${index}` })),
        deck: DECK,
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gankoomon").instanceId,
        assembly: {
          materialInstanceIds: materials.map((_card, index) => s.inst(`material${index}`).instanceId),
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // ＜Reboot＞ and ＜Blocker＞
  // ---------------------------------------------------------------------------

  it("grants both printed keywords through the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "gankoomon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("gankoomon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("gankoomon"), "Blocker")).toBe(true);
  });

  it("unsuspends during the opponent's unsuspend phase with ＜Reboot＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "gankoomon", suspended: true }], deck: DECK },
      1: { deck: DECK },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Still suspended going into its own turn's main phase is irrelevant; what Reboot changes is
    // the OPPONENT's unsuspend phase.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("gankoomon").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("opens a real block window and intercepts an attack with ＜Blocker＞", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: DECK },
        1: { battleArea: [{ card: CARD_ID, as: "gankoomon" }], security: ["BT1-011"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("gankoomon").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("gankoomon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    // 2000 DP attacker against 12000 DP, and the security stack is never checked.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] the token + the white-Digimon immunity
  // ---------------------------------------------------------------------------

  it("plays the Hinukamuy Token with its printed stat line and keywords on [On Play]", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "gankoomon" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN_ID));
    await settle(() => s.state.pendingDecision === undefined);
    expect(preferred).toEqual([]);

    const token = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === TOKEN_ID)!;
    expect(token.currentDP).toBe(6000);
    expect(token.stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(token, "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    // Gankoomon plus the token: nothing else entered, and the token costs nothing.
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a SECOND token while one is already out: no printed 'if you don't have' gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: TOKEN_ID, as: "existing" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const existingId = s.perm("existing").permanentId;

    await fireOnPlay(s, "gankoomon");
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === TOKEN_ID).length === 2,
    );
    await settle(() => s.state.pendingDecision === undefined);

    const tokenIds = s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === TOKEN_ID).map(
      ({ permanentId }) => permanentId,
    );
    expect(tokenIds).toHaveLength(2);
    expect(tokenIds).toContain(existingId);
  });

  it("makes a chosen white Digimon immune to the opponent's DIGIMON effects only", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "gankoomon", dp: 12000 }], deck: DECK },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // The token half is declined; the mandatory "Then" clause still resolves.
    await fireOnPlay(s, "gankoomon");
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN_ID)).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon")).toBe(true);
    // "their DIGIMON effects" — an opponent Option or Tamer effect is untouched by this clause.
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Option")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Tamer")).toBe(false);

    const permanentId = s.perm("gankoomon").permanentId;

    // The controller's OWN Digimon effect still lands: the clause is opponent-only.
    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(permanentId, 1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("gankoomon").currentDP).toBe(13000);

    // An OPPONENT Digimon effect does not.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("gankoomon").currentDP).toBe(13000);

    // An opponent OPTION effect does.
    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("gankoomon").currentDP).toBe(10000);
  });

  it("refuses a non-white Digimon as the immunity recipient", async () => {
    // The red ally is the PREFERRED selection; the white-colour filter must refuse it and fall
    // back to the only white Digimon on the board, the Black/White host itself.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("redAlly").topCard.instanceId);
    expect(getCardDefinition("BT1-013")?.colors).toEqual(["Red"]);

    await fireOnPlay(s, "gankoomon");
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon"));

    expect(observe(s.engine).isRestrictedByEffect(s.perm("redAlly"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("gankoomon"), "beAffected", "Digimon")).toBe(true);
  });

  it("reaches the same window on [When Digivolving] and lets the immunity lapse after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gankoomon" }],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN_ID));
    await settle(() => s.state.pendingDecision === undefined);

    const immune = s.state.players[0]!.battleArea.filter((permanent) =>
      observe(s.engine).isRestrictedByEffect(permanent, "beAffected", "Digimon"),
    );
    // Exactly ONE white Digimon is immune even though two are on the board.
    expect(immune).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    const immuneId = immune[0]!.permanentId;

    // A real opponent turn ends; "until your opponent's turn ends" lapses with it.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    await settle();

    const stillImmune = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === immuneId);
    expect(stillImmune).toBeDefined();
    expect(observe(s.engine).isRestrictedByEffect(stillImmune!, "beAffected", "Digimon")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] white-Digimon suspend watcher
  //
  // Every positive fixture below seats BT1-013 Muchomon (mono-red, 5000 DP, no printed text)
  // alongside the host. That is not padding: the printed clause waives the Option's COST, not its
  // COLOUR REQUIREMENT, and `optionUseCandidates`
  // (`apps/api/src/engine/effects/interpreter/actions/borrowed.ts`) enforces that through
  // `optionColorRequirementMet` unless the action sets `waiveColorRequirement`. Gankoomon is
  // Black/White, so the red BT6-093 needs a red permanent in play — which the red ally supplies
  // while also serving as the non-white suspend control. A separate test below isolates the rule.
  // ---------------------------------------------------------------------------

  it("uses a cost-1 [Huckmon] Option from hand for free when an allied WHITE Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: TOKEN_ID, as: "whiteAlly" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("whiteAlly").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT6-093"));
    await settle(() => s.state.pendingDecision === undefined);

    // The Option is free: the gauge never moves.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    // Nothing else moved: the three permanents are still there and only the ally is suspended.
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires when the Black/White host itself suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT6-093"));
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("still enforces the Option's own colour requirement, which the clause never waives", async () => {
    // No red permanent anywhere, so the red [Huckmon] Option stays unusable even though the
    // watcher fired and its cost is waived.
    const red = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gankoomon" }],
          hand: [{ card: "BT6-093", as: "redOption" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await red.ready();
    expect(getCardDefinition("BT6-093")?.colors).toEqual(["Red"]);

    await advance(red.engine).verb.suspend([red.perm("gankoomon").permanentId]);
    await settle();

    expect(red.state.players[0]!.trash).toHaveLength(0);
    expect(red.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([red.inst("redOption").instanceId]);

    // BT23-099 is a WHITE use-cost-2 Option printing [Huckmon]; the Black/White host satisfies its
    // colour requirement on its own, so the very same window does use it. Its own [Main] effect
    // draws a card and then places the Option in the battle area rather than trashing it.
    const white = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gankoomon" }],
          hand: [{ card: "BT23-099", as: "whiteOption" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    white.state.memory = 3;
    await white.ready();
    expect(getCardDefinition("BT23-099")?.colors).toEqual(["White"]);
    expect(getCardDefinition("BT23-099")?.playCost).toBe(2);

    await advance(white.engine).verb.suspend([white.perm("gankoomon").permanentId]);
    await settle(
      () => !white.state.players[0]!.hand.some(({ instanceId }) => instanceId === white.inst("whiteOption").instanceId),
    );
    await settle();

    // Used for free: the gauge is untouched despite the printed use cost of 2.
    expect(white.state.memory).toBe(3);
    expect(white.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      white.inst("whiteOption").instanceId,
    );
  });

  it("does not fire for a NON-white ally, nor for the opponent's white Digimon", async () => {
    const nonWhite = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT6-093", as: "option" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await nonWhite.ready();
    expect(getCardDefinition("BT1-013")?.colors).toEqual(["Red"]);

    await advance(nonWhite.engine).verb.suspend([nonWhite.perm("redAlly").permanentId]);
    await settle();

    // "any of your WHITE Digimon" — a red ally is not this watcher's event. The red ally is also
    // exactly what makes the Option usable, so a wrong fire here WOULD have consumed it.
    expect(nonWhite.state.players[0]!.trash).toHaveLength(0);
    expect(nonWhite.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      nonWhite.inst("option").instanceId,
    ]);

    const opposing = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT6-093", as: "option" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: TOKEN_ID, as: "theirWhite" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await opposing.ready();

    await advance(opposing.engine).verb.suspend([opposing.perm("theirWhite").permanentId]);
    await settle();

    // "any of YOUR white Digimon" — `controller: "mine"` never sees the opponent's board.
    expect(opposing.state.players[0]!.trash).toHaveLength(0);
    expect(opposing.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      opposing.inst("option").instanceId,
    ]);
  });

  it("uses an Option out of its OWN digivolution cards, never a neighbour's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon", under: [{ card: "BT6-093", as: "stackOption" }] },
            { card: "BT10-064", as: "neighbour", under: [{ card: "BT6-093", as: "foreignOption" }] },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT6-093"));
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("gankoomon").stack).toHaveLength(0);
    expect(s.perm("neighbour").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("foreignOption").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("stackOption").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
  });

  it("never reaches a neighbour's digivolution cards when nothing else qualifies", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT10-064", as: "neighbour", under: [{ card: "BT6-093", as: "foreignOption" }] },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle();

    // `target.source: "thisDigimon"` scopes the hosted zone to the resolving host's OWN stack.
    expect(s.state.memory).toBe(3);
    expect(s.perm("neighbour").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("foreignOption").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("ignores a non-[Huckmon] Option and an over-cap [Huckmon] Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT1-091", as: "noToken" },
            { card: "ST12-16", as: "overCap" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();
    // Both colour requirements are satisfied here (red ally for BT1-091, the black host for
    // ST12-16), so colour cannot be the reason either is refused.
    expect(getCardDefinition("BT1-091")?.colors).toEqual(["Red"]);
    expect(getCardDefinition("ST12-16")?.colors).toEqual(["Black"]);
    expect(getCardDefinition("ST12-16")?.playCost).toBe(7);
    expect((getCardDefinition("ST12-16")?.effectText ?? "").includes("[Huckmon]")).toBe(true);
    expect((getCardDefinition("BT1-091")?.effectText ?? "").includes("Huckmon")).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle();

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("noToken").instanceId,
      s.inst("overCap").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("declines the window, leaving the Option in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "option" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("option").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("fires the watcher once per turn and reopens it on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gankoomon" },
            { card: "BT1-013", as: "redAlly" },
          ],
          hand: [
            { card: "BT6-093", as: "first" },
            { card: "BT6-093", as: "second" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
          security: ["BT1-011"],
        },
        1: { deck: DECK, security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(1);

    // Same turn, a second suspension: the printed [Once Per Turn] refuses it.
    await advance(s.engine).verb.unsuspend([s.perm("gankoomon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => false, 60);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    // A real opponent turn passes; the budget resets on the controller's next turn.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("gankoomon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("gankoomon").permanentId]);
    await settle(() => s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT6-093").length === 2);

    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "BT6-093")).toHaveLength(2);
  });
});
