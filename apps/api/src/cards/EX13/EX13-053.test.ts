import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT13/BT13-074.js";
import { compiled } from "./EX13-053.js";

const cardId = "EX13-053";

const MAMEMON_NAME = "BT6-064";
const MAMEMON_TEXT_ONLY = "EX13-046";
const METAL_MAMEMON = "BT3-071";
const MAMEMON_TEXT_OPTION = "BT8-106";
const MUTANT_NO_MAMEMON = "BT12-058";

const PC3 = "BT1-012";
const PC4 = "BT7-020";
const PC5 = "BT1-038";
const PC6 = "BT1-037";
const PC7 = "BT1-024";

const BLACK_LV3 = "BT3-060";
const YELLOW_LV3 = "BT3-032";
const RED_LV3 = "BT1-009";
const BLACK_LV4 = "BT10-062";
const BLACK_LV5_VANILLA = "BT10-022";

const SENTINEL = "BT1-009";
const SPARE = "BT1-014";
const PRINCE_MAMEMON = "BT13-074";

const DECK = [SENTINEL, SENTINEL, SENTINEL];

describe("EX13-053 Thundermon", () => {
  it("matches the catalog printing and the complete IR contract", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "EX13",
      nameEn: "Thundermon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mutant"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 2 },
        { color: "Yellow", level: 3, memoryCost: 2 },
      ],
      effectText:
        "[On Play] [On Deletion] You may return up to 3 Digimon cards with [Mamemon] in their texts from your trash to the top of the deck. Then, delete 1 of your opponent's Digimon with a play cost of 3 or less. For each one this effect returned, add 1 to this effect's play cost maximum.\n[Rule] Name: Treated as including [Mamemon].",
      inheritedEffectText: "[On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. ",
    });

    const body = [
      {
        kind: "Return",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
          },
          count: 3,
          upTo: true,
        },
        from: ["trash"],
        to: "deckTop",
        optional: true,
        trackCount: "mamemonTextCardsReturned",
      },
      {
        kind: "Delete",
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            playCostLte: 3,
            playCostLteScaling: { per: 1, unit: "namedCount", countSource: "mamemonTextCardsReturned" },
          },
          count: 1,
        },
      },
    ];

    expect(compiled.effects[0]).toEqual({ trigger: "OnPlay", actions: body });
    expect(compiled.effects[1]).toEqual({ trigger: "OnDeletion", actions: body });
    expect(compiled.effects[2]).toEqual({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Mamemon"],
        },
      ],
    });
    expect(compiled.effects[3]).toEqual({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("deletes at the printed maximum of 3 and spares play cost 4 when nothing is returned", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_TEXT_OPTION, as: "optionText" },
            { card: MUTANT_NO_MAMEMON, as: "noMamemon" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC3, as: "victim" },
            { card: PC4, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([PC4]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("optionText").instanceId,
      s.inst("noMamemon").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(DECK.length);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("leaves play cost 4 alive when the only opponent Digimon is over the unraised maximum", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC4, as: "survivor" }],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q7375: returns name and effect-text [Mamemon] Digimon and deletes at the raised maximum", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_NAME, as: "mamemon" },
            { card: MAMEMON_TEXT_ONLY, as: "textOnly" },
            { card: METAL_MAMEMON, as: "metalMamemon" },
            { card: MAMEMON_TEXT_OPTION, as: "optionText" },
            { card: MUTANT_NO_MAMEMON, as: "noMamemon" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC6, as: "victim" },
            { card: PC7, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(
      s.state.players[0]!.deck.slice(0, 3)
        .map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([s.inst("mamemon").instanceId, s.inst("textOnly").instanceId, s.inst("metalMamemon").instanceId].sort());
    expect(s.state.players[0]!.deck[3]!.instanceId).toBe(s.inst("deckFloor").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("optionText").instanceId,
      s.inst("noMamemon").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("raises the maximum by exactly the number returned when only 1 card is chosen", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_NAME, as: "returned" },
            { card: METAL_MAMEMON, as: "leftBehind" },
            { card: MAMEMON_TEXT_ONLY, as: "alsoLeftBehind" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC4, as: "victim" },
            { card: PC5, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("returned").instanceId, s.inst("leftBehind").instanceId, s.inst("alsoLeftBehind").instanceId].sort(),
    );
    expect(payload.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("returned").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("returned").instanceId,
      s.inst("deckFloor").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("leftBehind").instanceId,
      s.inst("alsoLeftBehind").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("still deletes at the printed maximum when the printed 'You may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_NAME, as: "kept" },
            { card: METAL_MAMEMON, as: "alsoKept" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC3, as: "victim" },
            { card: PC4, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("kept").instanceId,
      s.inst("alsoKept").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckFloor").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("never reaches the opponent's trash: only the controller's own trash feeds the return", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC3, as: "victim" }],
          trash: [
            { card: MAMEMON_NAME, as: "theirMamemon" },
            { card: METAL_MAMEMON, as: "theirMetalMamemon" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("theirMamemon").instanceId,
      s.inst("theirMetalMamemon").instanceId,
      s.inst("victim").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckFloor").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q7376: returns itself from trash and still finishes the remaining deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "thunder" }],
          trash: [
            { card: MAMEMON_NAME, as: "mamemon" },
            { card: MAMEMON_TEXT_ONLY, as: "textOnly" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC6, as: "victim" },
            { card: PC7, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("thunder").permanentId], "byEffect");
    expect(await deletion).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(
      s.state.players[0]!.deck.map(({ instanceId }) => instanceId)
        .slice(0, 3)
        .sort(),
    ).toEqual([s.inst("mamemon").instanceId, s.inst("textOnly").instanceId, s.inst("thunder").instanceId].sort());
    expect(s.state.players[0]!.deck[3]!.instanceId).toBe(s.inst("deckFloor").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("de-digivolves 1 opponent Digimon from under a host, without running its own main body", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: BLACK_LV5_VANILLA,
              as: "host",
              under: [
                { card: BLACK_LV3, as: "base" },
                { card: cardId, as: "thunder" },
              ],
            },
          ],
          trash: [{ card: METAL_MAMEMON, as: "untouched" }],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC4, as: "subject", under: [{ card: PC3, as: "promoted" }] }],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("base").instanceId,
      s.inst("thunder").instanceId,
    ]);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(await deletion).toBe(1);
    await settle(() => s.perm("subject").topCard.cardId === PC3);
    await settle();
    advance(s.engine).verb.leaveEffectResolution();

    expect(s.perm("subject").topCard.instanceId).toBe(s.inst("promoted").instanceId);
    expect(s.perm("subject").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("subject").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [
        s.inst("untouched").instanceId,
        s.inst("host").instanceId,
        s.inst("base").instanceId,
        s.inst("thunder").instanceId,
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckFloor").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("is treated as including [Mamemon], so another card's [Mamemon]-name aura reaches it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: PRINCE_MAMEMON, as: "prince" },
          { card: cardId, as: "thunder" },
          { card: MUTANT_NO_MAMEMON, as: "zenimon" },
        ],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { deck: DECK, security: [SENTINEL] },
    });
    await s.ready();

    expect(observe(s.engine).grantedNames(s.perm("thunder"))).toContain("mamemon");
    expect(observe(s.engine).effectiveNames(s.perm("thunder"))).toEqual(["thundermon"]);
    expect(observe(s.engine).hasKeyword(s.perm("thunder"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("thunder"), "Reboot")).toBe(true);
    expect(observe(s.engine).grantedNames(s.perm("zenimon"))).not.toContain("mamemon");
    expect(observe(s.engine).hasKeyword(s.perm("zenimon"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("zenimon"), "Reboot")).toBe(false);
  });

  it("Q7377: includes [Mamemon] in its name without being exactly named Mamemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "thunder" }], deck: DECK, security: [SENTINEL] },
      1: { deck: DECK, security: [SENTINEL] },
    });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("thunder"))).toContain("thundermon");
    expect(observe(s.engine).effectiveNames(s.perm("thunder"))).not.toContain("mamemon");
  });

  it("digivolves from a Black Lv.3 for 2 on the first printed route, without firing [On Play]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV3, as: "base" }],
          hand: [
            { card: cardId, as: "thunder" },
            { card: SPARE, as: "spareHand" },
          ],
          trash: [{ card: MAMEMON_NAME, as: "untouched" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC3, as: "untouchedVictim" }],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thunder").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("bonusDraw").instanceId, s.inst("spareHand").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("untouchedVictim").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("digivolves from a Yellow Lv.3 for 2 on the second printed route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV3, as: "base" }],
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thunder").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a Lv.3 of the wrong colour and a Lv.4 of the right colour", async () => {
    for (const source of [RED_LV3, BLACK_LV4]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "base" }],
          hand: [{ card: cardId, as: "thunder" }],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      });
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("thunder").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(source);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("thunder").instanceId]);
      expect(s.state.memory).toBe(10);
    }
  });
});
