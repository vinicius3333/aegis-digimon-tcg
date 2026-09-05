import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-047";

describe("EX11-047 Impmon", () => {
  it("preserves the printed card, Yaamon evolution, start-main cost, and inherited DP", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Impmon",
      colors: ["Purple", "Red"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      types: ["Evil", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Yaamon"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(compiled.effects.find(({ isInherited }) => isInherited)?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 2000, duration: "permanent" },
    ]);
  });

  it("trashes exactly 1 hand card, then gains 1 memory at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "BT1-001", as: "discard" },
            { card: "BT1-002", as: "keep" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  /**
   * Smallest legal stack that reaches this card: the in-set Digi-Egg EX11-005 [Yaamon] in the
   * breeding area. Both routes match a Yaamon base — the printed `Purple/Red Lv.2: Cost 1`
   * evoCost and the alternate `[Yaamon]: Cost 0` — so per CR 8-1-2-1 the declaring player picks
   * one. The manual digivolve intent carries that declaration in `useAlternateCost` (the
   * `chooseOption` route prompt exists only on the effect-driven path).
   * FAILS-WHEN-REVERTED: dropping `{ namesExact: ["Yaamon"], cost: 0 }` makes the alternate route
   * unavailable, so the alternate case falls back to the printed cost and reads -1, not 0.
   */
  it("digivolves from a [Yaamon] Digi-Egg by either route, charging 0 or 1, and keeps Yaamon as its source", async () => {
    const evolveFromYaamon = async (useAlternateCost: boolean) => {
      const s = setupEngine(
        { 0: { breeding: { card: "EX11-005", as: "egg" }, hand: [{ card: cardId, as: "impmon" }] } },
        { autoSelectCards: true, autoChooseOption: true },
      );
      await s.ready();
      s.state.memory = 0;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("impmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.cardId === cardId);
      expect(s.perm("egg").topCard.cardId).toBe(cardId);
      expect(s.perm("egg").stack.map(({ cardId: id }) => id)).toEqual(["EX11-005"]);
      expect(s.perm("egg").currentDP).toBe(1000);
      assertNoLoudGap(s);
      return s.state.memory;
    };

    expect(await evolveFromYaamon(true)).toBe(0); // alternate [Yaamon] route: cost 0
    expect(await evolveFromYaamon(false)).toBe(-1); // printed Purple/Red Lv.2 route: cost 1
  });

  /**
   * CR 1-3-2: "If a player is requested to perform an impossible action, that action will not be
   * carried out. If only some of those actions are impossible, the player performs as many of the
   * required actions as possible." "Trash 1 card in your hand. Then, gain 1 memory." is plain
   * sequencing — not a §15-6 processing condition ("if"/"while") and not a §15-7 optional
   * processing condition ("by X, Y") — so an empty hand skips only the trash and the memory is
   * still gained. This case pins the reading the engine implements.
   */
  it("still gains 1 memory when the hand is empty (CR 1-3-2)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "source" }] } }, { autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("gives its host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: [cardId] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });
});
