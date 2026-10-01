import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-102.js";
import "../BT8/BT8-097.js";
import "../LM/LM-033.js";
import "../BT17/BT17-035.js";
import "../BT24/BT24-085.js";
import "../BT24/BT24-092.js";
import { compiled } from "./BT17-032.js";

describe("BT17-032", () => {
  it("matches the catalog, printed text, and full IR contract", () => {
    expect(getCardDefinition("BT17-032")).toMatchObject({
      cardId: "BT17-032",
      nameEn: "Kyubimon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Mysterious Beast"],
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you don't have [Rika Nonaka], you may play 1 [Rika Nonaka] from your hand without paying the cost.",
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When you use an option card with a cost of 2 or more, 1 of your opponent's Digimon gains ＜Security Attack -1＞until the end of their turn.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "nameExact" }] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            condition: {
              kind: "youHaveNone",
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "nameExact" }] },
              raw: "you don't have [Rika Nonaka]",
            },
            optional: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: {
              kind: "triggerOptionCostAtLeast",
              value: 2,
              raw: "when you use an Option card with a cost of 2 or more",
            },
            actions: [
              {
                kind: "GainKeyword",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
                duration: "untilOpponentTurnEnd",
              },
            ],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays Rika Nonaka for free on a real digivolution when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "source" }],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const rikaId = s.inst("rika").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rikaId));

    expect(s.perm("source").topCard.cardId).toBe("BT17-032");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-045"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rikaId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === rikaId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not play Rika on digivolution when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "source" },
            { card: "BT17-085", as: "existing-rika" },
          ],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "hand-rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const handRikaId = s.inst("hand-rika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT17-032");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handRikaId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-085")).toHaveLength(
      1,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces one opposing Digimon's Security Attack after a real cost-2 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => observe(s.engine).hasKeyword(permanent, "SecurityAttack")),
    ).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire the inherited watcher for an Option with a use cost below 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [{ card: "ST3-13", as: "cheapOption" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheapOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST3-13"));

    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants the debuff only once per turn even after two cost-2 Option uses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [
            { card: "BT1-102", as: "optionOne" },
            { card: "BT1-102", as: "optionTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetOne" },
            { card: "BT1-010", as: "targetTwo" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optionOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optionTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);

    const debuffed = s.state.players[1]!.battleArea.filter((permanent) =>
      observe(s.engine).hasKeyword(permanent, "SecurityAttack"),
    );
    expect(debuffed).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(debuffed[0]!, "SecurityAttack")).toBe(-1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays Rika beside a near-miss Tamer peer that does not answer the [Rika Nonaka] gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "source" },
            { card: "BT1-087", as: "otherTamer" },
          ],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const rikaId = s.inst("rika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rikaId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === rikaId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-087")).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("treats another printing named Rika Nonaka as [Rika Nonaka] and refuses the free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "source" },
            { card: "EX2-060", as: "otherRikaPrinting" },
          ],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "handRika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const handRikaId = s.inst("handRika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT17-032");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handRikaId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-085")).toHaveLength(
      0,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

const RED_KYUBIMON_HOST: PermanentSpec = { card: "BT8-007", under: ["BT17-032"], as: "host" };
const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function strongOpponents(count: number): PermanentSpec[] {
  return Array.from({ length: count }, (_, index) => ({ card: "BT1-009", as: `opponent${index}`, dp: 20_000 }));
}

function totalOpposingSecurityAttack(s: EngineSetup): number {
  return s.state.players[1]!.battleArea.reduce(
    (total, permanent) => total + observe(s.engine).keywordAmount(permanent, "SecurityAttack"),
    0,
  );
}

async function useCrimsonBlazeFromHand(s: EngineSetup, alias: string): Promise<void> {
  const optionId = s.inst(alias).instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === optionId) && s.state.pendingDecision === undefined,
  );
  await drainMicrotasks();
}

