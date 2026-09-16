import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-033.js";
import "../index.js";

const CARD_ID = "EX13-033";

// Fixtures.
//   BT18-036 Wizardmon — YELLOW Lv.4, printed TYPES ["Wizard","Witchelny"]: the alternate
//     header's source (cost 3 instead of the catalog EvoCost's 4) and the [Witchelny] text card
//     the placement clause takes from hand.
//   BT11-051 Ogremon — GREEN Lv.4, no printed text: the illegal source. Neither the Yellow/Red
//     Lv.4 EvoCosts nor the header's [Witchelny]-text predicate admits it.
//   BT19-029 Tapirmon — YELLOW Lv.3 whose "[On Play] By trashing your top security card, gain 1
//     memory" is the public route that removes the CONTROLLER'S OWN security stack on the
//     controller's own turn, which is what the [All Turns] watcher listens for.
//   BT1-037 Gorillamon — BLUE Lv.4, 6000 DP, no printed text: the opponent Digimon. Seeded at
//     9000 DP the -6000 leaves 3000 — above zero, so a removal is the printed DELETE rather than
//     the DP-reaching-zero rule; seeded at 20000 DP it survives at 14000, above the ceiling.
//   BT1-009..BT1-014 are the inert main-deck Digimon used as security and deck filler.
const WITCHELNY_LV4 = "BT18-036";
const ILLEGAL_SOURCE = "BT11-051";
const OWN_SECURITY_REMOVER = "BT19-029";
const OPPONENT = "BT1-037";
const INERT = "BT1-009";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const AUTOMATION = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("EX13-033 Mistymon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Mistymon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Magic Warrior", "Witchelny"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      effectText:
        "[Digivolve] Lv.4 w/[Witchelny] in text: Cost 3 \n\n＜Barrier＞ \n[On Play] [When Digivolving] You may place 1 [Witchelny] text card from your hand as the bottom security card. Then, by trashing your top security card, 1 of your Digimon may attack.\n[All Turns] [Once Per Turn] When your security stack is removed from, 1 of your opponent's Digimon gets -6000 DP for the turn. Then, if you have 3 or fewer security cards, delete 1 of their 6000 DP or lower Digimon.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When your security stack is removed from, this Digimon may unsuspend.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(5);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Witchelny"], cost: 3, isAlternate: true }]);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });

    // Two printed timings, ONE sentence, NO printed [Once Per Turn]: independent copies.
    for (const [index, trigger] of [
      [1, "OnPlay"],
      [2, "WhenDigivolving"],
    ] as const) {
      const effect = compiled.effects[index];
      expect(effect).toMatchObject({
        trigger,
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addBottom",
            controller: "mine",
            amount: 1,
            optional: true,
            source: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
              },
              count: 1,
            },
          },
          {
            kind: "Attack",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "trash",
              target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            },
          },
        ],
      });
      expect(effect?.frequency).toBeUndefined();
      expect(effect?.sharedUseKey).toBeUndefined();
      // Nothing printed says "without suspending".
      expect(effect?.actions[1]).not.toHaveProperty("withoutSuspending");
      // The placement is its own process, so declining it must not skip the attack.
      expect(effect?.actions[0]).not.toHaveProperty("abortOnDecline");
    }

    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -6000,
              duration: "forTheTurn",
            },
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
                count: 1,
              },
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[3]?.isInherited).toBeUndefined();

    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("digivolves through the alternate header for 3 off a Lv.4 with [Witchelny] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_LV4, as: "source" }],
          hand: [
            { card: CARD_ID, as: "mistymon" },
            { card: WITCHELNY_LV4, as: "toPlace" },
          ],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("mistymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID);

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([WITCHELNY_LV4]);
    // The header's 3, not the catalog EvoCost's 4. The clause's own two processes move security
    // cards, never memory, so the gauge ends exactly at 10 - 3.
    expect(s.state.memory).toBe(7);
  });

  it("refuses a Lv.4 that matches neither the catalog EvoCosts nor the printed header", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ILLEGAL_SOURCE, as: "green" }],
          hand: [{ card: CARD_ID, as: "mistymon" }],
          security: [INERT, INERT],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("mistymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("green").topCard.cardId).toBe(ILLEGAL_SOURCE);
    expect(s.state.memory).toBe(10);
  });

  it("places a [Witchelny] hand card at the bottom of security, then trashes the top card to attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT, as: "attacker", dp: 20_000 }],
          hand: [
            { card: CARD_ID, as: "mistymon" },
            { card: WITCHELNY_LV4, as: "toPlace" },
          ],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT, INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 2);

    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId);
    // The placement ran FIRST, so the [Witchelny] card is the new bottom card; the attack's cost
    // then trashed the card that was on top.
    expect(securityIds).toEqual([s.inst("bottom").instanceId, s.inst("toPlace").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
    // The granted attack really happened: one opponent security card was checked.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines both halves without touching either stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT, as: "attacker", dp: 20_000 }],
          hand: [
            { card: CARD_ID, as: "mistymon" },
            { card: WITCHELNY_LV4, as: "toPlace" },
          ],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "bottom" },
          ],
          deck: DECK,
        },
        1: { security: [INERT, INERT, INERT], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mistymon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("bottom").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("toPlace").instanceId]);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(false);
  });

  it("debuffs and deletes when the controller's own security stack is removed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mistymon" }],
          hand: [{ card: OWN_SECURITY_REMOVER, as: "remover" }],
          security: ["BT1-010", "BT1-011"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "victim", dp: 9000 }],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // 1 security card left (<= 3), and 9000 - 6000 = 3000 — above zero, so the removal is the
    // printed DELETE under its 6000 DP ceiling, not the DP-reaching-zero rule.
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("respects the printed 6000 DP ceiling and the 3-security gate", async () => {
    const ceiling = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mistymon" }],
          hand: [{ card: OWN_SECURITY_REMOVER, as: "remover" }],
          security: ["BT1-010", "BT1-011"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "survivor", dp: 20_000 }],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    ceiling.state.memory = 10;
    await ceiling.ready();

    expect(ceiling.engine.applyIntent(0, { type: "playCard", instanceId: ceiling.inst("remover").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => ceiling.state.players[0]!.security.length === 1);

    expect(ceiling.state.players[1]!.battleArea).toHaveLength(1);
    expect(ceiling.perm("survivor").currentDP).toBe(14_000);

    const gate = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mistymon" }],
          hand: [{ card: OWN_SECURITY_REMOVER, as: "remover" }],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: OPPONENT, as: "victim", dp: 9000 }],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    gate.state.memory = 10;
    await gate.ready();

    expect(gate.engine.applyIntent(0, { type: "playCard", instanceId: gate.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => gate.state.players[0]!.security.length === 4);

    // 4 security cards is above the printed "3 or fewer" gate, so the debuff lands but the
    // delete does not.
    // 9000 - 6000 = 3000 is UNDER the printed ceiling, so only the security gate keeps it alive.
    expect(gate.state.players[1]!.battleArea).toHaveLength(1);
    expect(gate.perm("victim").currentDP).toBe(3000);
  });

  it("ignores a removal from the OPPONENT's security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "mistymon" },
            { card: INERT, as: "attacker", dp: 20_000 },
          ],
          security: ["BT1-010"],
          deck: DECK,
        },
        1: { battleArea: [{ card: OPPONENT, as: "victim" }], security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("victim").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("fires the watcher only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mistymon" }],
          hand: [
            { card: OWN_SECURITY_REMOVER, as: "first" },
            { card: OWN_SECURITY_REMOVER, as: "second" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: OPPONENT, as: "firstVictim" },
            { card: OPPONENT, as: "secondVictim" },
          ],
          security: [INERT],
          deck: DECK,
        },
      },
      AUTOMATION,
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const survivorId = s.state.players[1]!.battleArea[0]!.permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();

    // The quota is spent: the second own-security removal neither debuffs nor deletes.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(6000);
  });

  it("unsuspends a carrier through the inherited clause when your security stack is removed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WITCHELNY_LV4, as: "carrier", under: [CARD_ID], suspended: true }],
          hand: [{ card: OWN_SECURITY_REMOVER, as: "remover" }],
          security: ["BT1-010", "BT1-011"],
          deck: DECK,
        },
        1: { security: [INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("carrier").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("carrier").isSuspended === false);

    expect(s.perm("carrier").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("declares ＜Barrier＞ live on the top card only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "mistymon" },
          { card: WITCHELNY_LV4, as: "carrier", under: [CARD_ID] },
        ],
        security: [INERT],
        deck: DECK,
      },
      1: { security: [INERT], deck: DECK },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mistymon"), "Barrier")).toBe(true);
    // ＜Barrier＞ is printed in the MAIN box only, so it is not passed up the stack.
    expect(compiled.effects.some((effect) => effect.isInherited === true && effect.keywords !== undefined)).toBe(false);
  });
});
