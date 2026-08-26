import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-001.js";

describe("BT14-001", () =>
  it("inherits once-per-turn draw when an opponent security card is removed during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    })));

it("draws once when the opponent's security is removed, but not from own security", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT14-007", as: "stack", under: ["BT14-001"] }],
      deck: ["BT1-001", "BT1-001"],
      security: ["BT1-001"],
    },
    1: { security: ["BT1-001"] },
  });
  s.state.turnSeat = 0;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("stack"));

  await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
  expect(s.state.players[0]!.hand).toHaveLength(0);

  await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
  expect(s.state.players[0]!.hand).toHaveLength(1);

  await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
  expect(s.state.players[0]!.hand).toHaveLength(1);
});

it("survives the legal Koromon-to-Agumon breeding stack and draws after a real security removal", async () => {
  const s = setupEngine({
    0: {
      breeding: { card: "BT14-001", as: "koromon" },
      hand: [{ card: "BT14-007", as: "agumon" }],
      deck: ["BT1-001", "BT1-001"],
    },
    1: { security: ["BT1-001"] },
  });
  s.state.memory = 3;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("koromon").permanentId,
      instanceId: s.inst("agumon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("koromon").topCard.cardId === "BT14-007");
  expect(s.perm("koromon").topCard.cardId).toBe("BT14-007");
  expect(s.perm("koromon").stack.map((card) => card.cardId)).toEqual(["BT14-001"]);
  expect(s.state.players[0]!.hand).toHaveLength(1);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("koromon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("koromon").inBreeding);

  s.state.phase = Phase.Main;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("koromon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 0);

  expect(s.state.players[0]!.hand).toHaveLength(2);
  expect(s.perm("koromon").topCard.cardId).toBe("BT14-007");
  expect(s.perm("koromon").stack[0]?.cardId).toBe("BT14-001");
  assertNoLoudGap(s);
});
