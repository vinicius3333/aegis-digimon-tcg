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
    0: { battleArea: [{ card: "BT14-007", as: "host", under: ["BT14-004"] }] },
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
        deck: ["BT1-001"],
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
