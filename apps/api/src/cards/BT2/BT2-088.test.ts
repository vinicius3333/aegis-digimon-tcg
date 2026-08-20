import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-088.js";
import "../index.js"; // the full catalog is registered in a real match

describe("BT2-088 Taiga", () => {
  it("grants Piercing and may suspend to reduce a Tyrannomon digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-088", as: "taiga" },
            { card: "BT2-043", as: "base" },
          ],
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044" && s.perm("taiga").isSuspended);
    await advance(s.engine).recompute();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("grants Piercing only to the controller's Tyrannomon-named Digimon during its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-088", as: "taiga" },
          { card: "BT2-044", as: "tyrannomon" },
          { card: "BT2-045", as: "argomon" },
        ],
      },
      1: { battleArea: [{ card: "BT2-044", as: "opposingTyrannomon" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("tyrannomon"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("argomon"))).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("opposingTyrannomon"))).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("tyrannomon"))).toBe(false);
  });

  it("may decline the Tyrannomon cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-088", as: "taiga" },
            { card: "BT2-043", as: "base" },
          ],
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });

  it("does not reduce digivolution into a non-Tyrannomon card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-088", as: "taiga" },
            { card: "BT2-043", as: "base" },
          ],
          // A non-Tyrannomon Lv.4 Green card with the same cost-2 digivolve and no cost
          // reduction of its own — Argomon's ＜Digisorption -2＞ would mask the result.
          hand: [{ card: "BT1-072", as: "woodmon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("woodmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-072");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-088", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });

  it("Q1038 does not reduce a Tyrannomon digivolution in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-088", as: "taiga" }],
          breeding: { card: "BT2-043", as: "base" },
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });
});
