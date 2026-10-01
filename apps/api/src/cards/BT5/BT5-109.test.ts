import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../EX2/EX2-073.js";
import "../P/P-029.js";
import "../P/P-030.js";
import "../P/P-103.js";
import "./BT5-019.js";
import "./BT5-109.js";

describe("BT5-109 Mega Digimon Fusion!", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-109")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("BT5-109")?.effects[0]?.actions[0]).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "digivolve",
      amount: 6,
      once: true,
      duration: "forTheTurn",
      consumeBindAs: "digivolvedWithMegaDigimonFusion",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "eq", value: 6 },
        },
        count: "all",
      },
      into: {
        kind: ["Digimon"],
        levelComparison: { op: "eq", value: 7 },
      },
    });
    expect(runtimeCompiledCard("BT5-109")?.effects[0]?.actions[0]).toMatchObject({
      onConsume: [
        {
          kind: "Return",
          target: { fromSelectionRef: "digivolvedWithMegaDigimonFusion" },
          to: "deckBottom",
        },
      ],
    });
  });

  it("reduces the next level 6-to-7 digivolution by 6, then bottoms it and trashes its stack at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-019", as: "base", under: [{ card: "BT5-014", as: "source" }] },
            { card: "BT5-016", as: "other", under: [{ card: "BT5-014", as: "otherSource" }] },
            "BT5-086",
          ],
          hand: [
            { card: "BT5-109", as: "option" },
            { card: "BT5-086", as: "level7" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT5-019", as: "opponent", under: [{ card: "BT5-014", as: "opponentSource" }] }],
          deck: ["BT5-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const basePermanentId = s.perm("base").permanentId;
    const baseTopId = s.perm("base").topCard.instanceId;
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("level7").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.instanceId === s.inst("level7").instanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(2);
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("level7").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT5-086"]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("level7").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([baseTopId, s.inst("source").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === basePermanentId)).toBe(false);
    expect(s.perm("other").topCard.cardId).toBe("BT5-016");
    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherSource").instanceId);
    expect(s.perm("opponent").topCard.cardId).toBe("BT5-019");
    expect(s.perm("opponent").stack.map((card) => card.instanceId)).toContain(s.inst("opponentSource").instanceId);
  });

  it("consumes the reduction only once and binds the delayed cleanup to the digivolved Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-019", as: "first", under: [{ card: "BT5-014", as: "firstSource" }] },
            { card: "BT5-019", as: "second", under: [{ card: "BT5-014", as: "secondSource" }] },
            "BT5-086",
          ],
          hand: [
            { card: "BT5-109", as: "option" },
            { card: "BT5-086", as: "level7a" },
            { card: "BT5-086", as: "level7b" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT5-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("first").permanentId,
        instanceId: s.inst("level7a").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT5-086");
    expect(s.state.memory).toBe(10);
    const firstPermanentId = s.perm("first").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("second").permanentId,
        instanceId: s.inst("level7b").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT5-086");
    expect(s.state.memory).toBe(6);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstPermanentId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-086")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-013", "BT5-086"]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("level7a").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("firstSource").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("secondSource").instanceId);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-109", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});

type EndOfTurnOrderSetup = ReturnType<typeof setupEngine>;

async function playMegaDigimonFusion(s: EndOfTurnOrderSetup): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
}

async function digivolveIntoOmnimon(s: EndOfTurnOrderSetup, permanentId: string): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("omnimon").instanceId })).toEqual(
    { ok: true },
  );
  await settle(() => s.perm("base").topCard.cardId === "BT5-086" && s.state.pendingDecision === undefined);
}

const promoDeletionTrigger = "Delete this Digimon";
const fusionReturnTrigger = "return the Digimon that digivolved with this effect";

function offeredEndOfTurnChoices(s: EndOfTurnOrderSetup): string[][] {
  return s.decisions
    .filter(({ req }) => req.kind === "orderTriggers" && req.options?.triggerTimings?.includes("endOfTurn"))
    .map(({ req }) => req.options?.triggerDescriptions ?? []);
}

function expectBothEndOfTurnEffectsOffered(s: EndOfTurnOrderSetup): void {
  expect(offeredEndOfTurnChoices(s)).toEqual([
    expect.arrayContaining([
      expect.stringContaining(promoDeletionTrigger),
      expect.stringContaining(fusionReturnTrigger),
    ]),
  ]);
}

async function agunimonThenMegaDigimonFusion(firstTrigger: string) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "P-029", as: "base" },
          { card: "BT5-086", as: "whiteEnabler" },
        ],
        hand: [
          { card: "BT5-109", as: "option" },
          { card: "BT4-113", as: "ancientGreymon" },
          { card: "BT5-086", as: "omnimon" },
        ],
        deck: ["BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009", "BT1-009"] },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
      preferTriggerKeys: [firstTrigger],
    },
  );
  preferred.push(s.inst("ancientGreymon").instanceId);
  s.state.memory = 10;
  const permanentId = s.perm("base").permanentId;
  await playMegaDigimonFusion(s);

  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("base").topCard.cardId === "BT4-113" &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
  );
  await settle();
  expect(s.state.memory).toBe(8);

  await digivolveIntoOmnimon(s, permanentId);
  expect(s.state.memory).toBe(8);

  await advance(s.engine).fireSubTrigger("endOfTurn");
  await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));
  return s;
}

