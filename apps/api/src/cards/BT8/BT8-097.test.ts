import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-018.js";
import "../BT10/BT10-032.js";
import "../BT16/BT16-048.js";
import "../BT17/BT17-031.js";
import "../BT17/BT17-032.js";
import "../BT17/BT17-038.js";
import "../BT18/BT18-033.js";
import "../BT19/BT19-030.js";
import "../BT19/BT19-034.js";
import "../BT19/BT19-040.js";
import "../BT19/BT19-083.js";
import "../BT21/BT21-029.js";
import "../BT24/BT24-017.js";
import "../BT7/BT7-063.js";
import "../BT7/BT7-105.js";
import "../EX2/EX2-003.js";
import "../EX2/EX2-019.js";
import "../EX2/EX2-021.js";
import "../EX2/EX2-023.js";
import "../EX2/EX2-024.js";
import "../EX4/EX4-024.js";
import "../EX4/EX4-026.js";
import "../EX4/EX4-028.js";
import "../EX4/EX4-030.js";
import "../EX5/EX5-021.js";
import "../EX5/EX5-037.js";
import "../EX5/EX5-060.js";
import "../EX11/EX11-012.js";
import "../EX8/EX8-031.js";
import "../LM/LM-023.js";
import "../ST7/ST7-06.js";
import { compiled } from "./BT8-097.js";

describe("BT8-097 Crimson Blaze", () => {
  it("keeps the zero-floored reduction and errata order in executable IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Static",
          actions: [
            { kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 1, scaling: { unit: "cards" } },
          ],
        },
        {
          trigger: "Main",
          actions: [
            {
              kind: "RestrictPlay",
              seat: "opponent",
              mode: "play",
              byEffectOnly: true,
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
                count: "all",
              },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("reduces its use cost by each opposing Digimon and never below zero", async () => {
    const opponents = Array.from({ length: 7 }, (_, index) => ({
      card: "BT1-009",
      as: `opponent${index}`,
      dp: 7_000,
    }));
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-097", as: "option" }],
      },
      1: { battleArea: opponents },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(7);
    assertNoLoudGap(s);
  });

  it("deletes every opposing Digimon at 6000 DP or less and preserves 6001 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-097", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "below", dp: 5_999 },
          { card: "BT1-029", as: "exact", dp: 6_000 },
          { card: "BT8-023", as: "above", dp: 6_001 },
        ],
      },
    });
    s.state.memory = 3;
    const belowId = s.perm("below").permanentId;
    const exactId = s.perm("exact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === belowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === exactId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("prevents the opponent's Security effect from playing a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-097", as: "option" }],
      },
      1: {
        battleArea: [{ card: "BT8-023", dp: 7_000 }],
        security: [{ card: "ST7-06", as: "securityDigimon", faceUp: true }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityDigimon"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST7-06")).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not prevent the opponent from normally playing a Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT8-007"],
          hand: [{ card: "BT8-097", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT8-023", dp: 7_000 }],
          hand: [{ card: "ST7-06", as: "handDigimon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 7;
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("handDigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST7-06"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST7-06")).toBe(true);
    assertNoLoudGap(s);
  });
});

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function opposingDigimon(count: number, dp: number): PermanentSpec[] {
  return Array.from({ length: count }, (_, index) => ({ card: "BT1-009", as: `opposing${index}`, dp }));
}

async function useCrimsonBlaze(s: EngineSetup): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
  );
  await drainMicrotasks();
}

function opponentEffectPlayBlocked(s: EngineSetup): boolean {
  return s.engine.continuous.isPlayBlocked(1, getCardDefinition("BT1-009")!, "play", true);
}

async function useCrimsonBlazeBesideRenamon(renamonCardId: string, opposingCount: number): Promise<EngineSetup> {
  return useCrimsonBlazeWith([{ card: "BT8-007", under: [renamonCardId] }], opposingCount);
}