async function useCrimsonBlazeAgainst(opposingCount: number): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: { battleArea: [RED_KYUBIMON_HOST], hand: [{ card: "BT8-097", as: "crimsonBlaze" }], deck: [...DECK] },
      1: { battleArea: strongOpponents(opposingCount), deck: [...DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  await useCrimsonBlazeFromHand(s, "crimsonBlaze");
  return s;
}

describe("BT17-032 Kyubimon — KB Q&A rulings", () => {
  it("activates the inherited effect only after the used Option's [Main] effect has resolved (Q2782)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [RED_KYUBIMON_HOST], hand: [{ card: "BT8-097", as: "crimsonBlaze" }], deck: [...DECK] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "weak", dp: 3000 },
            { card: "BT1-009", as: "firstSurvivor", dp: 20_000 },
            { card: "BT1-009", as: "secondSurvivor", dp: 20_000 },
          ],
          deck: [...DECK],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("crimsonBlaze").instanceId;
    const weakId = s.inst("weak").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    // Crimson Blaze's [Main] already deleted the 3000 DP Digimon and the card is in the trash
    // when Kyubimon's inherited effect asks for its target.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(weakId);
    const choice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([
      s.perm("firstSurvivor").permanentId,
      s.perm("secondSurvivor").permanentId,
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("secondSurvivor").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).keywordAmount(s.perm("secondSurvivor"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).hasKeyword(s.perm("firstSurvivor"), "SecurityAttack")).toBe(false);
  });

  it("does not trigger when an Option's effect activates from security or <Delay> instead of being used (Q2783)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [RED_KYUBIMON_HOST, { card: "LM-033", as: "delayOption" }],
          security: [{ card: "BT8-097", as: "securityBlaze" }],
          hand: [{ card: "BT8-097", as: "handBlaze" }],
          deck: [...DECK],
        },
        1: { battleArea: [...strongOpponents(2), { card: "BT1-009", as: "weak", dp: 3000 }], deck: [...DECK] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    const weakId = s.inst("weak").instanceId;
    const delayOptionId = s.inst("delayOption").instanceId;

    const delay = observe(s.engine)
      .activatableEffects(s.perm("delayOption"))
      .find((effect) => effect.description?.includes("Delay") === true);
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: delayOptionId, effectKey: delay!.effectKey }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.trash.some((card) => card.instanceId === delayOptionId) && s.state.memory === 7,
    );
    await drainMicrotasks();

    expect(s.state.memory).toBe(7);
    expect(totalOpposingSecurityAttack(s)).toBe(0);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityBlaze"));
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks();

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(weakId);
    expect(totalOpposingSecurityAttack(s)).toBe(0);

    // Near-miss: actually using a copy from the hand in the same turn does trigger it.
    await useCrimsonBlazeFromHand(s, "handBlaze");
    expect(s.state.memory).toBe(3);
    expect(totalOpposingSecurityAttack(s)).toBe(-1);
  });

  it("does not trigger when the Option's use cost itself is reduced to 1 in the hand (Q5454)", async () => {
    const costOne = await useCrimsonBlazeAgainst(5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingSecurityAttack(costOne)).toBe(0);

    const costTwo = await useCrimsonBlazeAgainst(4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingSecurityAttack(costTwo)).toBe(-1);
  });

  it("triggers when only the cost to pay is reduced below 2, using the original use cost (Q5455)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT17-032"] },
            { card: "BT17-035", as: "taomon" },
          ],
          hand: [{ card: "BT1-102", as: "option" }],
          deck: [...DECK],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 20_000 }], deck: [...DECK] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("taomon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("triggers when an effect uses an Option with an original use cost of 2 or more without paying (Q5456)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT17-032"] },
            { card: "BT24-085", as: "tamer" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
          deck: [...DECK],
        },
        1: { battleArea: [{ card: "BT11-111", as: "target" }], deck: [...DECK] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("tamer"));
    await settle(() => s.perm("target").currentDP === 8000);
    await settle(() => s.state.pendingDecision === undefined);
    await drainMicrotasks();

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
