import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-044 Terriermon", () => {
  it.each(["BT19-085", "BT19-077"])(
    "gains 1 memory at Start of Your Main Phase with either support (%s)",
    async (support) => {
      const s = setupEngine({ 0: { battleArea: [{ card: "BT19-044", as: "terrier" }, { card: support }] } });
      s.state.memory = 0;
      await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("terrier"));
      expect(s.state.memory).toBe(1);
    },
  );

  it("does not gain memory without Henry Wong or Calumon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-044", as: "terrier" }, { card: "BT19-081" }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("terrier"));
    expect(s.state.memory).toBe(0);
  });

  it("does not treat Henry Wong & Shu-Chong Wong as exact Henry Wong support", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-044", as: "terrier" }, { card: "EX4-063" }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("terrier"));
    expect(s.state.memory).toBe(0);
  });

  it("inherited When Attacking suspends exactly one opponent Digimon only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-049", as: "host", under: ["BT19-044"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect([s.perm("first"), s.perm("second")].filter((p) => p.isSuspended)).toHaveLength(1);
    const untouched = s.perm("first").isSuspended ? s.perm("second") : s.perm("first");
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(untouched.isSuspended).toBe(false);
  });

  it("does not select an already-suspended Digimon for the inherited suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-038", as: "host", under: ["BT19-044"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "already", suspended: true },
            { card: "BT1-011", as: "fresh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(true);
  });

  it("resolves Start of Your Main Phase from a real turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-044", as: "terrier" }, { card: "BT19-077" }],
        deck: ["BT19-030"],
      },
      1: { deck: ["BT19-030"] },
    });
    s.state.memory = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("resolves inherited suspension from a public attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-049", as: "terrier", under: ["BT19-044"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("terrier").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
