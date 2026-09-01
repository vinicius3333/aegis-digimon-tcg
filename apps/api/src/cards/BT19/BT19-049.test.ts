import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-049 Gargomon", () => {
  it.each([0, 1])("public evolution with %s existing Tamer plays exact Henry Wong free", async (tamerCount) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-044", as: "base" },
            ...Array.from({ length: tamerCount }, () => ({ card: "BT19-081" })),
          ],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "BT19-085", as: "henry" },
          ],
          deck: ["BT19-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-085"));
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-044"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-085")).toBe(false);
  });

  it("does not play Henry Wong when the controller already has 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-044", as: "base" }, { card: "BT19-081" }, { card: "BT19-083" }],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "BT19-085", as: "henry" },
          ],
          deck: ["BT19-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-085")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-085")).toHaveLength(0);
  });

  it("cannot play Henry Wong & Shu-Chong Wong as Henry Wong (Q3104)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-044", as: "base" }],
          hand: [
            { card: "BT19-049", as: "gargo" },
            { card: "EX4-063", as: "pair" },
          ],
          deck: ["BT19-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-049");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX4-063")).toBe(true);
  });

  it("may decline the free Henry Wong play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-049", as: "gargo" }],
          hand: [{ card: "BT19-085", as: "henry" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("gargo"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-085"]);
  });

  it("inherited attack suspends one eligible opponent only once per turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-050", as: "host", under: ["BT19-049"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "already", suspended: true },
            { card: "BT1-011", as: "first" },
            { card: "BT1-012", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("already").permanentId, s.perm("already").topCard!.instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect([s.perm("first"), s.perm("second")].filter((p) => p.isSuspended)).toHaveLength(1);
    const untouched = s.perm("first").isSuspended ? s.perm("second") : s.perm("first");
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(untouched.isSuspended).toBe(false);
  });

  it("resolves inherited suspension from a public attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-049", as: "gargo", under: ["BT19-044"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gargo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
