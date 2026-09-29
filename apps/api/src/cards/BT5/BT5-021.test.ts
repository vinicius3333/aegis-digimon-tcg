import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-021.js";
import "../BT2/BT2-111.js";
import "../BT3/BT3-054.js";
import "../BT3/BT3-103.js";
import "../BT1/BT1-110.js";
import "../BT26/BT26-091.js";
import "../EX12/EX12-066.js";
import "../EX12/EX12-067.js";
import "../EX12/EX12-068.js";

describe("BT5-021 Syakomon", () => {
  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
    expect((s.engine as any).continuous.blocksCostReduction(1, "play")).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(false);
  });

  it("prevents an opponent's Digisorption reduction during a real digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] },
        1: {
          battleArea: [
            { card: "BT1-072", as: "base" },
            { card: "BT1-072", as: "suspendCost", suspended: true },
          ],
          hand: [{ card: "BT3-054", as: "blossomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -10;
    await s.ready();
    await (s.engine as any).recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blossomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-072");
    expect(s.perm("suspendCost").isSuspended).toBe(true);
  });

  it("does not apply while Syakomon is only a digivolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-023", as: "host", under: ["BT5-021"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await (s.engine as any).recomputeContinuousEffects();

    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(false);
  });

  it("does not suppress an explicitly fixed-cost effect digivolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] },
      1: { battleArea: [{ card: "BT1-072", as: "base" }], hand: [{ card: "BT3-054", as: "blossomon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await s.ready();
    await (s.engine as any).recomputeContinuousEffects();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("blossomon").instanceId, {
      costOverride: 1,
      ignoreRequirements: true,
      payCost: true,
    });
    expect(s.perm("base").topCard.cardId).toBe("BT3-054");
  });
});

type Seat = 0 | 1;

interface RestrictedDigivolveOutcome {
  digivolved: boolean;
  memoryPaid: number;
  suspendedForReduction: boolean;
}

async function digivolveWithHiddenPotential(syakomonSeat: Seat): Promise<RestrictedDigivolveOutcome> {
  const preferred: string[] = [];
  const syakomon = [{ card: "BT5-021" }];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT3-054", as: "base" },
          { card: "BT3-044", as: "payer" },
          ...(syakomonSeat === 0 ? syakomon : []),
        ],
        hand: [
          { card: "BT3-103", as: "option" },
          { card: "BT3-057", as: "evolving" },
        ],
        security: 5,
      },
      1: { battleArea: syakomonSeat === 1 ? syakomon : [], security: 5 },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("payer").topCard.instanceId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-103"));
  const memoryBefore = s.state.memory;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === "BT3-057");
  await drainMicrotasks();
  return {
    digivolved: s.perm("base").topCard.cardId === "BT3-057",
    memoryPaid: memoryBefore - s.state.memory,
    suspendedForReduction: s.perm("payer").isSuspended,
  };
}

async function digivolveWithDigisorption(syakomonSeat: Seat): Promise<RestrictedDigivolveOutcome> {
  const syakomon = [{ card: "BT5-021" }];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-072", as: "base" },
          { card: "BT1-072", as: "payer" },
          ...(syakomonSeat === 0 ? syakomon : []),
        ],
        hand: [{ card: "BT3-054", as: "blossomon" }],
        security: 5,
      },
      1: { battleArea: syakomonSeat === 1 ? syakomon : [], security: 5 },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("blossomon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === "BT3-054");
  await drainMicrotasks();
  return {
    digivolved: s.perm("base").topCard.cardId === "BT3-054",
    memoryPaid: 5 - s.state.memory,
    suspendedForReduction: s.perm("payer").isSuspended || s.perm("base").isSuspended,
  };
}

interface ContinuousEffectsProbe {
  recomputeContinuousEffects(): Promise<void>;
  continuous: { blocksCostReduction(seat: Seat, costType: "digivolve" | "play"): boolean };
}

async function digivolveBeelzemonFromImpmon(syakomonSeat: Seat) {
  const syakomon = [{ card: "BT5-021" }];
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT2-068", as: "impmon" }, ...(syakomonSeat === 0 ? syakomon : [])],
      hand: [{ card: "BT2-111", as: "beelzemon" }],
      trash: Array.from({ length: 10 }, (_, index) => ({ card: `BT1-${String(index + 1).padStart(3, "0")}` })),
    },
    1: { battleArea: syakomonSeat === 1 ? syakomon : [] },
  });
  s.state.memory = 5;
  await s.ready();
  const probe = s.engine as unknown as ContinuousEffectsProbe;
  await probe.recomputeContinuousEffects();
  const reductionBlocked = probe.continuous.blocksCostReduction(0, "digivolve");
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("impmon").permanentId,
    instanceId: s.inst("beelzemon").instanceId,
  });
  await settle(() => s.perm("impmon").topCard.cardId === "BT2-111");
  return { reductionBlocked, result, topCardId: s.perm("impmon").topCard.cardId, memoryPaid: 5 - s.state.memory };
}

interface AttackTamerScenario {
  tamer: string;
  attacker: string;
  target: string;
}

