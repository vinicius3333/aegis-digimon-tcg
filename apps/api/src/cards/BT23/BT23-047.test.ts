import {
  compiledEffects,
  digivolutionRequirementsFor,
  dnaDigivolutionRequirementsFor,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-047.js";

const GREEN_LV5 = "BT1-076";
const GREEN_LV6 = "BT1-080";
const BLUE_LV5 = "BT1-038";
const BLUE_LV6 = "ST2-10";
const CS_LV6 = "BT23-058";
const OFF_ROUTE_LV6 = "ST3-10";
const PLAIN_LV3 = "BT1-009";
const PLAIN_LV3_ALT = "BT1-010";
const PLAIN_LV4 = "BT1-019";
const OPTION_FROM_SECURITY = "P-035";

async function buildDnaMaterials(s: ReturnType<typeof setupEngine>): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("greenBase").permanentId,
      instanceId: s.inst("greenEvo").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("greenBase").topCard?.cardId === GREEN_LV6);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("blueBase").permanentId,
      instanceId: s.inst("blueEvo").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("blueBase").topCard?.cardId === BLUE_LV6);
  await settle();
}

async function passTurn(s: ReturnType<typeof setupEngine>, from: 0 | 1, to: 0 | 1) {
  const ended = s.state.turnSeat === from ? s.engine.applyIntent(from, { type: "endPhase" }) : { ok: true };
  expect(ended).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(to);
  await s.ready();
}

