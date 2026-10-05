import { EffectDuration } from "@aegis/shared";
import { expect, it, vi } from "vitest";
import "../cards/index.js";
import { compiled as originalRookie } from "../cards/BT1/BT1-009.js";
import { registerIrCard } from "./effects/interpreter.js";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";

it("resolves each promoted top without retaining its former inherited bonus or losing a timed modifier", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        {
          card: "ST1-10",
          as: "host",
          under: [
            { card: "BT1-001", as: "egg" },
            { card: "BT1-009", as: "rookie" },
            { card: "BT1-015", as: "champion" },
            { card: "ST1-08", as: "ultimate" },
          ],
        },
      ],
    },
  });
  await s.ready();
  const host = s.perm("host");
  expect(host.currentDP).toBe(14000);
  await advance(s.engine).verb.modifyDP(host.permanentId, 1000, EffectDuration.UntilOwnerTurnEnd);
  // Isolate an atomic self-strip with a Your Turn inherited modifier. The registered
  // opponent-targeting lab Options cannot reach this mechanism on the holder's own turn.
  await advance(s.engine).verb.deDigivolve(host.permanentId, 3);
  const resolutions = s.events.filter((event) => event.kind === "stackTopResolved");
  expect(resolutions.map((event) => ({ top: event.topInstanceId, dp: event.currentDP, base: event.baseDP }))).toEqual([
    { top: s.inst("ultimate").instanceId, dp: 10000, base: 7000 },
    { top: s.inst("champion").instanceId, dp: 5000, base: 4000 },
    { top: s.inst("rookie").instanceId, dp: 4000, base: 3000 },
  ]);
  expect(host.currentDP).toBe(4000);
  expect(host.stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
});

it("retains the published memory threshold throughout an atomic strip", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT17-101", as: "host", under: ["BT17-091", "BT16-076", "BT17-069", "BT17-040"] }] },
    1: { battleArea: [{ card: "BT1-009" }] },
  });
  await s.ready();
  s.state.memory = -2;
  expect(s.engine.memory.turnEndMinMemoryFor(0)).toBe(3);
  const thresholds: number[] = [];
  const emit = s.engine.hooks.emit;
  vi.spyOn(s.engine.hooks, "emit").mockImplementation((event) => {
    if (event.kind === "stackTopResolved") thresholds.push(s.engine.memory.turnEndMinMemoryFor(0));
    emit(event);
  });
  await advance(s.engine).verb.deDigivolve(s.perm("host").permanentId, 3);
  expect(thresholds).toEqual([3, 3, 3]);
  expect(s.engine.memory.turnEndMinMemoryFor(0)).toBe(1);
  expect(s.engine.memory.hasCrossedToOpponent()).toBe(true);
});

it("keeps intermediate zero-DP tops until the atomic strip reaches its final continuous floor", async () => {
  // Isolate a floor that only applies when this printed rookie becomes the top.
  // This registered IR seam exercises the actual interpreter and modifier ledger.
  registerIrCard("BT1-009", {
    effects: [
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "MinDpFloor",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            floor: 5000,
            duration: "permanent",
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  });
  try {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "host", under: ["BT1-001", "BT1-009", "ST1-07", "ST1-08"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.modifyDP(s.perm("host").permanentId, -8000, EffectDuration.UntilOwnerTurnEnd);
    await advance(s.engine).verb.deDigivolve(s.perm("host").permanentId, 3);
    expect(s.events.filter((event) => event.kind === "stackTopResolved").map((event) => event.currentDP)).toEqual([
      0, 0, 5000,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.perm("host").currentDP).toBe(5000);
  } finally {
    registerIrCard("BT1-009", originalRookie);
  }
});

it("publishes a normal recompute that joins an in-flight intermediate derivation", async () => {
  const s = setupEngine();
  await s.ready();
  let entered!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const run = s.engine.runContinuousPass.bind(s.engine);
  let passes = 0;
  const pass = vi.spyOn(s.engine, "runContinuousPass").mockImplementation(async (...args) => {
    if (++passes === 1) {
      entered();
      await blocked;
    }
    await run(...args);
  });
  const publish = vi.spyOn(s.engine.projection, "syncActivatableEffects");
  const quiet = s.engine.recomputeContinuousDerivedEffects();
  await started;
  const normal = s.engine.recomputeContinuousEffects();
  try {
    expect(publish).not.toHaveBeenCalled();
    release();
    await Promise.all([quiet, normal]);
    expect(passes).toBe(2);
    expect(publish).toHaveBeenCalledTimes(1);
  } finally {
    release();
    await Promise.allSettled([quiet, normal]);
    pass.mockRestore();
    publish.mockRestore();
  }
});
