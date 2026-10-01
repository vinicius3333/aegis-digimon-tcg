import { describe, expect, it } from "vitest";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-032.js";
import "../BT11/BT11-108.js";
import "../BT17/BT17-031.js";
import "../BT17/BT17-032.js";
import "../BT17/BT17-038.js";
import "../BT19/BT19-030.js";
import "../BT19/BT19-034.js";
import "../BT19/BT19-040.js";
import "../BT19/BT19-083.js";
import "../BT6/BT6-112.js";
import "../BT7/BT7-100.js";
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
import "../EX8/EX8-031.js";
import "../LM/LM-023.js";
import "./BT2-099.js";

const YELLOW_TAMER = "BT1-087";
const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function yellowTamers(count: number): string[] {
  return Array.from({ length: count }, () => YELLOW_TAMER);
}

async function useGloriousBurstBeside(watcher: PermanentSpec, tamerCount: number, startingMemory = 10) {
  const s = setupEngine(
    {
      0: {
        battleArea: [...yellowTamers(tamerCount), watcher],
        hand: [{ card: "BT2-099", as: "burst" }],
        deck: [...DECK],
      },
      1: { battleArea: [{ card: "BT2-050", as: "target", dp: 20000 }], deck: [...DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = startingMemory;
  await s.ready();
  const burstId = s.inst("burst").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: burstId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === burstId));
  await settle();
  return s;
}

const TAMERS_FOR_USE_COST_ZERO = 9;
const TAMERS_FOR_USE_COST_ONE = 8;
const TAMERS_FOR_USE_COST_TWO = 7;
const DP_AFTER_BURST_ONLY = 8000;
const MEMORY_BELOW_CAP = 5;

async function useGloriousBurstAtCostOneAndTwoBeside(watcher: PermanentSpec) {
  const costOne = await useGloriousBurstBeside(watcher, TAMERS_FOR_USE_COST_ONE);
  const costTwo = await useGloriousBurstBeside(watcher, TAMERS_FOR_USE_COST_TWO);
  return {
    memoryAfterCostOne: costOne.state.memory,
    dpAfterCostOne: costOne.perm("target").currentDP,
    memoryAfterCostTwo: costTwo.state.memory,
    dpAfterCostTwo: costTwo.perm("target").currentDP,
  };
}

async function playBeelStarmonHolding(option: string, board: { battleArea: string[]; security?: number }) {
  const s = setupEngine(
    {
      0: {
        battleArea: board.battleArea,
        hand: [
          { card: "BT6-112", as: "beelstarmon" },
          { card: option, as: "option" },
        ],
        deck: [...DECK],
        security: board.security ?? 5,
      },
      1: { battleArea: [{ card: "BT2-050", as: "target", dp: 20000 }], deck: [...DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 12;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstarmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-112"));
  await settle();
  return s;
}

function optionStayedInHand(s: Awaited<ReturnType<typeof playBeelStarmonHolding>>, option: string): boolean {
  return (
    s.state.players[0]!.hand.some((card) => card.cardId === option) &&
    !s.state.players[0]!.trash.some((card) => card.cardId === option)
  );
}

async function playMaidModeHoldingGloriousBurst(tamerCount: number) {
  const s = setupEngine(
    {
      0: {
        battleArea: yellowTamers(tamerCount),
        hand: [
          { card: "LM-023", as: "maid" },
          { card: "BT2-099", as: "burst" },
        ],
        deck: [...DECK],
      },
      1: { deck: [...DECK] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-023"));
  await settle();
  return s;
}

describe("BT2-099 Glorious Burst", () => {
  it("reduces its use cost by 1 for each yellow Tamer in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-087", "BT1-087"], hand: [{ card: "BT2-099", as: "option" }] },
        1: { battleArea: [{ card: "BT2-050", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));
    expect(s.state.memory).toBe(3);
  });

  it("pays the full 9 memory with no yellow Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-099", as: "option" }] },
        1: { battleArea: [{ card: "BT1-062", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));

    expect(s.state.memory).toBe(0);
  });

  it("counts only the controller's yellow Tamers for the use-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-087", "BT2-085", "BT2-033"],
          hand: [{ card: "BT2-099", as: "option" }],
        },
        1: { battleArea: ["BT1-087", { card: "BT1-062", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-099"));

    expect(s.state.memory).toBe(1);
  });

  it("reduces an opposing Digimon by 12000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-033", "BT2-087"], hand: [{ card: "BT2-099", as: "option" }] },
        1: { battleArea: [{ card: "BT2-045", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("applies the full -12000 DP to exactly one selected opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-099", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-083", as: "first", dp: 13000 },
          { card: "BT2-083", as: "second", dp: 13000 },
        ],
      },
    });
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 1000);

    expect(s.perm("first").currentDP).toBe(1000);
    expect(s.perm("second").currentDP).toBe(13000);
  });
});

