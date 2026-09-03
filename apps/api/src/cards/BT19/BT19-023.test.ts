import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-023 Huankunmon", () => {
  it("naturally resolves On Play protection when played from hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-023", as: "huankun" }], battleArea: [{ card: "BT19-021", as: "other" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("huankun").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-023"));
    const protectedMine = s.state.players[0]!.battleArea.filter((p) =>
      observe(s.engine).hasRestriction(p, "beDeletedInBattle"),
    );
    expect(protectedMine).toHaveLength(1);
  });

  it("naturally resolves When Digivolving protection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-021", as: "base" },
            { card: "BT19-021", as: "other" },
          ],
          hand: [{ card: "BT19-023", as: "huankun" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("huankun").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-023"));
    const protectedMine = s.state.players[0]!.battleArea.filter((p) =>
      observe(s.engine).hasRestriction(p, "beDeletedInBattle"),
    );
    expect(protectedMine).toHaveLength(1);
  });

  it("has Blocker without granting it to another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-023", as: "huankun" },
          { card: "BT19-021", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("huankun"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s protects exactly one friendly Digimon from battle deletion",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-023", as: "huankun" },
              { card: "BT19-021", as: "other" },
            ],
          },
          1: { battleArea: [{ card: "BT19-018", as: "opponent" }] },
        },
        { autoSelectCards: true },
      );
      await advance(s.engine).fireForPermanent(timing, s.perm("huankun"));
      const protectedMine = [s.perm("huankun"), s.perm("other")].filter((p) =>
        observe(s.engine).hasRestriction(p, "beDeletedInBattle"),
      );
      expect(protectedMine).toHaveLength(1);
      expect(observe(s.engine).hasRestriction(s.perm("opponent"), "beDeletedInBattle")).toBe(false);
    },
  );

  it("inherited Your Turn prevents only its host's attack target from being switched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-024", as: "host", under: ["BT19-023"] },
          { card: "BT19-024", as: "plain" },
        ],
      },
    });
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasRestriction(s.perm("host"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("plain"), "attackTargetChange")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasRestriction(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