async function digivolveThroughAttackTamer(scenario: AttackTamerScenario, syakomonSeat: Seat) {
  const syakomon = [{ card: "BT5-021" }];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: scenario.tamer, as: "tamer" },
          { card: scenario.attacker, as: "attacker" },
          ...(syakomonSeat === 0 ? syakomon : []),
        ],
        hand: [{ card: scenario.target, as: "target" }],
      },
      1: { battleArea: syakomonSeat === 1 ? syakomon : [], security: 5 },
    },
    { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
  );
  await s.ready();
  s.state.memory = 5;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("attacker").topCard?.cardId === scenario.target, 160);

  return {
    tamerSuspended: s.perm("tamer").isSuspended,
    digivolved: s.perm("attacker").topCard?.cardId === scenario.target,
    memoryPaid: 5 - s.state.memory,
  };
}

async function digivolveThroughYoshino(syakomonSeat: Seat) {
  const preferred: string[] = [];
  const syakomon = [{ card: "BT5-021" }];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT26-091", as: "yoshino" },
          { card: "BT1-064", as: "goblimon" },
          ...(syakomonSeat === 0 ? syakomon : []),
        ],
        hand: [
          { card: "BT1-110", as: "flowerCannon" },
          { card: "BT1-072", as: "woodmon" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-064", as: "suspendTarget" }, ...(syakomonSeat === 1 ? syakomon : [])],
        security: 5,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("goblimon").topCard.instanceId, s.perm("suspendTarget").topCard.instanceId);
  s.state.memory = 5;
  await s.ready();

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flowerCannon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("goblimon").topCard.cardId === "BT1-072", 160);
  await drainMicrotasks();

  return {
    opponentSuspended: s.perm("suspendTarget").isSuspended,
    yoshinoSuspended: s.perm("yoshino").isSuspended,
    digivolved: s.perm("goblimon").topCard.cardId === "BT1-072",
    memoryPaid: 5 - s.state.memory,
  };
}

describe("BT5-021 Syakomon — KB Q&A rulings", () => {
  it("makes the opponent pay the printed digivolution cost despite Hidden Potential Discovered! (Q1302)", async () => {
    const restricted = await digivolveWithHiddenPotential(1);
    expect(restricted).toEqual({ digivolved: true, memoryPaid: 4, suspendedForReduction: false });

    const ownSyakomon = await digivolveWithHiddenPotential(0);
    expect(ownSyakomon).toEqual({ digivolved: true, memoryPaid: 0, suspendedForReduction: true });
  });

  it("stops the opponent's Digisorption from reducing a digivolution cost (Q1303)", async () => {
    const restricted = await digivolveWithDigisorption(1);
    expect(restricted).toEqual({ digivolved: true, memoryPaid: 3, suspendedForReduction: false });

    const ownSyakomon = await digivolveWithDigisorption(0);
    expect(ownSyakomon).toEqual({ digivolved: true, memoryPaid: 0, suspendedForReduction: true });
  });

  it("still lets the opponent digivolve Impmon into Beelzemon for its fixed cost of 4 (Q1304)", async () => {
    const restricted = await digivolveBeelzemonFromImpmon(1);
    expect(restricted.reductionBlocked).toBe(true);
    expect(restricted.result).toEqual({ ok: true });
    expect(restricted.topCardId).toBe("BT2-111");
    expect(restricted.memoryPaid).toBe(4);

    const unrestricted = await digivolveBeelzemonFromImpmon(0);
    expect(unrestricted.reductionBlocked).toBe(false);
    expect(unrestricted.memoryPaid).toBe(4);
  });

  it("lets the opponent's Hiro Amanokawa digivolve its attacker, but without the cost reduction (Q6869)", async () => {
    const hiro = { tamer: "EX12-066", attacker: "EX12-007", target: "EX12-013" };
    expect(await digivolveThroughAttackTamer(hiro, 1)).toEqual({
      tamerSuspended: true,
      digivolved: true,
      memoryPaid: 3,
    });
    expect(await digivolveThroughAttackTamer(hiro, 0)).toEqual({
      tamerSuspended: true,
      digivolved: true,
      memoryPaid: 2,
    });
  });

  it("lets the opponent's Kiyoshiro Higashimitarai digivolve its attacker, but without the cost reduction (Q6872)", async () => {
    const kiyoshiro = { tamer: "EX12-067", attacker: "EX12-027", target: "EX12-030" };
    expect(await digivolveThroughAttackTamer(kiyoshiro, 1)).toEqual({
      tamerSuspended: true,
      digivolved: true,
      memoryPaid: 4,
    });
    expect(await digivolveThroughAttackTamer(kiyoshiro, 0)).toEqual({
      tamerSuspended: true,
      digivolved: true,
      memoryPaid: 3,
    });
  });

  it("lets the opponent's Ruli Tsukiyono digivolve its attacker, but without the cost reduction (Q6875)", async () => {
    const ruli = { tamer: "EX12-068", attacker: "EX12-050", target: "EX12-051" };
    expect(await digivolveThroughAttackTamer(ruli, 1)).toEqual({
      tamerSuspended: true,
      digivolved: true,
      memoryPaid: 4,
    });
    expect(await digivolveThroughAttackTamer(ruli, 0)).toEqual({
      tamerSuspended: true,
      digivolved: true,
      memoryPaid: 3,
    });
  });

  it("lets the opponent's Yoshino Fujieda digivolve with its [Your Turn] effect, but without the cost reduction (Q7148)", async () => {
    const restricted = await digivolveThroughYoshino(1);
    expect(restricted).toEqual({ opponentSuspended: true, yoshinoSuspended: true, digivolved: true, memoryPaid: 4 });

    const unrestricted = await digivolveThroughYoshino(0);
    expect(unrestricted).toEqual({ opponentSuspended: true, yoshinoSuspended: true, digivolved: true, memoryPaid: 3 });
  });
});
