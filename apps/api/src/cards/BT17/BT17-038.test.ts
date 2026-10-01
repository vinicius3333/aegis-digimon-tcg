import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-102.js";
import "../BT10/BT10-031.js";
import "../BT10/BT10-100.js";
import "../BT2/BT2-099.js";
import "../EX2/EX2-066.js";
import "../ST3/ST3-13.js";
import { compiled } from "./BT17-038.js";
import "./index.js";

describe("BT17-038 Sakuyamon", () => {
  it("matches the catalog printed text and full IR contract", () => {
    expect(getCardDefinition("BT17-038")).toMatchObject({
      cardId: "BT17-038",
      nameEn: "Sakuyamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Shaman"],
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Sakuyamon: Maid Mode"], cost: 1, isAlternate: true },
    ]);

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(whenDigivolving?.actions?.[1]).toMatchObject({
      kind: "UseOptionWithoutCost",
      optional: true,
      payCost: false,
      filter: {
        controller: "mine",
        kind: ["Option"],
        playCostLte: 99,
        or: [{ nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { colors: ["Yellow"], playCostLte: 5 }],
      },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "Restrict",
              restriction: "beReturned",
              duration: "untilOpponentTurnEnd",
              byOpponentEffectsOnly: true,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("digivolves through the printed Sakuyamon: Maid Mode route for 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: undefined,
          battleArea: [{ card: "BT10-041", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT1-011", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sakuyamonId = s.inst("sakuyamon").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sakuyamonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === sakuyamonId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.instanceId).toBe(sakuyamonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a near-name Sakuyamon base on both the exact route and the Lv5 route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-044", as: "base" }],
        hand: [{ card: "BT17-038", as: "sakuyamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sakuyamonId = s.inst("sakuyamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sakuyamonId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sakuyamonId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("base").topCard?.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([sakuyamonId]);
    expect(s.state.memory).toBe(5);
  });

  it("reduces DP, uses a free cost-2 yellow Option, and locks itself against opponent return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-035", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-020", dp: 9000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("target").currentDP === 3000 && s.state.players[0]!.hand.some((card) => card.instanceId === drawnId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("locks itself against opponent return after a real paid cost-2 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-011", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("actually prevents an opponent bounce, then expires at the end of that opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-011", as: "spare" },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    const sakuyamonId = s.perm("sakuyamon").topCard!.instanceId;
    s.state.turnSeat = 1;
    await advance(s.engine).verb.returnToHand([sakuyamonId]);
    await settle();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("sakuyamon").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sakuyamonId)).toBe(false);

    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    await advance(s.engine).verb.returnToHand([sakuyamonId]);
    await settle();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === sakuyamonId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sakuyamonId)).toBe(true);
  });

  it("does not lock itself when the used Option costs less than 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "ST3-13", as: "cheapOption" },
            { card: "BT1-011", as: "spare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheapOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST3-13"));

    expect(observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses a red Plug-In when a red board source meets its color requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-035", as: "base" },
            { card: "EX2-008", as: "redSource" },
          ],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "EX2-066", as: "plugIn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const plugInId = s.inst("plugIn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === plugInId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(plugInId);
  });

  it("does not use an unrelated or color-illegal Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-035", as: "base" }],
          hand: [
            { card: "BT17-038", as: "sakuyamon" },
            { card: "BT5-102", as: "unrelated" },
            { card: "EX2-066", as: "colorIllegalPlugIn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const unrelatedId = s.inst("unrelated").instanceId;
    const illegalId = s.inst("colorIllegalPlugIn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([unrelatedId, illegalId]),
    );
  });
});

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const YELLOW_TAMER = "BT1-087";

function isReturnProtected(s: EngineSetup): boolean {
  return observe(s.engine).isRestricted(s.perm("sakuyamon"), "beReturned");
}

async function useGloriousBurstBesideSakuyamon(yellowTamerCount: number): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          ...Array.from({ length: yellowTamerCount }, () => YELLOW_TAMER),
          { card: "BT17-038", as: "sakuyamon", under: ["BT17-035"] },
        ],
        hand: [{ card: "BT2-099", as: "burst" }],
        deck: [...DECK],
      },
      1: { battleArea: [{ card: "BT2-050", as: "target", dp: 20000 }], deck: [...DECK] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  const burstId = s.inst("burst").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: burstId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === burstId));
  await settle();
  return s;
}

