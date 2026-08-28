import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-003.js";

describe("BT14-003", () =>
  it("inherits once-per-turn draw when your security increases", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: { kind: "triggerSecurityIsYours" },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    })));

it("draws once for your security addition, but ignores the opponent's addition", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT14-007", as: "stack", under: ["BT14-003"] }],
      deck: ["BT1-001", "BT1-001"],
      security: ["BT1-001"],
    },
    1: { security: ["BT1-001"] },
  });
  s.state.turnSeat = 0;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("stack"));

  await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
  expect(s.state.players[0]!.hand).toHaveLength(0);

  await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
  expect(s.state.players[0]!.hand).toHaveLength(1);

  await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
  expect(s.state.players[0]!.hand).toHaveLength(1);
});

it("draws from a real recovery after a legal Tokomon-to-Elecmon breeding evolution", async () => {
  const s = setupEngine(
    {
      0: {
        breeding: { card: "BT14-003", as: "tokomon" },
        hand: [
          { card: "BT14-031", as: "elecmon" },
          { card: "BT14-037", as: "magnaAngemon" },
        ],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "BT14-031", as: "dpTarget" }] },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 10;
  s.state.turnSeat = 0;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tokomon").permanentId,
      instanceId: s.inst("elecmon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("tokomon").topCard.cardId === "BT14-031");
  expect(s.perm("tokomon").stack.map((card) => card.cardId)).toEqual(["BT14-003"]);

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("tokomon").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("tokomon").inBreeding);
  s.state.phase = Phase.Main;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tokomon"));

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnaAngemon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.security.length === 1 && s.state.players[0]!.hand.length === 2);

  expect(s.state.players[0]!.security).toHaveLength(1);
  expect(s.state.players[0]!.hand).toHaveLength(2);
  expect(s.perm("tokomon").stack[0]?.cardId).toBe("BT14-003");
  assertNoLoudGap(s);
});
