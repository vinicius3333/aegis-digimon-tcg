import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { digiXrosMatches } from "../../engine/combat/keywords.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-012 OmniShoutmon", () => {
  it("supports both alternate evolution requirements and rejects their boundaries", () => {
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-008")?.cost).toBe(4);
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-033")?.cost).toBe(3);
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-009")).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-005")).toBeUndefined();
  });

  it("naturally resolves its On Play effect when played from hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-012", as: "omni" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omni").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("naturally evolves and attacks with inherited Rush on an Xros Heart host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-008", as: "base" }],
          hand: [{ card: "BT19-012", as: "omni" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omni").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-012");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s gives one opposing Digimon -3000 DP, then deletes one at the printed boundary",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-012", as: "omni" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "reduced", dp: 6000 },
              { card: "BT1-010", as: "untouched", dp: 4000 },
            ],
          },
        },
        { autoSelectCards: true },
      );

      const reducedId = s.perm("reduced").permanentId;
      await advance(s.engine).fireForPermanent(timing, s.perm("omni"));

      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === reducedId)).toBe(false);
      expect(s.perm("untouched").currentDP).toBe(4000);
    },
  );

  it("on deletion places one Xros Heart or Blue Flare Digimon from hand or trash under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-012", as: "omni" },
            { card: "BT19-079", as: "tamer" },
          ],
          hand: [{ card: "BT19-009", as: "nonmatching" }],
          trash: [{ card: "BT19-016", as: "blueFlare" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("omni").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-016"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-009");
  });

  it("grants inherited Rush only to an Xros Heart host during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-013", as: "xrosHost", under: ["BT19-012"] },
          { card: "BT19-015", as: "plainHost", under: ["BT19-012"] },
        ],
      },
    });
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Rush")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Rush")).toBe(false);
  });

  it("uses the Shoutmon alias only for DigiXros and not for Material Save (Q3068)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-012", as: "omni" }],
        hand: [
          { card: "BT10-013", as: "x5" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
          { card: "BT10-060", as: "sparrowmon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("omni"))).toEqual(["omnishoutmon"]);
    expect(digiXrosMatches("BT10-013", "BT19-012")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("omni").instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
            s.inst("starmons").instanceId,
            s.inst("sparrowmon").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-013"));
    expect(s.perm("x5").stack.map((card) => card.cardId)).toContain("BT19-012");
  });
});
