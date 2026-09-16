import { getCardDefinition, type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-028.js";

const CARD_ID = "EX10-028";
const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX10-028 Landramon", () => {
  it("matches every catalog field and compiles every printed clause", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Landramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toBeUndefined();

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((candidate) => candidate.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Reboot" },
            duration: "untilOpponentTurnEnd",
            optional: true,
            abortOnDecline: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
              },
              count: 1,
              bindAs: "chosen",
            },
            cost: {
              kind: "trash",
              target: {
                filter: { controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] },
                from: ["digivolutionCards"],
                count: 1,
              },
            },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
            target: { fromSelectionRef: "chosen" },
          },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            target: { fromSelectionRef: "chosen" },
          },
        ],
      });
      expect(effect?.actions).toHaveLength(3);
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
          },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("Q5083: [On Play] pays from another Digimon's stack and buffs one chosen [Mineral]/[Rock] Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT10-064", as: "target" },
            { card: "BT1-009", as: "trapHost", under: [{ card: "BT2-014", as: "trapCard" }] },
            { card: "BT2-011", as: "trapTarget" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard!.instanceId);
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;
    const trapBase = s.perm("trapTarget").currentDP;
    const costHostBase = s.perm("costHost").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetBase + 3000 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.perm("costHost").stack).toHaveLength(0);
    expect(s.perm("trapHost").stack.map((card) => card.instanceId)).toEqual([s.inst("trapCard").instanceId]);

    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);

    expect(s.perm("trapTarget").currentDP).toBe(trapBase);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Reboot")).toBe(false);
    expect(s.perm("costHost").currentDP).toBe(costHostBase);
    expect(observe(s.engine).hasKeyword(s.perm("costHost"), "Blocker")).toBe(false);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("[When Digivolving] from a Black Lv.3 for 2 memory, paying with its own source card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-065", as: "source" }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const landramonId = s.inst("landramon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: landramonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").currentDP === 4000 + 3000 && s.state.pendingDecision === undefined);

    expect(s.perm("source").topCard?.instanceId).toBe(landramonId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);

    expect(s.perm("source").currentDP).toBe(4000 + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each([
    ["a Red Lv.3 source", "BT1-009"],
    ["a Black Lv.4 source", "BT10-062"],
  ])("refuses to digivolve from %s", async (_label, sourceCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "source" }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const sourceId = s.inst("source").instanceId;
    const landramonId = s.inst("landramon").instanceId;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("source").permanentId,
      instanceId: landramonId,
    });
    expect(result.ok).toBe(false);

    expect(s.perm("source").topCard?.instanceId).toBe(sourceId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([landramonId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("all three grants survive the opponent's whole turn and expire when it ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT10-064", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY, hand: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard!.instanceId);
    const targetBase = s.perm("target").currentDP;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the cost pays nothing and grants nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-062", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT10-064", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("costHost").stack.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("a [Rock Dragon] digivolution card cannot pay the cost, so nothing is granted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "trapHost", under: [{ card: "BT2-014", as: "trapCard" }] },
            { card: "BT10-064", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const targetBase = s.perm("target").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("trapHost").stack.map((card) => card.instanceId)).toEqual([s.inst("trapCard").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(targetBase);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: being trashed as a cost from a [Mineral] host deletes an opposing play cost 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: CARD_ID, as: "buried" }] }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT10-062", as: "costFive" },
            { card: "BT4-065", as: "costFour" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(
      s.inst("buried").instanceId,
      s.perm("costFive").topCard!.instanceId,
      s.perm("costFour").topCard!.instanceId,
    );
    s.state.memory = 4;
    const costFourId = s.perm("costFour").permanentId;
    const costFiveId = s.perm("costFive").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("buried").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([costFiveId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costFourId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT4-065"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("inherited: on a carrier stack built by playCard + digivolve, deletes an opposing play cost 4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "carrier" },
            { card: "BT10-064", as: "gogmamon" },
            { card: CARD_ID, as: "landramon" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT10-062", as: "costFive" },
            { card: "BT4-065", as: "costFour" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const carrierId = s.inst("carrier").instanceId;
    const gogmamonId = s.inst("gogmamon").instanceId;
    const landramonId = s.inst("landramon").instanceId;
    const costFourId = s.perm("costFour").permanentId;
    const costFiveId = s.perm("costFive").permanentId;

    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: carrierId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === carrierId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    const carrierPermanentId = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === carrierId,
    )!.permanentId;
    const carrier = (): Permanent =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === carrierPermanentId)!;

    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: carrierPermanentId,
        instanceId: gogmamonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => carrier().topCard?.instanceId === gogmamonId && s.state.pendingDecision === undefined);
    expect(carrier().stack.map((card) => card.instanceId)).toEqual([carrierId]);
    expect(carrier().currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([landramonId, s.inst("drawn").instanceId]);

    preferred.push(carrierId, s.perm("costFive").topCard!.instanceId, s.perm("costFour").topCard!.instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(carrier().topCard?.instanceId).toBe(gogmamonId);
    expect(carrier().stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([carrierId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([costFiveId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costFourId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT4-065"]);
    expect(carrier().currentDP).toBe(8000 + 3000);
    expect(observe(s.engine).hasKeyword(carrier(), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(carrier(), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("inherited: an opponent's BT1-099 Hearts Attack trash fires the watcher against its own caster", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: CARD_ID, as: "buried" }] }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          hand: [{ card: "BT1-099", as: "heartsAttack" }],
          battleArea: [
            { card: "BT10-062", as: "costFive" },
            { card: "BT4-065", as: "costFour" },
            { card: "BT1-042", as: "blueEnabler" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("costFive").topCard!.instanceId, s.perm("costFour").topCard!.instanceId);
    const costFourId = s.perm("costFour").permanentId;
    const costFiveId = s.perm("costFive").permanentId;
    const blueEnablerId = s.perm("blueEnabler").permanentId;
    const buriedId = s.inst("buried").instanceId;
    const optionId = s.inst("heartsAttack").instanceId;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([buriedId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      costFiveId,
      blueEnablerId,
    ]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(costFourId);
    expect([...s.state.players[1]!.trash.map((card) => card.cardId)].sort()).toEqual(["BT1-099", "BT4-065"]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("a [Rock Dragon] Digimon is not a legal target for the three grants", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "costHost", under: [{ card: "BT4-065", as: "cost" }] },
            { card: "BT2-011", as: "trapTarget" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("trapTarget").topCard!.instanceId);
    s.state.memory = 4;
    const trapBase = s.perm("trapTarget").currentDP;
    const landramonId = s.inst("landramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: landramonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 1 &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === landramonId),
    );

    const landramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === landramonId,
    )!;
    expect(landramon.currentDP).toBe(4000 + 3000);
    expect(observe(s.engine).hasKeyword(landramon, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(landramon, "Reboot")).toBe(true);
    expect(s.perm("trapTarget").currentDP).toBe(trapBase);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("trapTarget"), "Reboot")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["a [Mini Dragon] host", "BT1-009"],
    ["a [Rock Dragon] host, the substring trap", "BT2-011"],
  ])("inherited: silent when trashed from %s", async (_label, hostCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: hostCard, as: "host", under: [{ card: CARD_ID, as: "buried" }] },
            { card: "BT10-064", as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "BT4-065", as: "prey" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("buried").instanceId, s.perm("ally").topCard!.instanceId);
    s.state.memory = 4;
    const preyId = s.perm("prey").permanentId;
    const allyBase = s.perm("ally").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === allyBase + 3000 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("buried").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([preyId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5100: the inherited delete reads the reduced play cost, not the printed one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-062", as: "host", under: [{ card: CARD_ID, as: "buried" }] }],
          hand: [{ card: CARD_ID, as: "landramon" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "reduced" },
            { card: "BT3-067", as: "untouched" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const reducedId = s.perm("reduced").permanentId;
    const untouchedId = s.perm("untouched").permanentId;
    preferred.push(s.inst("buried").instanceId, s.perm("untouched").topCard!.instanceId);
    advance(s.engine).ledgers.modifiers.addPlayCostAdjustment((facts) => facts.permanentId === reducedId, -2, false);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("buried").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([untouchedId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-019"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