async function useOptionThroughTaomonBesideSakuyamon(optionCardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT17-038", as: "sakuyamon", under: ["BT17-035"] },
          { card: "BT17-035", as: "taomon" },
        ],
        hand: [{ card: optionCardId, as: "option" }],
        deck: [...DECK],
      },
      1: { battleArea: [{ card: "BT2-050", as: "target" }], deck: [...DECK] },
    },
    { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
  );
  s.state.memory = 0;
  await s.ready();
  const optionId = s.inst("option").instanceId;
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("taomon"));
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
  await settle();
  return s;
}

async function digivolveIntoSakuyamonHolding(optionCardId: string, answer: "accept" | "decline") {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT17-035", as: "sakuyamon" }],
        hand: [
          { card: "BT17-038", as: "sakuyamonCard" },
          { card: optionCardId, as: "option" },
        ],
        deck: [...DECK],
      },
      1: { battleArea: [{ card: "BT2-050", as: "target" }], deck: [...DECK] },
    },
    answer === "accept"
      ? { autoAcceptOptional: true, autoSelectCards: true }
      : { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("sakuyamon").permanentId,
      instanceId: s.inst("sakuyamonCard").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("target").currentDP === 5000);
  await settle();
  return s;
}

describe("BT17-038 Sakuyamon — KB Q&A rulings", () => {
  it("activates its Option-use effect only after the used Option's [Main] effect finishes (Q2788)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", as: "sakuyamon", under: ["BT17-035"] }],
          hand: [
            { card: "BT10-100", as: "option" },
            { card: "BT10-031", as: "pulsemon" },
          ],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: false, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const mainEffectPrompt = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req).toMatchObject({ kind: "optional", sourceCardId: "BT10-100" });
    expect(isReturnProtected(s)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mainEffectPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => isReturnProtected(s));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
    expect(isReturnProtected(s)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trigger when an Option's effect activates without using the card, such as <Delay> (Q2789)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-038", as: "sakuyamon", under: ["BT17-035"] },
            { card: "BT10-100", as: "delayOption" },
          ],
          hand: [{ card: "BT1-102", as: "usedOption" }],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const delayOptionId = s.perm("delayOption").topCard.instanceId;
    const effects = observe(s.engine).activatableEffects(s.perm("delayOption")) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delayOptionId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 4 && s.state.players[0]!.trash.some((card) => card.instanceId === delayOptionId),
    );
    await settle();

    expect(isReturnProtected(s)).toBe(false);

    const usedOptionId = s.inst("usedOption").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: usedOptionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === usedOptionId));

    expect(isReturnProtected(s)).toBe(true);
  });

  it("does not trigger when a card-level reduction makes the used Option's use cost 1 (Q2790)", async () => {
    const useCostOne = await useGloriousBurstBesideSakuyamon(8);
    expect(useCostOne.state.memory).toBe(9);
    expect(useCostOne.perm("target").currentDP).toBe(8000);
    expect(isReturnProtected(useCostOne)).toBe(false);

    const useCostTwo = await useGloriousBurstBesideSakuyamon(7);
    expect(useCostTwo.state.memory).toBe(8);
    expect(isReturnProtected(useCostTwo)).toBe(true);
  });

  it("triggers when only the cost to pay for an Option with original cost 2 is reduced to 0 (Q5457)", async () => {
    const reducedPayment = await useOptionThroughTaomonBesideSakuyamon("BT1-102");
    expect(reducedPayment.state.memory).toBe(0);
    expect(isReturnProtected(reducedPayment)).toBe(true);

    const originalCostOne = await useOptionThroughTaomonBesideSakuyamon("ST3-13");
    expect(originalCostOne.state.memory).toBe(0);
    expect(isReturnProtected(originalCostOne)).toBe(false);
  });

  it("triggers when an effect uses an Option with original cost 2 without paying the cost (Q5458)", async () => {
    const usedForFree = await digivolveIntoSakuyamonHolding("BT1-102", "accept");
    expect(usedForFree.state.memory).toBe(0);
    expect(usedForFree.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      usedForFree.inst("option").instanceId,
    );
    expect(isReturnProtected(usedForFree)).toBe(true);

    const declined = await digivolveIntoSakuyamonHolding("BT1-102", "decline");
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      declined.inst("option").instanceId,
    );
    expect(isReturnProtected(declined)).toBe(false);
  });
});