async function useCrimsonBlazeWith(
  ownBattleArea: (PermanentSpec | string)[],
  opposingCount: number,
  startingMemory = 10,
): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: ownBattleArea,
        hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
        deck: [...DECK],
      },
      1: { battleArea: opposingDigimon(opposingCount, 20_000), deck: [...DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = startingMemory;
  await s.ready();
  await useCrimsonBlaze(s);
  return s;
}

function totalOpposingDp(s: EngineSetup): number {
  return s.state.players[1]!.battleArea.reduce((total, permanent) => total + permanent.currentDP, 0);
}

function totalOpposingSecurityAttack(s: EngineSetup): number {
  return s.state.players[1]!.battleArea.reduce(
    (total, permanent) => total + observe(s.engine).keywordAmount(permanent, "SecurityAttack"),
    0,
  );
}

async function playMaidModeHoldingCrimsonBlaze(opposingCount: number): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "LM-023", as: "maid" },
          { card: "BT8-097", as: "crimsonBlaze" },
        ],
        security: [{ card: "BT1-009", as: "existingSecurity" }],
        deck: [...DECK],
      },
      1: { battleArea: opposingDigimon(opposingCount, 20_000), deck: [...DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "LM-023"));
  await settle();
  return s;
}

describe("BT8-097 Crimson Blaze — KB Q&A rulings", () => {
  it("reduces its use cost to 0, not below, when the opponent has 7 or more Digimon (Q1773)", async () => {
    async function memoryAfterUseAgainst(opposingCount: number): Promise<number> {
      const s = setupEngine({
        0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }] },
        1: { battleArea: opposingDigimon(opposingCount, 7_000) },
      });
      s.state.memory = 3;
      await useCrimsonBlaze(s);
      expect(s.state.players[1]!.battleArea).toHaveLength(opposingCount);
      return s.state.memory;
    }

    expect(await memoryAfterUseAgainst(8)).toBe(3);
    expect(await memoryAfterUseAgainst(5)).toBe(2);
  });

  it("sends a [Security] Digimon that would play itself at the end of the battle to the trash (Q1774)", async () => {
    async function attackIntoGeoGreymon(useBlazeFirst: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST7-07", as: "attacker" }],
            hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
          },
          1: { security: [{ card: "ST7-06", as: "geo" }], deck: [...DECK] },
        },
        { autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      if (useBlazeFirst) await useCrimsonBlaze(s);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
      await drainMicrotasks();
      return s;
    }

    const blazed = await attackIntoGeoGreymon(true);
    expect(blazed.state.players[1]!.battleArea).toHaveLength(0);
    expect(blazed.state.players[1]!.trash.map((card) => card.instanceId)).toContain(blazed.inst("geo").instanceId);

    const control = await attackIntoGeoGreymon(false);
    expect(control.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      control.inst("geo").instanceId,
    ]);
  });

  it("stops DarkKnightmon from playing SkullKnightmon and DeadlyAxemon when it deletes it (Q1775)", async () => {
    const darkKnightmon: PermanentSpec = {
      card: "BT7-063",
      as: "darkKnightmon",
      dp: 6_000,
      under: [
        { card: "BT7-058", as: "skull" },
        { card: "BT7-059", as: "deadly" },
      ],
    };
    const s = setupEngine(
      {
        0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }] },
        1: { battleArea: [darkKnightmon] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await useCrimsonBlaze(s);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("skull").instanceId, s.inst("deadly").instanceId]),
    );

    const control = setupEngine(
      { 1: { battleArea: [darkKnightmon] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(control.engine).verb.deletePermanent([control.perm("darkKnightmon").permanentId], "byEffect");
    expect(control.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "BT7-058",
      "BT7-059",
    ]);
  });

  it("activated on the opponent's turn, stops their effect plays only until the end of that turn (Q1776)", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT8-097", as: "crimsonBlaze" }], deck: [...DECK] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 9_000 },
            { card: "BT10-018", as: "deletedByBlaze" },
            { card: "BT10-018", as: "deletedNextTurn", dp: 7_000 },
          ],
          hand: [{ card: "BT10-019", as: "greymon" }],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const turnDriver = advance(s.engine);
    const greymonOnBattleArea = () =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("greymon").instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await turnDriver.waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("deletedByBlaze").instanceId);
    expect(greymonOnBattleArea()).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);

    turnDriver.endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await turnDriver.waitForMainPhase(0);
    await turnDriver.verb.deletePermanent([s.perm("deletedNextTurn").permanentId], "byEffect");
    await drainMicrotasks();

    expect(greymonOnBattleArea()).toBe(true);
    turnDriver.endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("reduced to use cost 1, it does not trigger BT10-032 Renamon's cost-2-or-more inherited effect (Q1956)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("BT10-032", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("BT10-032", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger BT17-031 Renamon's Security Attack -1 inherited effect (Q2780)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("BT17-031", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingSecurityAttack(costOne)).toBe(0);

    const costTwo = await useCrimsonBlazeBesideRenamon("BT17-031", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingSecurityAttack(costTwo)).toBe(-1);
  });

  it("reduced to use cost 1, it does not trigger BT17-038 Sakuyamon's cost-2-or-more return protection (Q2790)", async () => {
    const sakuyamon: PermanentSpec = { card: "BT17-038", as: "sakuyamon" };
    const costOne = await useCrimsonBlazeWith(["BT8-007", sakuyamon], 5);
    expect(costOne.state.memory).toBe(9);
    expect(observe(costOne.engine).isRestricted(costOne.perm("sakuyamon"), "beReturned")).toBe(false);

    const costTwo = await useCrimsonBlazeWith(["BT8-007", sakuyamon], 4);
    expect(costTwo.state.memory).toBe(8);
    expect(observe(costTwo.engine).isRestricted(costTwo.perm("sakuyamon"), "beReturned")).toBe(true);
  });

  it("reduced to use cost 1, it does not trigger EX2-003 Viximon's cost-2-or-more draw (Q3271)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX2-003", 5);
    expect(costOne.state.memory).toBe(9);
    expect(costOne.state.players[0]!.hand).toHaveLength(0);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX2-003", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(costTwo.state.players[0]!.hand).toHaveLength(1);
  });

  it("reduced to use cost 1, it does not trigger EX2-019 Renamon's cost-2-or-more memory gain (Q3307)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX2-019", 5);
    expect(costOne.state.memory).toBe(10 - 1);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX2-019", 4);
    expect(costTwo.state.memory).toBe(10 - 2 + 1);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000);
  });

  it("reduced to use cost 1, it does not trigger EX2-021 Kyubimon's cost-2-or-more -2000 DP (Q3312)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX2-021", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX2-021", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger EX2-023 Taomon's cost-2-or-more -2000 DP (Q3316)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX2-023", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX2-023", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger EX2-024 Sakuyamon's cost-2-or-more -3000 DP (Q3319)", async () => {
    const costOne = await useCrimsonBlazeWith(["BT8-007", "EX2-024"], 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeWith(["BT8-007", "EX2-024"], 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 3_000);
  });
  it("lets my Medusamon still play a [Petrification] Token for my opponent after Crimson Blaze (Q4539)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-029", as: "medusamon" }],
          hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
          deck: [...DECK],
        },
        1: {
          battleArea: [{ card: "BT10-018", as: "gaossmon" }],
          hand: [{ card: "BT10-019", as: "greymon" }],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    await useCrimsonBlaze(s);

    const opposingCardIds = s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
    expect(opposingCardIds).toEqual(["TOKEN-Petrification-Token"]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greymon").instanceId]);
    assertNoLoudGap(s);
  });

  it("stops the opponent's own effects, such as Gaossmon and TyrantKabuterimon, from playing Digimon (Q4661)", async () => {
    async function digivolveIntoTyrantKabuterimon(useBlazeFirst: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }], deck: [...DECK] },
          1: {
            battleArea: [
              { card: "BT16-045", as: "base" },
              { card: "BT10-018", as: "gaossmon" },
            ],
            hand: [
              { card: "BT16-048", as: "tyrant" },
              { card: "BT16-042", as: "insectoid" },
              { card: "BT10-019", as: "greymon" },
            ],
            deck: [...DECK],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.ready();
      if (useBlazeFirst) await useCrimsonBlaze(s);

      s.state.turnSeat = 1;
      s.state.phase = Phase.Main;
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("tyrant").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT16-048" && s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return s;
    }

    const handIds = (s: EngineSetup) => s.state.players[1]!.hand.map((card) => card.instanceId);

    const blazed = await digivolveIntoTyrantKabuterimon(true);
    expect(blazed.state.players[1]!.trash.map((card) => card.instanceId)).toContain(blazed.inst("gaossmon").instanceId);
    expect(handIds(blazed)).toEqual(
      expect.arrayContaining([blazed.inst("insectoid").instanceId, blazed.inst("greymon").instanceId]),
    );
    expect(blazed.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT16-048"]);
    assertNoLoudGap(blazed);

    const control = await digivolveIntoTyrantKabuterimon(false);
    expect(handIds(control)).not.toContain(control.inst("insectoid").instanceId);
    expect(control.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT16-042");
  });

  it("lets the opponent reveal cards from their deck but not play the specified card (Q4662)", async () => {
    async function usePrideMemoryBoost(useBlazeFirst: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }], deck: [...DECK] },
          1: {
            battleArea: [{ card: "BT7-058", as: "blackColorSource", dp: 7_000 }],
            hand: [{ card: "BT7-105", as: "prideMemoryBoost" }],
            deck: [
              { card: "BT7-058", as: "skullKnightmon" },
              { card: "BT1-009", as: "secondRevealed" },
              { card: "BT1-013", as: "thirdRevealed" },
              { card: "BT1-009", as: "notRevealed" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.ready();
      if (useBlazeFirst) await useCrimsonBlaze(s);

      s.state.turnSeat = 1;
      s.state.phase = Phase.Main;
      s.state.memory = 10;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("prideMemoryBoost").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT7-105") &&
          s.state.pendingDecision === undefined,
      );
      await drainMicrotasks();
      return s;
    }

    const skullKnightmonOnBoard = (s: EngineSetup) =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("skullKnightmon").instanceId,
      );

    const blazed = await usePrideMemoryBoost(true);
    const revealedBySeat1 = blazed.events.filter(
      (event) => event.kind === "cardRevealed" && event.seat === 1 && event.sourceCardId === "BT7-105",
    );
    expect(revealedBySeat1.map((event) => (event.kind === "cardRevealed" ? event.cardId : undefined))).toEqual([
      "BT7-058",
      "BT1-009",
      "BT1-013",
    ]);
    expect(skullKnightmonOnBoard(blazed)).toBe(false);
    expect(blazed.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(
      blazed.inst("skullKnightmon").instanceId,
    );
    expect(blazed.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        blazed.inst("skullKnightmon").instanceId,
        blazed.inst("secondRevealed").instanceId,
        blazed.inst("thirdRevealed").instanceId,
      ]),
    );
    expect(blazed.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      blazed.inst("notRevealed").instanceId,
    ]);
    assertNoLoudGap(blazed);

    const control = await usePrideMemoryBoost(false);
    expect(skullKnightmonOnBoard(control)).toBe(true);
  });

  it("lets my own Dragomon effect play my opponent's Digimon after Crimson Blaze (Q4663)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT8-007"],
          hand: [
            { card: "BT8-097", as: "crimsonBlaze" },
            { card: "EX5-060", as: "dragomon" },
          ],
          deck: [...DECK],
        },
        1: {
          battleArea: [{ card: "BT10-018", as: "gaossmon" }],
          hand: [{ card: "BT10-019", as: "greymon" }],
          trash: [{ card: "EX5-056", as: "syakomon" }],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    await useCrimsonBlaze(s);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greymon").instanceId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX5-060") &&
        s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("syakomon").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("stops the opponent's Dragomon effect from playing my Digimon after I use Crimson Blaze (Q4664)", async () => {
    async function opponentPlaysDragomon(useBlazeFirst: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: {
            battleArea: ["BT8-007"],
            hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
            trash: [{ card: "EX5-056", as: "mySyakomon" }],
            deck: [...DECK],
          },
          1: { hand: [{ card: "EX5-060", as: "dragomon" }], deck: [...DECK] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.ready();
      if (useBlazeFirst) await useCrimsonBlaze(s);

      s.state.turnSeat = 1;
      s.state.phase = Phase.Main;
      s.state.memory = 10;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX5-060") &&
          s.state.pendingDecision === undefined,
      );
      await drainMicrotasks();
      return s;
    }

    const mySyakomonOnBoard = (s: EngineSetup) =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("mySyakomon").instanceId,
      );

    const blazed = await opponentPlaysDragomon(true);
    expect(mySyakomonOnBoard(blazed)).toBe(false);
    expect(blazed.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      blazed.inst("mySyakomon").instanceId,
    );
    assertNoLoudGap(blazed);

    const control = await opponentPlaysDragomon(false);
    expect(mySyakomonOnBoard(control)).toBe(true);
  });

  it("reduced to use cost 1, it does not trigger BT17-032 Kyubimon's cost-2-or-more Security Attack -1 (Q5454)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("BT17-032", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingSecurityAttack(costOne)).toBe(0);

    const costTwo = await useCrimsonBlazeBesideRenamon("BT17-032", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingSecurityAttack(costTwo)).toBe(-1);
  });

  it("reduced to use cost 1, it does not trigger BT19-030 Renamon's cost-2-or-more -2000 DP (Q5461)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("BT19-030", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("BT19-030", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger BT19-034 Kyubimon's cost-2-or-more -2000 DP (Q5466)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("BT19-034", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("BT19-034", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger BT19-040 Sakuyamon's cost-2-or-more [Pipe Fox] Token (Q5471)", async () => {
    const pipeFoxTokens = (s: EngineSetup) =>
      s.state.players[0]!.battleArea.filter((permanent) => !["BT8-007", "BT19-040"].includes(permanent.topCard.cardId))
        .length;

    const costOne = await useCrimsonBlazeWith(["BT8-007", "BT19-040"], 5);
    expect(costOne.state.memory).toBe(9);
    expect(pipeFoxTokens(costOne)).toBe(0);

    const costTwo = await useCrimsonBlazeWith(["BT8-007", "BT19-040"], 4);
    expect(costTwo.state.memory).toBe(8);
    expect(pipeFoxTokens(costTwo)).toBe(1);
  });

  it("reduced to use cost 1, it does not trigger BT19-083 Rika Nonaka's cost-2-or-more suspend for memory (Q5476)", async () => {
    const rika: PermanentSpec = { card: "BT19-083", as: "rika" };
    const costOne = await useCrimsonBlazeWith(["BT8-007", rika], 5);
    expect(costOne.state.memory).toBe(10 - 1);
    expect(costOne.perm("rika").isSuspended).toBe(false);

    const costTwo = await useCrimsonBlazeWith(["BT8-007", rika], 4);
    expect(costTwo.state.memory).toBe(10 - 2 + 1);
    expect(costTwo.perm("rika").isSuspended).toBe(true);
  });

  it("reduced to use cost 1, it does not trigger EX4-024 Renamon's cost-2-or-more memory gain (Q5488)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX4-024", 5);
    expect(costOne.state.memory).toBe(10 - 1);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX4-024", 4);
    expect(costTwo.state.memory).toBe(10 - 2 + 1);
  });

  it("reduced to use cost 1, it does not trigger EX4-026 Youkomon's cost-2-or-more -2000 DP (Q5492)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX4-026", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX4-026", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger EX4-028 Doumon's inherited -2000 DP (Q5496)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX4-028", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX4-028", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 1, it does not trigger EX4-030 Kuzuhamon's play from digivolution cards (Q5500)", async () => {
    const kuzuhamon: PermanentSpec = { card: "EX4-030", as: "kuzuhamon", under: ["BT1-047"] };
    const tinkermonInPlay = (s: EngineSetup) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-047");

    const costOne = await useCrimsonBlazeWith(["BT8-007", kuzuhamon], 5);
    expect(costOne.state.memory).toBe(9);
    expect(tinkermonInPlay(costOne)).toBe(false);
    expect(costOne.perm("kuzuhamon").stack.map((card) => card.cardId)).toContain("BT1-047");

    const costTwo = await useCrimsonBlazeWith(["BT8-007", kuzuhamon], 4);
    expect(costTwo.state.memory).toBe(8);
    expect(tinkermonInPlay(costTwo)).toBe(true);
  });

  it("reduced to use cost 0, it does not trigger EX5-021 Majiramon's cost-1-or-more memory gain (Q5504)", async () => {
    const costZero = await useCrimsonBlazeWith(["BT8-007", "EX5-021"], 6, 5);
    expect(costZero.state.memory).toBe(5);

    const costOne = await useCrimsonBlazeWith(["BT8-007", "EX5-021"], 5, 5);
    expect(costOne.state.memory).toBe(5 - 1 + 1);
  });

  it("reduced to use cost 0, it does not trigger EX5-037 Vajramon's cost-1-or-more memory gain (Q5508)", async () => {
    const costZero = await useCrimsonBlazeWith(["BT8-007", "EX5-037"], 6, 5);
    expect(costZero.state.memory).toBe(5);

    const costOne = await useCrimsonBlazeWith(["BT8-007", "EX5-037"], 5, 5);
    expect(costOne.state.memory).toBe(5 - 1 + 1);
  });

  it("reduced to use cost 1, it does not trigger EX8-031 Renamon (X Antibody)'s inherited -2000 DP (Q5513)", async () => {
    const costOne = await useCrimsonBlazeBesideRenamon("EX8-031", 5);
    expect(costOne.state.memory).toBe(9);
    expect(totalOpposingDp(costOne)).toBe(5 * 20_000);

    const costTwo = await useCrimsonBlazeBesideRenamon("EX8-031", 4);
    expect(costTwo.state.memory).toBe(8);
    expect(totalOpposingDp(costTwo)).toBe(4 * 20_000 - 2_000);
  });

  it("reduced to use cost 5, LM-023 Sakuyamon: Maid Mode can place it on top of security (Q5516)", async () => {
    const useCostFive = await playMaidModeHoldingCrimsonBlaze(1);
    const blazeId = useCostFive.inst("crimsonBlaze").instanceId;
    expect(useCostFive.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      blazeId,
      useCostFive.inst("existingSecurity").instanceId,
    ]);
    expect(useCostFive.state.players[0]!.hand.some((card) => card.instanceId === blazeId)).toBe(false);

    const useCostSix = await playMaidModeHoldingCrimsonBlaze(0);
    const heldBlazeId = useCostSix.inst("crimsonBlaze").instanceId;
    expect(useCostSix.state.players[0]!.security.some((card) => card.instanceId === heldBlazeId)).toBe(false);
    expect(useCostSix.state.players[0]!.hand.some((card) => card.instanceId === heldBlazeId)).toBe(true);
  });

  it("lets my BT24-017 Medusamon [When Digivolving] still play [Petrification] Tokens for my opponent after Crimson Blaze (Q5595)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-016", as: "base" }],
          hand: [
            { card: "BT8-097", as: "crimsonBlaze" },
            { card: "BT24-017", as: "medusamon" },
          ],
          deck: [...DECK],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 7_000 },
            { card: "BT1-010", as: "higher", dp: 8_000 },
          ],
          trash: ["BT1-009", "BT1-010"],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    await useCrimsonBlaze(s);
    const lowestId = s.perm("lowest").permanentId;
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medusamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-017" && s.state.pendingDecision === undefined);
    await drainMicrotasks();

    const opposingCardIds = s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
    expect(opposingCardIds.filter((cardId) => cardId === "TOKEN-Petrification-Token")).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(opponentEffectPlayBlocked(s)).toBe(true);
    assertNoLoudGap(s);
  });

  it("lets my EX11-012 Medusamon [End of Attack] still play a [Petrification] Token for my opponent after Crimson Blaze (Q5801)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-012", as: "medusamon" }],
          hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
          deck: [...DECK],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 7_000 }],
          trash: ["BT1-010"],
          security: ["BT1-012"],
          deck: [...DECK],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    await useCrimsonBlaze(s);
    const victimId = s.perm("victim").permanentId;
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([victimId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("medusamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token") &&
        s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "TOKEN-Petrification-Token",
    ]);
    expect(opponentEffectPlayBlocked(s)).toBe(true);
    assertNoLoudGap(s);
  });

  it("stops the opponent from playing a Digimon into their breeding area by effect (Q6238)", async () => {
    async function opponentActivatesPatamon(useBlazeFirst: boolean): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: { battleArea: ["BT8-007"], hand: [{ card: "BT8-097", as: "crimsonBlaze" }], deck: [...DECK] },
          1: {
            hand: [{ card: "BT18-033", as: "patamon" }],
            trash: [{ card: "BT1-063", as: "seraphimon" }],
            deck: [...DECK],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      await s.ready();
      if (useBlazeFirst) await useCrimsonBlaze(s);

      s.state.turnSeat = 1;
      s.state.phase = Phase.Main;
      s.state.memory = 10;
      const patamon = s.inst("patamon");
      const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(patamon)).find((effect) =>
        effect.effectKey.startsWith("BT18-033/"),
      )!.effectKey;
      s.engine.applyIntent(1, { type: "activateEffect", sourceInstanceId: patamon.instanceId, effectKey });
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return s;
    }

    const patamonInBreeding = (s: EngineSetup) =>
      s.state.players[1]!.breeding?.topCard?.instanceId === s.inst("patamon").instanceId;

    const blazed = await opponentActivatesPatamon(true);
    expect(patamonInBreeding(blazed)).toBe(false);
    expect(blazed.state.players[1]!.breeding).toBeFalsy();
    assertNoLoudGap(blazed);

    const control = await opponentActivatesPatamon(false);
    expect(patamonInBreeding(control)).toBe(true);
  });
});