describe("BT2-099 Glorious Burst — KB Q&A rulings", () => {
  it("BeelStarmon uses Glorious Burst reduced to cost 7, but not Options whose cost only changes on use (Q1501)", async () => {
    const qualialiseAtSevenSecurity = await playBeelStarmonHolding("BT7-100", { battleArea: [], security: 7 });
    expect(optionStayedInHand(qualialiseAtSevenSecurity, "BT7-100")).toBe(true);
    expect(qualialiseAtSevenSecurity.perm("target").currentDP).toBe(20000);

    const dgDimensionWithBlackTamer = await playBeelStarmonHolding("BT11-108", { battleArea: ["BT11-093"] });
    expect(optionStayedInHand(dgDimensionWithBlackTamer, "BT11-108")).toBe(true);

    const burstWithOneTamer = await playBeelStarmonHolding("BT2-099", { battleArea: yellowTamers(1) });
    expect(optionStayedInHand(burstWithOneTamer, "BT2-099")).toBe(true);
    expect(burstWithOneTamer.perm("target").currentDP).toBe(20000);

    const burstWithTwoTamers = await playBeelStarmonHolding("BT2-099", { battleArea: yellowTamers(2) });
    expect(burstWithTwoTamers.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT2-099");
    expect(burstWithTwoTamers.perm("target").currentDP).toBe(8000);
    expect(burstWithTwoTamers.state.memory).toBe(0);
  });

  it("reduced to use cost 1, it does not trigger BT10-032 Renamon's cost-2-or-more inherited effect (Q1956)", async () => {
    const renamonWatcher: PermanentSpec = { card: "BT2-033", under: ["BT10-032"] };

    const costOne = await useGloriousBurstBeside(renamonWatcher, 8);
    expect(costOne.state.memory).toBe(9);
    expect(costOne.perm("target").currentDP).toBe(8000);

    const costTwo = await useGloriousBurstBeside(renamonWatcher, 7);
    expect(costTwo.state.memory).toBe(8);
    expect(costTwo.perm("target").currentDP).toBe(6000);
  });

  it("reduced to use cost 1, it does not trigger BT17-031 Renamon's Security Attack -1 inherited effect (Q2780)", async () => {
    const renamonWatcher: PermanentSpec = { card: "BT2-033", under: ["BT17-031"] };

    const costOne = await useGloriousBurstBeside(renamonWatcher, 8);
    expect(costOne.state.memory).toBe(9);
    expect(observe(costOne.engine).keywordAmount(costOne.perm("target"), "SecurityAttack")).toBe(0);

    const costTwo = await useGloriousBurstBeside(renamonWatcher, 7);
    expect(costTwo.state.memory).toBe(8);
    expect(observe(costTwo.engine).keywordAmount(costTwo.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("reduced to use cost 1, it does not trigger BT17-038 Sakuyamon's return protection (Q2790)", async () => {
    const sakuyamon: PermanentSpec = { card: "BT17-038", as: "sakuyamon" };

    const costOne = await useGloriousBurstBeside(sakuyamon, 8);
    expect(costOne.state.memory).toBe(9);
    expect(observe(costOne.engine).isRestricted(costOne.perm("sakuyamon"), "beReturned")).toBe(false);

    const costTwo = await useGloriousBurstBeside(sakuyamon, 7);
    expect(costTwo.state.memory).toBe(8);
    expect(observe(costTwo.engine).isRestricted(costTwo.perm("sakuyamon"), "beReturned")).toBe(true);
  });

  it("reduced to use cost 1, it does not trigger EX2-003 Viximon's inherited draw (Q3271)", async () => {
    const viximonWatcher: PermanentSpec = { card: "BT2-033", under: ["EX2-003"] };

    const costOne = await useGloriousBurstBeside(viximonWatcher, 8);
    expect(costOne.state.memory).toBe(9);
    expect(costOne.state.players[0]!.hand).toHaveLength(0);

    const costTwo = await useGloriousBurstBeside(viximonWatcher, 7);
    expect(costTwo.state.memory).toBe(8);
    expect(costTwo.state.players[0]!.hand).toHaveLength(1);
  });

  it("reduced to use cost 1, it does not trigger EX2-019 Renamon's inherited memory gain (Q3307)", async () => {
    const renamonWatcher: PermanentSpec = { card: "BT2-033", under: ["EX2-019"] };

    const costOne = await useGloriousBurstBeside(renamonWatcher, 8);
    expect(costOne.state.memory).toBe(9);
    expect(costOne.perm("target").currentDP).toBe(8000);

    const costTwo = await useGloriousBurstBeside(renamonWatcher, 7);
    expect(costTwo.state.memory).toBe(9);
    expect(costTwo.perm("target").currentDP).toBe(8000);
  });

  it("reduced to use cost 1, it does not trigger EX2-021 Kyubimon's inherited -2000 DP (Q3312)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["EX2-021"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 1, it does not trigger EX2-023 Taomon's inherited -2000 DP (Q3316)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["EX2-023"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 1, it does not trigger EX2-024 Sakuyamon's [Your Turn] -3000 DP (Q3319)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "EX2-024" });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 3000,
    });
  });

  it("reduced to use cost 1, it does not trigger BT17-032 Kyubimon's Security Attack -1 inherited effect (Q5454)", async () => {
    const kyubimonWatcher: PermanentSpec = { card: "BT2-033", under: ["BT17-032"] };

    const costOne = await useGloriousBurstBeside(kyubimonWatcher, TAMERS_FOR_USE_COST_ONE);
    expect(costOne.state.memory).toBe(9);
    expect(observe(costOne.engine).keywordAmount(costOne.perm("target"), "SecurityAttack")).toBe(0);

    const costTwo = await useGloriousBurstBeside(kyubimonWatcher, TAMERS_FOR_USE_COST_TWO);
    expect(costTwo.state.memory).toBe(8);
    expect(observe(costTwo.engine).keywordAmount(costTwo.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("reduced to use cost 1, it does not trigger BT19-030 Renamon's inherited -2000 DP (Q5461)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["BT19-030"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 1, it does not trigger BT19-034 Kyubimon's inherited -2000 DP (Q5466)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["BT19-034"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 1, it does not trigger BT19-040 Sakuyamon's Pipe Fox token (Q5471)", async () => {
    const sakuyamon: PermanentSpec = { card: "BT19-040" };
    const pipeFoxTokens = (s: Awaited<ReturnType<typeof useGloriousBurstBeside>>) =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "TOKEN-Pipe-Fox");

    const costOne = await useGloriousBurstBeside(sakuyamon, TAMERS_FOR_USE_COST_ONE);
    expect(costOne.state.memory).toBe(9);
    expect(pipeFoxTokens(costOne)).toHaveLength(0);

    const costTwo = await useGloriousBurstBeside(sakuyamon, TAMERS_FOR_USE_COST_TWO);
    expect(costTwo.state.memory).toBe(8);
    expect(pipeFoxTokens(costTwo)).toHaveLength(1);
  });

  it("reduced to use cost 1, it does not trigger BT19-083 Rika Nonaka's suspend-to-gain-memory effect (Q5476)", async () => {
    // Rika is a yellow Tamer herself, so she also counts toward the use-cost reduction.
    const rika: PermanentSpec = { card: "BT19-083", as: "rika" };

    const costOne = await useGloriousBurstBeside(rika, TAMERS_FOR_USE_COST_ONE - 1);
    expect(costOne.state.memory).toBe(9);
    expect(costOne.perm("rika").isSuspended).toBe(false);

    const costTwo = await useGloriousBurstBeside(rika, TAMERS_FOR_USE_COST_TWO - 1);
    expect(costTwo.perm("rika").isSuspended).toBe(true);
    expect(costTwo.state.memory).toBe(9);
  });

  it("reduced to use cost 1, it does not trigger EX4-024 Renamon's inherited memory gain (Q5488)", async () => {
    const renamonWatcher: PermanentSpec = { card: "BT2-033", under: ["EX4-024"] };

    const costOne = await useGloriousBurstBeside(renamonWatcher, TAMERS_FOR_USE_COST_ONE);
    expect(costOne.state.memory).toBe(9);
    expect(costOne.perm("target").currentDP).toBe(DP_AFTER_BURST_ONLY);

    const costTwo = await useGloriousBurstBeside(renamonWatcher, TAMERS_FOR_USE_COST_TWO);
    expect(costTwo.state.memory).toBe(9);
    expect(costTwo.perm("target").currentDP).toBe(DP_AFTER_BURST_ONLY);
  });

  it("reduced to use cost 1, it does not trigger EX4-026 Youkomon's inherited -2000 DP (Q5492)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["EX4-026"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 1, it does not trigger EX4-028 Doumon's inherited -2000 DP (Q5496)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["EX4-028"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 1, it does not trigger EX4-030 Kuzuhamon's play from digivolution cards (Q5500)", async () => {
    const kuzuhamon: PermanentSpec = { card: "EX4-030", as: "kuzuhamon", under: ["BT1-047"] };
    const tinkermonInPlay = (s: Awaited<ReturnType<typeof useGloriousBurstBeside>>) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-047");

    const costOne = await useGloriousBurstBeside(kuzuhamon, TAMERS_FOR_USE_COST_ONE);
    expect(costOne.state.memory).toBe(9);
    expect(tinkermonInPlay(costOne)).toBe(false);
    expect(costOne.perm("kuzuhamon").stack.map((card) => card.cardId)).toContain("BT1-047");

    const costTwo = await useGloriousBurstBeside(kuzuhamon, TAMERS_FOR_USE_COST_TWO);
    expect(costTwo.state.memory).toBe(8);
    expect(tinkermonInPlay(costTwo)).toBe(true);
  });

  it("reduced to use cost 0, it does not trigger EX5-021 Majiramon's cost-1-or-more memory gain (Q5504)", async () => {
    const majiramon: PermanentSpec = { card: "EX5-021" };

    const costZero = await useGloriousBurstBeside(majiramon, TAMERS_FOR_USE_COST_ZERO, MEMORY_BELOW_CAP);
    expect(costZero.state.memory).toBe(MEMORY_BELOW_CAP);
    expect(costZero.perm("target").currentDP).toBe(DP_AFTER_BURST_ONLY);

    const costOne = await useGloriousBurstBeside(majiramon, TAMERS_FOR_USE_COST_ONE, MEMORY_BELOW_CAP);
    expect(costOne.state.memory).toBe(MEMORY_BELOW_CAP - 1 + 1);
    expect(costOne.perm("target").currentDP).toBe(DP_AFTER_BURST_ONLY);
  });

  it("reduced to use cost 0, it does not trigger EX5-037 Vajramon's cost-1-or-more memory gain (Q5508)", async () => {
    const vajramon: PermanentSpec = { card: "EX5-037" };

    const costZero = await useGloriousBurstBeside(vajramon, TAMERS_FOR_USE_COST_ZERO, MEMORY_BELOW_CAP);
    expect(costZero.state.memory).toBe(MEMORY_BELOW_CAP);
    expect(costZero.perm("target").currentDP).toBe(DP_AFTER_BURST_ONLY);

    const costOne = await useGloriousBurstBeside(vajramon, TAMERS_FOR_USE_COST_ONE, MEMORY_BELOW_CAP);
    expect(costOne.state.memory).toBe(MEMORY_BELOW_CAP - 1 + 1);
    expect(costOne.perm("target").currentDP).toBe(DP_AFTER_BURST_ONLY);
  });

  it("reduced to use cost 1, it does not trigger EX8-031 Renamon (X Antibody)'s inherited -2000 DP (Q5513)", async () => {
    const outcome = await useGloriousBurstAtCostOneAndTwoBeside({ card: "BT2-033", under: ["EX8-031"] });
    expect(outcome).toEqual({
      memoryAfterCostOne: 9,
      dpAfterCostOne: DP_AFTER_BURST_ONLY,
      memoryAfterCostTwo: 8,
      dpAfterCostTwo: DP_AFTER_BURST_ONLY - 2000,
    });
  });

  it("reduced to use cost 5, LM-023 Sakuyamon: Maid Mode can place it on top of security (Q5516)", async () => {
    const useCostFive = await playMaidModeHoldingGloriousBurst(4);
    const burstId = useCostFive.inst("burst").instanceId;
    expect(useCostFive.state.players[0]!.security.at(0)?.instanceId).toBe(burstId);
    expect(useCostFive.state.players[0]!.hand.some((card) => card.instanceId === burstId)).toBe(false);

    const useCostSix = await playMaidModeHoldingGloriousBurst(3);
    const heldBurstId = useCostSix.inst("burst").instanceId;
    expect(useCostSix.state.players[0]!.security.some((card) => card.instanceId === heldBurstId)).toBe(false);
    expect(useCostSix.state.players[0]!.hand.some((card) => card.instanceId === heldBurstId)).toBe(true);
  });
});
