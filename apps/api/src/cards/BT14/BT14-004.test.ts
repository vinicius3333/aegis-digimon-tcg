import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-004.js";

describe("BT14-004", () =>
  it("inherits once-per-turn +2000 DP when your effect suspends a Tamer", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { kind: ["Tamer"] },
          bySourceController: "mine",
          actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn" }],
        },
      ],
    })));

it("gains +2000 DP once when your effect suspends a Tamer", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT14-004"] }] },
    1: { battleArea: [{ card: "BT22-083", as: "tamer" }] },
  });
  const host = s.perm("host");
  const before = host.currentDP;
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

  await (s.engine as unknown as { fireSubTrigger(event: string, payload: unknown): Promise<void> }).fireSubTrigger(
    "whenEffectSuspends",
    {
      subjectPermanentId: s.perm("tamer").permanentId,
      suspendedPermanentId: s.perm("tamer").permanentId,
      effectSuspendSeat: 1,
    },
  );
  expect(host.currentDP).toBe(before);

  await (s.engine as unknown as { fireSubTrigger(event: string, payload: unknown): Promise<void> }).fireSubTrigger(
    "whenEffectSuspends",
    {
      subjectPermanentId: s.perm("tamer").permanentId,
      suspendedPermanentId: s.perm("tamer").permanentId,
      effectSuspendSeat: 0,
    },
  );
  await settle(() => host.currentDP === before + 2000);
  expect(host.currentDP).toBe(before + 2000);

  await (s.engine as unknown as { fireSubTrigger(event: string, payload: unknown): Promise<void> }).fireSubTrigger(
    "whenEffectSuspends",
    {
      subjectPermanentId: s.perm("tamer").permanentId,
      suspendedPermanentId: s.perm("tamer").permanentId,
      effectSuspendSeat: 0,
    },
  );
  expect(host.currentDP).toBe(before + 2000);
});

it("uses a legal green evolution stack and gains DP when a played Digimon suspends an opposing Tamer", async () => {
  const s = setupEngine(
    {
      0: {
        breeding: { card: "BT14-004", as: "tanemon" },
        hand: [
          { card: "BT14-044", as: "palmon" },
          { card: "EX8-041", as: "darkTyrannomon" },
        ],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT22-083", as: "tamer" }] },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 10;
  s.state.turnSeat = 0;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tanemon").permanentId,
      instanceId: s.inst("palmon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("tanemon").topCard.cardId === "BT14-044");
  expect(s.perm("tanemon").stack.map((card) => card.cardId)).toEqual(["BT14-004"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("tanemon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("tanemon").inBreeding);
  s.state.phase = Phase.Main;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tanemon"));
  const before = s.perm("tanemon").currentDP;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkTyrannomon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.perm("tamer").isSuspended && s.perm("tanemon").currentDP === before + 2000);

  expect(s.perm("tamer").isSuspended).toBe(true);
  expect(s.perm("tanemon").currentDP).toBe(before + 2000);
  assertNoLoudGap(s);
});

it("resets the inherited suspension trigger on the next natural turn", async () => {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-064", as: "host", under: ["BT14-004"] }],
        hand: [
          { card: "EX8-041", as: "first" },
          { card: "EX8-041", as: "second" },
        ],
        deck: Array(8).fill("BT1-009"),
      },
      1: {
        battleArea: [
          { card: "BT22-083", as: "firstTamer" },
          { card: "BT22-083", as: "secondTamer" },
        ],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  s.state.memory = 10;
  preferInstanceIds.push(s.inst("firstTamer").instanceId);

  const firstTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const beforeFirst = s.perm("host").currentDP;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("host").currentDP === beforeFirst + 2000);
  expect(s.perm("host").currentDP).toBe(beforeFirst + 2000);
  advance(s.engine).endMainPhaseIfOpen(0);
  await firstTurn;

  s.state.turnSeat = 1;
  s.state.memory = 3;
  await advance(s.engine).runTurn(1);
  s.state.turnSeat = 0;
  s.state.memory = 10;

  const secondTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  preferInstanceIds.splice(0, preferInstanceIds.length, s.inst("secondTamer").instanceId);
  expect(s.perm("secondTamer").isSuspended).toBe(false);
  const beforeSecond = s.perm("host").currentDP;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("host").currentDP === beforeSecond + 2000);
  expect(s.perm("host").currentDP).toBe(beforeSecond + 2000);
  advance(s.engine).endMainPhaseIfOpen(0);
  await secondTurn;
  assertNoLoudGap(s);
});
