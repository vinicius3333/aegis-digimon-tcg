import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT4-092.js";

describe("BT4-092 Marcus Damon", () => {
  it("encodes the printed exclusions as exact names", () => {
    const compiled = runtimeCompiledCard("BT4-092");
    expect(compiled?.effects[1]?.actions[0]).toMatchObject({
      sourceFilter: {
        excludeNameOrTrait: [
          { tokens: ["DoruGreymon"], match: "nameExact" },
          { tokens: ["BurningGreymon"], match: "nameExact" },
          { tokens: ["DexDoruGreymon"], match: "nameExact" },
        ],
      },
    });
  });

  it("sets memory to 3 at the start of the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-092", as: "marcus" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("marcus"));
    expect(s.state.memory).toBe(3);
  });

  it("suspends to gain 1 memory when an eligible Greymon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-092", as: "marcus" },
            { card: "BT1-015", as: "greymon", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").isSuspended && s.state.memory === 1, 5000);
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-092", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });

  it.each(["BT4-013", "BT7-064", "BT9-078"])(
    "does not trigger for excluded Greymon name %s",
    async (excludedCardId) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT4-092", as: "marcus" },
              { card: excludedCardId, as: "excluded", dp: 20_000 },
            ],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
        },
        { autoAcceptOptional: true },
      );
      s.state.memory = 0;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("excluded").permanentId,
          target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);

      expect(s.perm("marcus").isSuspended).toBe(false);
      expect(s.state.memory).toBe(0);
    },
  );

  it("cannot pay the suspend cost while Marcus is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-092", as: "marcus", suspended: true },
            { card: "BT1-015", as: "greymon", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
