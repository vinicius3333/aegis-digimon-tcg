import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-042 Dynasmon (X Antibody)", () => {
  it("has the Dynasmon evolution route plus Raid and Blocker", async () => {
    expect(digivolutionRequirementsFor("BT19-042")).toContainEqual({ names: ["Dynasmon"], cost: 1, isAlternate: true });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-042", as: "dynasX" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dynasX"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dynasX"), "Blocker")).toBe(true);
  });

  it.each([
    [EffectTiming.WhenDigivolving, "BT19-041"],
    [EffectTiming.OnUseAttack, "BT19-039"],
  ] as const)(
    "%s accepts either a Dynasmon name or X Antibody trait source and pays both security effects (%s)",
    async (timing, source) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-042", as: "dynasX", under: [source] }], security: ["BT19-030"] },
          1: { security: ["BT19-031"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).fireForPermanent(timing, s.perm("dynasX"));
      expect(s.state.players[0]!.security).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.perm("dynasX").currentDP).toBe(18000);
    },
  );

  it("declining the cost or missing both stack alternatives performs no security or DP change", async () => {
    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT19-041"] }], security: ["BT19-030"] },
        1: { security: ["BT19-031"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fireForPermanent(EffectTiming.WhenDigivolving, declined.perm("dynasX"));
    expect(declined.state.players[0]!.security).toHaveLength(1);
    expect(declined.state.players[1]!.security).toHaveLength(1);
    expect(declined.perm("dynasX").currentDP).toBe(12000);

    const missing = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT19-030"] }], security: ["BT19-030"] },
        1: { security: ["BT19-031"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(missing.engine).fireForPermanent(EffectTiming.WhenDigivolving, missing.perm("dynasX"));
    expect(missing.state.players[0]!.security).toHaveLength(1);
    expect(missing.state.players[1]!.security).toHaveLength(1);
    expect(missing.perm("dynasX").currentDP).toBe(12000);
  });

  it("does not partially pay when the opponent has no security card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT19-041"] }], security: ["BT19-030"] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("dynasX"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("dynasX").currentDP).toBe(12000);
  });

  it("shares one once-per-turn use between evolution and attack timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT19-041"] }],
          security: ["BT19-030", "BT19-032"],
        },
        1: { security: ["BT19-031", "BT19-033"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("dynasX"));
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("dynasX"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("dynasX").currentDP).toBe(18000);
  });

  it.each([2, 3])("End of Your Turn recovers from deck only with 2 or fewer security (%s)", async (count) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-042", as: "dynasX" }],
        security: Array.from({ length: count }, () => "BT19-030"),
        deck: ["BT19-031"],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("dynasX"));
    expect(s.state.players[0]!.security).toHaveLength(count === 2 ? 3 : 3);
    expect(s.state.players[0]!.deck).toHaveLength(count === 2 ? 0 : 1);
  });

  it("resolves When Digivolving from a public Dynasmon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas" }],
          hand: [{ card: "BT19-042", as: "dynasX" }],
          security: ["BT19-030"],
        },
        1: { security: ["BT19-031"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dynas").permanentId,
        instanceId: s.inst("dynasX").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dynas").topCard?.cardId === "BT19-042");
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
