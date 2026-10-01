import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-031.js";
import "./index.js";
import "../BT1/BT1-102.js";
import "../BT2/BT2-099.js";
import "../BT10/BT10-100.js";
import "../BT24/BT24-085.js";
import "../BT24/BT24-092.js";

describe("BT17-031", () => {
  it("reveals three and adds a Kyubimon/Taomon/Sakuyamon or Rika Nonaka option", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand", orFilters: [{ kind: ["Option"], playCostGte: 2 }] },
          ],
        },
      ],
    });
  });

  it("gives an opposing Digimon Security Attack -1 after a cost 2+ option as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -1 },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });

  it("adds one named Digimon and Rika while bottom-decking the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
            { card: "BT1-029", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const kyubimonId = s.inst("kyubimon").instanceId;
    const rikaId = s.inst("rika").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === rikaId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([kyubimonId, rikaId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(remainderId);
  });

  it("reduces Security Attack only for an option use cost of at least 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "cheap-option" });
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "qualifying-option",
    });
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("triggers after a real cost-2 Option is used from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("adds a cost-2 Option through the second slot's alternative filter", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT1-102", as: "option" },
            { card: "BT1-029", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const kyubimonId = s.inst("kyubimon").instanceId;
    const optionId = s.inst("option").instanceId;
    const remainderId = s.inst("remainder").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([kyubimonId, optionId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(remainderId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === remainderId)).toBe(false);
  });

  it("adds nothing and bottom-decks all three when none of the revealed cards qualify", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-031", as: "renamon" }],
          deck: [
            { card: "BT1-029", as: "r1" },
            { card: "BT1-010", as: "r2" },
            { card: "BT1-011", as: "r3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const renamonId = s.inst("renamon").instanceId;
    const restIds = [s.inst("r1").instanceId, s.inst("r2").instanceId, s.inst("r3").instanceId];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: renamonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === renamonId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining(restIds));
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a second grant in the same turn and targets exactly one of two opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }],
          hand: [
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "t1" },
            { card: "BT1-010", as: "t2" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const seenAmount = () =>
      observe(s.engine).keywordAmount(s.perm("t1"), "SecurityAttack") +
      observe(s.engine).keywordAmount(s.perm("t2"), "SecurityAttack");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(seenAmount()).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(seenAmount()).toBe(-1);
    expect(
      [
        observe(s.engine).keywordAmount(s.perm("t1"), "SecurityAttack"),
        observe(s.engine).keywordAmount(s.perm("t2"), "SecurityAttack"),
      ].filter((amount) => amount === -1),
    ).toHaveLength(1);
  });

  it("grants again on the next own turn after the once-per-turn use is spent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-031"], as: "host" }],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-010"] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;

    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

const RENAMON_HOST = { card: "BT17-032", as: "host", under: ["BT17-031"] };
const FILLER_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const YELLOW_TAMER = "BT1-087";

type Setup = ReturnType<typeof setupEngine>;

function securityAttackOf(s: Setup, alias: string): number {
  return observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack");
}

async function useGloriousBurstWithYellowTamers(tamerCount: number): Promise<Setup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [...Array.from({ length: tamerCount }, () => YELLOW_TAMER), RENAMON_HOST],
        hand: [{ card: "BT2-099", as: "burst" }],
        deck: [...FILLER_DECK],
      },
      1: { battleArea: [{ card: "BT2-050", as: "target", dp: 20000 }], deck: [...FILLER_DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  const burstId = s.inst("burst").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: burstId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === burstId));
  await settle();
  return s;
}

describe("BT17-031 Renamon — KB Q&A rulings", () => {
  it("activates only after the used Option card's [Main] effect has resolved (Q2778)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [RENAMON_HOST],
          hand: [{ card: "BT1-102", as: "blade" }],
          deck: [{ card: "BT1-013", as: "drawnByBlade" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const bladeId = s.inst("blade").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bladeId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawnByBlade").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(bladeId);
    expect(securityAttackOf(s, "first")).toBe(0);
    expect(securityAttackOf(s, "second")).toBe(0);

    const { decisionId } = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => securityAttackOf(s, "second") === -1);

    expect(securityAttackOf(s, "first")).toBe(0);
    expect(securityAttackOf(s, "second")).toBe(-1);
  });

  it("does not trigger when an Option card's effect activates without using the card, such as by <Delay> (Q2779)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [RENAMON_HOST],
          hand: [{ card: "BT10-100", as: "delayed" }],
          deck: [...FILLER_DECK],
          security: ["BT1-009", "BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: [...FILLER_DECK] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const delayedId = s.inst("delayed").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: delayedId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === delayedId));
    await settle(() => securityAttackOf(s, "target") === -1);
    expect(securityAttackOf(s, "target")).toBe(-1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(securityAttackOf(s, "target")).toBe(0);

    const delayEffects = observe(s.engine).activatableEffects(s.perm("delayed"));
    expect(delayEffects.length).toBeGreaterThan(0);
    const memoryBeforeDelay = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delayedId,
        effectKey: delayEffects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === delayedId));
    await settle();

    expect(s.state.memory).toBe(memoryBeforeDelay + 2);
    expect(securityAttackOf(s, "target")).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger for an Option whose use cost is reduced to 1 in the hand, like [Glorious Burst] (Q2780)", async () => {
    const useCostOne = await useGloriousBurstWithYellowTamers(8);
    expect(useCostOne.state.memory).toBe(9);
    expect(securityAttackOf(useCostOne, "target")).toBe(0);

    const useCostTwo = await useGloriousBurstWithYellowTamers(7);
    expect(useCostTwo.state.memory).toBe(8);
    expect(securityAttackOf(useCostTwo, "target")).toBe(-1);
  });

  it("triggers when only the cost to pay of a use-cost-2 Option is reduced to 0, as by [Taomon] (Q2781)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["BT17-031"] }],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT1-102", as: "blade" },
          ],
          deck: [...FILLER_DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const bladeId = s.inst("blade").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bladeId));
    await settle(() => securityAttackOf(s, "target") === -1);

    expect(s.perm("host").topCard?.cardId).toBe("BT17-035");
    expect(s.state.memory).toBe(2);
    expect(securityAttackOf(s, "target")).toBe(-1);
  });

  it("triggers when an effect uses an Option with an original use cost of 2 or more without paying the cost (Q5453)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [RENAMON_HOST, { card: "BT24-085", as: "tamer" }],
          hand: [{ card: "BT24-092", as: "shockPlasma" }],
          deck: [...FILLER_DECK],
        },
        1: { battleArea: [{ card: "BT11-111", as: "target" }], deck: [...FILLER_DECK] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();
    const shockPlasmaId = s.inst("shockPlasma").instanceId;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("tamer"));
    await settle(() => securityAttackOf(s, "target") === -1);

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(shockPlasmaId);
    expect(s.perm("target").currentDP).toBe(8000);
    expect(securityAttackOf(s, "target")).toBe(-1);
  });
});