async function lobomonThenMegaDigimonFusion(firstTrigger: string) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-027", as: "base" },
          { card: "BT5-086", as: "whiteEnabler" },
        ],
        hand: [
          { card: "BT5-109", as: "option" },
          { card: "P-030", as: "lobomon" },
          { card: "BT4-114", as: "ancientGarurumon" },
          { card: "BT5-086", as: "omnimon" },
        ],
        deck: ["BT1-010", "BT1-011"],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
      preferTriggerKeys: [firstTrigger],
    },
  );
  preferred.push(s.inst("ancientGarurumon").instanceId);
  s.state.memory = 10;
  const permanentId = s.perm("base").permanentId;
  await playMegaDigimonFusion(s);

  expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("lobomon").instanceId })).toEqual(
    { ok: true },
  );
  await settle(() => s.perm("base").topCard.cardId === "BT4-114" && s.state.pendingDecision === undefined);
  const memoryBeforeOmnimon = s.state.memory;

  await digivolveIntoOmnimon(s, permanentId);
  expect(s.state.memory).toBe(memoryBeforeOmnimon);

  await advance(s.engine).fireSubTrigger("endOfTurn");
  await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));
  return s;
}

function omnimonLocation(s: EndOfTurnOrderSetup): "deckBottom" | "trash" | "elsewhere" {
  const omnimonId = s.inst("omnimon").instanceId;
  if (s.state.players[0]!.deck.at(-1)?.instanceId === omnimonId) return "deckBottom";
  if (s.state.players[0]!.trash.some((card) => card.instanceId === omnimonId)) return "trash";
  return "elsewhere";
}

describe("BT5-109 Mega Digimon Fusion! — KB Q&A rulings", () => {
  it("reduces a level 6-to-7 digivolution that another card's effect performs (Q1383)", async () => {
    async function delayDigivolveIntoGallantmon(withFusion: boolean): Promise<EndOfTurnOrderSetup> {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "P-103", as: "delay" },
              { card: "BT5-019", as: "base", under: [{ card: "BT5-014", as: "source" }] },
              { card: "BT5-086", as: "whiteEnabler" },
            ],
            hand: [...(withFusion ? [{ card: "BT5-109", as: "option" }] : []), { card: "EX2-073", as: "gallantmon" }],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("base").topCard.instanceId, s.inst("gallantmon").instanceId);
      s.state.memory = 10;
      s.state.turnCount = 1;
      await s.ready();
      if (withFusion) await playMegaDigimonFusion(s);
      const delayAbility = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("delay").instanceId,
          effectKey: delayAbility[0]!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX2-073" && s.state.pendingDecision === undefined);
      return s;
    }

    const withoutFusion = await delayDigivolveIntoGallantmon(false);
    expect(withoutFusion.state.memory).toBe(6);

    const withFusion = await delayDigivolveIntoGallantmon(true);
    expect(withFusion.state.memory).toBe(10);
    const permanentId = withFusion.perm("base").permanentId;
    await advance(withFusion.engine).fireSubTrigger("endOfTurn");
    await settle(
      () => !withFusion.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId),
    );
    expect(withFusion.state.players[0]!.deck.at(-1)!.instanceId).toBe(withFusion.inst("gallantmon").instanceId);
  });

  it("lets the player order P-029's end-of-turn deletion and its bottom-deck return, and the first one wins (Q4139)", async () => {
    const returnedFirst = await agunimonThenMegaDigimonFusion(fusionReturnTrigger);
    expectBothEndOfTurnEffectsOffered(returnedFirst);
    expect(omnimonLocation(returnedFirst)).toBe("deckBottom");

    const deletedFirst = await agunimonThenMegaDigimonFusion(promoDeletionTrigger);
    expectBothEndOfTurnEffectsOffered(deletedFirst);
    expect(omnimonLocation(deletedFirst)).toBe("trash");
  });

  it("lets the player order P-030's end-of-turn deletion and its bottom-deck return, and the first one wins (Q4142)", async () => {
    const returnedFirst = await lobomonThenMegaDigimonFusion(fusionReturnTrigger);
    expectBothEndOfTurnEffectsOffered(returnedFirst);
    expect(omnimonLocation(returnedFirst)).toBe("deckBottom");

    const deletedFirst = await lobomonThenMegaDigimonFusion(promoDeletionTrigger);
    expectBothEndOfTurnEffectsOffered(deletedFirst);
    expect(omnimonLocation(deletedFirst)).toBe("trash");
  });
});
