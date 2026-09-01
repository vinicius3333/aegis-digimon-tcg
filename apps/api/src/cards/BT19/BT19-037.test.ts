import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-037 Taomon", () => {
  it("declares ACE Overflow -3 and Blast Digivolve", () => {
    const card = getCardDefinition("BT19-037");
    expect(card?.isAce).toBe(true);
    expect(card?.overflowMemory).toBe(3);
    expect(runtimeCompiledCard("BT19-037")?.effects[0]?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may use a single-color cost-5-or-less Option from hand without paying",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-037", as: "taomon" }],
            hand: [
              { card: "BT1-102", as: "option" },
              { card: "BT19-020", as: "nonOption" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await advance(s.engine).fireForPermanent(timing, s.perm("taomon"));
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-020"]);
      expect(s.state.memory).toBe(0);
    },
  );

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s chooses one opponent Digimon for both opponent-turn restrictions",
    async (timing) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-037", as: "taomon" }] },
          1: {
            battleArea: [
              { card: "BT1-010", as: "chosen" },
              { card: "BT1-011", as: "other" },
            ],
          },
        },
        { autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("chosen").instanceId);
      s.state.turnSeat = 1;
      await s.ready();
      await advance(s.engine).fireForPermanent(timing, s.perm("taomon"));

      const affected = ["chosen", "other"].filter(
        (alias) => observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack") === -1,
      );
      expect(affected).toHaveLength(1);
      const untouched = affected[0] === "chosen" ? "other" : "chosen";
      expect(observe(s.engine).timingEffectDisabled(s.perm(affected[0]!), "whenDigivolving")).toBe(true);
      expect(observe(s.engine).keywordAmount(s.perm(untouched), "SecurityAttack")).toBe(0);
      expect(observe(s.engine).timingEffectDisabled(s.perm(untouched), "whenDigivolving")).toBe(false);
    },
  );

  it("suppresses When Digivolving without consuming a shared When Attacking once-per-turn use (Q5536-Q5540)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-037", as: "taomon" }] },
        1: { battleArea: [{ card: "ST24-07", as: "shine" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("taomon"));

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shine"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("shine"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("inherited When Attacking gives exactly one opponent Digimon -4000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-038", as: "host", under: ["BT19-037"] }] },
        1: {
          battleArea: [
            { card: "BT19-020", as: "chosen" },
            { card: "BT19-021", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("chosen").currentDP).toBe(1000);
    expect(s.perm("other").currentDP).toBe(5000);
  });

  it("resolves On Play from a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-037", as: "taomon" },
            { card: "BT1-102", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-102");
  });
});