describe("BT23-047 Examon", () => {
  it("declares the official catalog identity, the [CS] alternate and the green+blue DNA recipe", () => {
    expect(getCardDefinition("BT23-047")).toMatchObject({
      cardId: "BT23-047",
      nameEn: "Examon",
      colors: ["Green", "Red", "Blue"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 5 },
        { color: "Red", level: 6, memoryCost: 5 },
        { color: "Blue", level: 6, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    expect(getCardDefinition("BT23-047")?.effectText?.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve] Lv.6 w/[CS] trait: Cost 5\n" +
        "[DNA Digivolve] Green Lv.6 + blue Lv.6: Cost 0\n" +
        "＜Piercing＞ \n＜Security A. +1＞ \n＜Partition (green Lv.5 & blue Lv.5)＞ \n" +
        "[On Play] [When Digivolving] Suspend 5 of your opponent's Digimon or Tamers. None of your " +
        "opponent's Digimon can unsuspend in their next unsuspend phase. Then, this Digimon may attack.\n" +
        "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, trash 1 of " +
        "their Option cards in the battle area. Then, delete 1 of their suspended Digimon or Tamers.",
    );
    expect(getCardDefinition("BT23-047")?.inheritedEffectText).toBeUndefined();
    expect(digivolutionRequirementsFor("BT23-047")).toEqual([{ level: 6, traits: ["CS"], cost: 5, isAlternate: true }]);
    expect(dnaDigivolutionRequirementsFor("BT23-047")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
    ]);
    expect(registeredCompiledCards.get("BT23-047")).toEqual(compiled);
    expect(compiledEffects["BT23-047"]).toEqual(compiled);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("publicly digivolves from a printed green Lv.6 for 5 and draws the evolution bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_LV6, as: "base" }],
          hand: [{ card: "BT23-047", as: "examon" }],
          deck: [{ card: PLAIN_LV3, as: "bonus" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseId = s.perm("base").topCard!.instanceId;
    const examonId = s.inst("examon").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: examonId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === examonId);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly digivolves from an off-colour Lv.6 [CS] source for 5 through the alternate path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_LV6, as: "base" }],
          hand: [{ card: "BT23-047", as: "examon" }],
          deck: [{ card: PLAIN_LV3, as: "bonus" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseId = s.perm("base").topCard!.instanceId;
    const examonId = s.inst("examon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: examonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === examonId);
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
  });

  it.each([
    ["the printed route", false],
    ["the declared [CS] alternate", true],
  ])("rejects a yellow Lv.6 source without the [CS] trait through %s", (_label, alternate) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: OFF_ROUTE_LV6, as: "base" }],
        hand: [{ card: "BT23-047", as: "examon" }],
        deck: [PLAIN_LV3],
      },
    });
    s.state.memory = 10;
    const baseId = s.perm("base").topCard!.instanceId;
    const examonId = s.inst("examon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: examonId,
        ...(alternate ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard?.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([examonId]);
    expect(s.state.memory).toBe(10);
  });

  it("publicly DNA digivolves for 0 from a green Lv.6 plus a blue Lv.6 and merges both stacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_LV5, as: "greenBase" },
            { card: BLUE_LV5, as: "blueBase" },
          ],
          hand: [
            { card: GREEN_LV6, as: "greenEvo" },
            { card: BLUE_LV6, as: "blueEvo" },
            { card: "BT23-047", as: "examon" },
          ],
          deck: [
            { card: PLAIN_LV3, as: "drawGreen" },
            { card: PLAIN_LV3_ALT, as: "drawBlue" },
            { card: PLAIN_LV4, as: "drawDna" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const greenLv5Id = s.perm("greenBase").topCard!.instanceId;
    const blueLv5Id = s.perm("blueBase").topCard!.instanceId;
    const greenLv6Id = s.inst("greenEvo").instanceId;
    const blueLv6Id = s.inst("blueEvo").instanceId;
    const examonId = s.inst("examon").instanceId;

    await buildDnaMaterials(s);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greenBase").permanentId, s.perm("blueBase").permanentId],
        instanceId: examonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === examonId));
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    const merged = s.state.players[0]!.battleArea[0]!;
    expect(merged.topCard?.instanceId).toBe(examonId);
    expect([...merged.stack].map((card) => card.instanceId).sort()).toEqual(
      [greenLv5Id, greenLv6Id, blueLv5Id, blueLv6Id].sort(),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("drawGreen").instanceId,
      s.inst("drawBlue").instanceId,
      s.inst("drawDna").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the DNA route from two green Lv.6 materials and pays nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_LV5, as: "greenBase" },
            { card: GREEN_LV5, as: "partnerBase" },
          ],
          hand: [
            { card: GREEN_LV6, as: "greenEvo" },
            { card: GREEN_LV6, as: "partnerEvo" },
            { card: "BT23-047", as: "examon" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const examonId = s.inst("examon").instanceId;

    for (const side of ["green", "partner"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(`${side}Base`).permanentId,
          instanceId: s.inst(`${side}Evo`).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(`${side}Base`).topCard?.cardId === GREEN_LV6);
    }
    await settle();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greenBase").permanentId, s.perm("partnerBase").permanentId],
        instanceId: examonId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(examonId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === examonId)).toBe(false);
  });

  it("refuses the DNA route when the blue material is only level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_LV5, as: "greenBase" },
            { card: BLUE_LV5, as: "blueBase" },
          ],
          hand: [
            { card: GREEN_LV6, as: "greenEvo" },
            { card: "BT23-047", as: "examon" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const examonId = s.inst("examon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("greenEvo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard?.cardId === GREEN_LV6);
    await settle();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greenBase").permanentId, s.perm("blueBase").permanentId],
        instanceId: examonId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(examonId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === examonId)).toBe(false);
  });

  it("carries Piercing, Security Attack +1 and Partition as live keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-047", as: "exa" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("exa"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("exa"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("exa"), "Partition")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Piercing", "SecurityAttack", "Partition"]);
  });

  it("checks two security cards in one attack from ＜Security A. +1＞", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-047", as: "exa" }] },
        1: { security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exa").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-047")).toBe(true);
    expect(s.perm("exa").isSuspended).toBe(true);
  });

  it("pierces the surplus DP into security after winning a Digimon battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-047", as: "exa" }] },
        1: {
          battleArea: [{ card: PLAIN_LV3, as: "victim", suspended: true }],
          security: [PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const securityBefore = s.state.players[1]!.security.length;
    const victimId = s.perm("victim").permanentId;
    const victimCardId = s.perm("victim").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exa").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === victimCardId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-047")).toBe(true);
  });

  async function dnaIntoExamonThenPassTurn(
    s: ReturnType<typeof setupEngine>,
    options: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean; autoSelectCards?: boolean },
  ) {
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    const examonId = s.inst("examon").instanceId;

    await buildDnaMaterials(s);
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("greenBase").permanentId, s.perm("blueBase").permanentId],
        instanceId: examonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === examonId));
    await settle(() => s.state.pendingDecision === undefined);
    const examonPermanentId = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.instanceId === examonId,
    )!.permanentId;

    await passTurn(s, 0, 1);
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    options.autoSelectCards = true;
    return { loop, examonId, examonPermanentId };
  }

  it("replays the exact green Lv.5 and blue Lv.5 sources through ＜Partition＞ on an opposing effect deletion", async () => {
    const options = { autoDeclineOptional: true, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_LV5, as: "greenBase" },
            { card: BLUE_LV5, as: "blueBase" },
          ],
          hand: [
            { card: GREEN_LV6, as: "greenEvo" },
            { card: BLUE_LV6, as: "blueEvo" },
            { card: "BT23-047", as: "examon" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3, PLAIN_LV3],
        },
        1: {
          battleArea: [{ card: PLAIN_LV3, as: "redBody" }],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3, PLAIN_LV3],
        },
      },
      options,
    );
    const greenLv5Id = s.perm("greenBase").topCard!.instanceId;
    const blueLv5Id = s.perm("blueBase").topCard!.instanceId;
    const greenLv6Id = s.inst("greenEvo").instanceId;
    const blueLv6Id = s.inst("blueEvo").instanceId;

    const { loop, examonId } = await dnaIntoExamonThenPassTurn(s, options);

    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard!.instanceId).sort()).toEqual(
      [greenLv5Id, blueLv5Id].sort(),
    );
    for (const permanent of s.state.players[0]!.battleArea) expect(permanent.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([greenLv6Id, blueLv6Id, examonId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger ＜Partition＞ when Examon is deleted by a battle", async () => {
    const options = { autoDeclineOptional: true, autoSelectCards: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_LV5, as: "greenBase" },
            { card: BLUE_LV5, as: "blueBase" },
          ],
          hand: [
            { card: GREEN_LV6, as: "greenEvo" },
            { card: BLUE_LV6, as: "blueEvo" },
            { card: "BT23-047", as: "examon" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3, PLAIN_LV3],
        },
        1: {
          battleArea: [{ card: PLAIN_LV4, as: "slayer", dp: 20_000 }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3, PLAIN_LV3],
        },
      },
      options,
    );
    const { loop, examonId, examonPermanentId } = await dnaIntoExamonThenPassTurn(s, options);
    expect(s.perm("slayer").isSuspended).toBe(true);
    await passTurn(s, 1, 0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: examonPermanentId,
        target: { kind: "permanent", permanentId: s.perm("slayer").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(examonId);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declines ＜Partition＞ and leaves every card in the trash", async () => {
    const options: { autoAcceptOptional?: boolean; autoDeclineOptional?: boolean; autoSelectCards?: boolean } = {
      autoDeclineOptional: true,
      autoSelectCards: true,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_LV5, as: "greenBase" },
            { card: BLUE_LV5, as: "blueBase" },
          ],
          hand: [
            { card: GREEN_LV6, as: "greenEvo" },
            { card: BLUE_LV6, as: "blueEvo" },
            { card: "BT23-047", as: "examon" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3, PLAIN_LV3],
        },
        1: {
          battleArea: [{ card: PLAIN_LV3, as: "redBody" }],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3, PLAIN_LV3],
        },
      },
      options,
    );
    const { loop } = await dnaIntoExamonThenPassTurn(s, options);
    options.autoSelectCards = false;

    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.min).toBe(0);
    expect(request.options?.max).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    options.autoSelectCards = true;
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends five opposing Digimon or Tamers on play and offers the attack, which may be declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-047", as: "examon" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
        1: {
          battleArea: [
            { card: PLAIN_LV3, as: "one" },
            { card: PLAIN_LV3_ALT, as: "two" },
            { card: PLAIN_LV4, as: "three" },
            { card: GREEN_LV5, as: "four" },
            { card: BLUE_LV5, as: "five" },
            { card: GREEN_LV6, as: "six" },
          ],
          security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const examonId = s.inst("examon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: examonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === examonId));
    await settle();

    expect(s.state.memory).toBe(-5);
    const suspended = ["one", "two", "three", "four", "five", "six"].filter((alias) => s.perm(alias).isSuspended);
    expect(suspended).toHaveLength(5);
    for (const alias of ["one", "two", "three", "four", "five", "six"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
    }
    expect(s.perm("examon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot perform the optional On Play attack without Rush", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-047", as: "examon" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
        1: {
          security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const examonId = s.inst("examon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: examonId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT23-047"));

    expect(s.perm("examon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("blocks the opponent's next unsuspend phase and releases the one after it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_LV6, as: "base" }],
          hand: [{ card: "BT23-047", as: "examon" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
        1: {
          battleArea: [{ card: PLAIN_LV3, as: "locked" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("examon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").isSuspended);
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("locked").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("trashes the Option its own attack placed and deletes a suspended opposing Digimon, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-047", as: "exa" },
            { card: PLAIN_LV3, as: "secondAttacker" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
        1: {
          battleArea: [
            { card: PLAIN_LV3, as: "suspendedVictim", suspended: true },
            { card: PLAIN_LV3_ALT, as: "standing" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
          security: [OPTION_FROM_SECURITY, PLAIN_LV4, PLAIN_LV3, PLAIN_LV3_ALT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.state.players[1]!.security[0]!.instanceId;
    const victimPermanentId = s.perm("suspendedVictim").permanentId;
    const standingPermanentId = s.perm("standing").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exa").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);
    await settle();

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === standingPermanentId)).toBe(true);
    const trashAfterFirst = s.state.players[1]!.trash.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === standingPermanentId)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(trashAfterFirst + 1);
  });

  it("resets the once-per-turn security trigger on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-047", as: "exa" },
            { card: GREEN_LV6, as: "firstAttacker" },
            { card: BLUE_LV6, as: "secondAttacker" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV4],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
        1: {
          battleArea: [
            { card: PLAIN_LV3, as: "firstVictim", suspended: true, dp: 12_000 },
            { card: PLAIN_LV3_ALT, as: "secondVictim", suspended: true, dp: 12_000 },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3, PLAIN_LV4],
          security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    const firstVictimId = s.perm("firstVictim").permanentId;
    const secondVictimId = s.perm("secondVictim").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const survivor = s.state.players[1]!.battleArea[0]!.permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: survivor, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await passTurn(s, 1, 0);

    const remaining = s.state.players[1]!.battleArea[0]!;
    expect([firstVictimId, secondVictimId]).toContain(remaining.permanentId);
    expect(remaining.isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves harmlessly when the opponent has no Option and no suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PLAIN_LV3, as: "attacker" },
            { card: "BT23-047", as: "exa" },
          ],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT],
          security: [PLAIN_LV3, PLAIN_LV3_ALT],
        },
        1: {
          battleArea: [{ card: PLAIN_LV4, as: "standing" }],
          security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const standingId = s.perm("standing").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);
    await settle();

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === standingId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores removal from the controller's own security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-047", as: "exa" },
            { card: "BT1-045", as: "yellowBody" },
          ],
          hand: [{ card: "BT4-104", as: "blindingRay" }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
          security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4],
        },
        1: {
          battleArea: [{ card: PLAIN_LV3, as: "suspended", suspended: true }],
          deck: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4, PLAIN_LV3],
          security: [PLAIN_LV3, PLAIN_LV3_ALT, PLAIN_LV4],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const suspendedId = s.perm("suspended").permanentId;
    const ownSecurityBefore = s.state.players[0]!.security.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blindingRay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === ownSecurityBefore - 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(ownSecurityBefore - 1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === suspendedId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
