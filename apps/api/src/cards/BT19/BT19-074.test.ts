import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT19-074.js";

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function tenTrash(prefix: string): { card: string; as: string }[] {
  return Array.from({ length: 10 }, (_, index) => ({
    card: index % 2 === 0 ? "BT1-009" : "BT1-013",
    as: `${prefix}${index}`,
  }));
}

describe("BT19-074 Beelzemon: Blast Mode", () => {
  it("matches the catalog print, including ACE Overflow ＜5＞", () => {
    expect(getCardDefinition("BT19-074")).toMatchObject({
      cardId: "BT19-074",
      nameEn: "Beelzemon: Blast Mode",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 8,
      dp: 15000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord"],
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 5 }],
      isAce: true,
      overflowMemory: 5,
    });
    const printed = getCardDefinition("BT19-074")!.effectText!;
    expect(printed).toContain("[Digivolve]Lv.6 w/[Beelzemon]\u00A0in name: Cost 4 \n");
    expect(printed).toContain("[Hand] [Counter] ＜Blast Digivolve＞ \n");
    expect(printed).toContain(
      "[On Play] [When Digivolving] Delete 1 of your opponent's level 6 or lower Digimon. If you have 10 or more cards in your trash, delete 1 of their Digimon instead.",
    );
    expect(printed).toContain(
      "[When Attacking] [Once Per Turn] By returning 10 non-Digi-Egg cards from your trash to the top of the deck, trash your opponent's top security card.",
    );
  });

  it("compiles the hand Counter keyword, the exclusive deletion branches and the ten-card security cost", () => {
    const compiled = runtimeCompiledCard("BT19-074");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, actions: [], keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "ConditionalBranch",
            condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 10 },
            ifTrue: [{ kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } }],
            ifFalse: [
              {
                kind: "Delete",
                target: {
                  count: 1,
                  filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
                },
              },
            ],
          },
        ],
      })),
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "trash",
            controller: "opponent",
            cost: {
              kind: "return",
              to: "deckTop",
              target: {
                count: 10,
                filter: { zone: "trash", controller: "mine", kind: ["Digimon", "Tamer", "Option"] },
              },
            },
            optional: true,
          },
        ],
      },
    ]);
    expect(compiled?.digivolutionRequirement).toEqual([{ level: 6, names: ["Beelzemon"], cost: 4, isAlternate: true }]);
  });

  it("[On Play] under 10 trash deletes exactly one level-6-or-lower Digimon and spares the level 7", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-074", as: "blast" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: ["BT1-009", "BT1-013", "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT3-089", as: "level6" },
            { card: "BT18-019", as: "level7" },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blast").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-074"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("level7").topCard!.instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("level6").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Play] under 10 trash deletes nothing when the opponent only has a level 7", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-074", as: "blast" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT18-019", as: "level7" }], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    expect(s.state.players[0]!.trash).toHaveLength(9);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blast").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("level7").topCard!.instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Play] at 10 trash deletes one Digimon of ANY level INSTEAD, never both", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-074", as: "blast" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: tenTrash("t"),
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT3-089", as: "level6" },
            { card: "BT18-019", as: "level7" },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("level7").topCard!.instanceId, s.perm("level7").permanentId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blast").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("level6").topCard!.instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("level7").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Digivolve] Lv.6 w/[Beelzemon] in name costs 4 on a real stack and fires [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-111", as: "beelzemon", under: ["BT2-067", "BT2-075"] }],
          hand: [{ card: "BT19-074", as: "blast" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT3-089", as: "level6" }], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const baseId = s.inst("beelzemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("beelzemon").permanentId,
        instanceId: s.inst("blast").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.memory).toBe(6);
    expect(s.perm("beelzemon").topCard?.cardId).toBe("BT19-074");
    expect(s.perm("beelzemon").stack.map((card) => card.cardId)).toEqual(["BT2-067", "BT2-075", "BT2-111"]);
    expect(s.perm("beelzemon").stack.at(-1)!.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("level6").instanceId]);
  });

  it("falls back to the Purple Lv.6 EvoCost of 5 for a Lv.6 peer without [Beelzemon] in its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "boltmon" }],
          hand: [{ card: "BT19-074", as: "blast" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boltmon").permanentId,
        instanceId: s.inst("blast").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boltmon").topCard?.cardId === "BT19-074");
    await settle();

    expect(s.state.memory).toBe(5);
  });

  it("refuses an illegal source: a Purple Lv.3 matches neither the EvoCost nor the [Beelzemon] route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "demidevimon" }],
          hand: [{ card: "BT19-074", as: "blast" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("demidevimon").permanentId,
          instanceId: s.inst("blast").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }

    expect(s.perm("demidevimon").topCard?.cardId).toBe("BT2-067");
    expect(s.perm("demidevimon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("blast").instanceId]);
  });

  it("blast digivolves from hand in the opponent's counter window for no memory and still fires its clause", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-111", as: "beelzemon" }],
          hand: [{ card: "BT19-074", as: "blast" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "ownSec1" },
            { card: "BT1-013", as: "ownSec2" },
            { card: "BT1-009", as: "ownSec3" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "attacker" },
            { card: "BT3-089", as: "level6" },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("level6").topCard!.instanceId, s.perm("level6").permanentId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("blast").instanceId,
        effectKey: `blast-digivolve:${s.perm("beelzemon").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("beelzemon").topCard?.cardId === "BT19-074");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(6);
    expect(s.perm("beelzemon").stack.map((card) => card.instanceId)).toEqual([s.inst("beelzemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("attacker").topCard!.instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("level6").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("ownSec2").instanceId,
      s.inst("ownSec3").instanceId,
    ]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Attacking] returns exactly 10 non-Digi-Egg trash cards to the deck top and trashes the top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-074", as: "blast" }],
          hand: [{ card: "BT1-013", as: "spare" }],
          trash: [{ card: "BT1-001", as: "digiEgg" }, ...tenTrash("t")],
          deck: [{ card: "BT1-014", as: "deckTop" }, ...DECK],
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 1000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const costIds = Array.from({ length: 10 }, (_, index) => s.inst(`t${index}`).instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("digiEgg").instanceId]);
    expect(
      s.state.players[0]!.deck.slice(0, 10)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([...costIds].sort());
    expect(s.state.players[0]!.deck[10]!.instanceId).toBe(s.inst("deckTop").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sec1").instanceId, s.inst("wall").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-074"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Attacking] trashes no security when the trash holds only 9 non-Digi-Egg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-074", as: "blast" }],
          hand: [{ card: "BT1-013", as: "spare" }],
          trash: [{ card: "BT1-001", as: "digiEgg" }, ...tenTrash("t").slice(0, 9)],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 1000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec1").instanceId,
      s.inst("sec2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the 'by returning' condition leaves both the trash and the opponent's security alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-074", as: "blast" }],
          hand: [{ card: "BT1-013", as: "spare" }],
          trash: tenTrash("t"),
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 1000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toHaveLength(10);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec1").instanceId,
      s.inst("sec2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn] resets: the clause fires again on the next own turn through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-074", as: "blast" }],
          hand: [{ card: "BT1-013", as: "spare" }],
          trash: [...tenTrash("a"), ...tenTrash("b")],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall1", dp: 1000, suspended: true }],
          hand: ["BT1-013"],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
            { card: "BT1-013", as: "sec4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall1").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
      s.inst("sec4").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("blast").isSuspended).toBe(false);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec4").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("sec2").instanceId, s.inst("sec3").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays ACE Overflow ＜5＞ when it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-074", as: "blast" }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await drainMicrotasks(60);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-074"]);
    expect(s.state.memory).toBe(2);
  });
});
