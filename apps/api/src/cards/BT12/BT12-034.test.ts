import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-034.js";
import "./BT12-092.js";

describe("BT12-034 Agumon", () => {
  it("has only the printed zero-cost Koromon evolution route", () => {
    expect(digivolutionRequirementsFor("BT12-034")).toContainEqual({
      namesExact: ["Koromon"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("reveals four and mandatorily adds both Greymon and Marcus branches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-034", as: "agumon" }],
          deck: ["BT12-038", "BT12-092", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-038", "BT12-092"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });

  it("adds the single available search branch", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-034", as: "agumon" }], deck: ["BT12-092", "BT1-009", "BT1-010"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-092"]);
  });

  it("inherited effect responds once to an owned red or yellow Tamer suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-038", as: "host", under: ["BT12-034"] },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
    await advance(s.engine).verb.unsuspend([s.perm("marcus").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
  });
});

describe("BT12-034 Agumon — KB Q&A rulings", () => {
  async function revealTopFour(deck: string[]) {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-034", as: "agumon" }], deck } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    return s.state.players[0]!;
  }

  it("adds the revealed branch when only a Greymon-named Digimon or only Marcus Damon is revealed (Q2169)", async () => {
    const greymonOnly = await revealTopFour(["BT12-038", "BT1-009", "BT1-010", "BT1-064", "BT1-001"]);
    expect(greymonOnly.hand.map(({ cardId }) => cardId)).toEqual(["BT12-038"]);
    expect(greymonOnly.deck[0]!.cardId).toBe("BT1-001");
    expect(
      greymonOnly.deck
        .slice(1)
        .map(({ cardId }) => cardId)
        .sort(),
    ).toEqual(["BT1-009", "BT1-010", "BT1-064"]);

    const marcusOnly = await revealTopFour(["BT12-092", "BT1-009", "BT1-010", "BT1-064", "BT1-001"]);
    expect(marcusOnly.hand.map(({ cardId }) => cardId)).toEqual(["BT12-092"]);
    expect(marcusOnly.deck[0]!.cardId).toBe("BT1-001");

    const neither = await revealTopFour(["BT1-010", "BT1-009", "BT1-064", "BT1-001", "BT12-038"]);
    expect(neither.hand).toHaveLength(0);
  });

  it("must add both the Greymon-named Digimon and Marcus Damon when both are revealed (Q2170)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-034", as: "agumon" }],
        deck: ["BT12-038", "BT12-092", "BT1-009", "BT1-010", "BT1-001"],
      },
    });
    const pendingSelection = async (answered: number) => {
      await settle(() => s.decisions.filter(({ req }) => req.kind === "selectCards").length > answered, 2000);
      return s.decisions.filter(({ req }) => req.kind === "selectCards")[answered]!.req;
    };
    const refuseThenPick = async (answered: number) => {
      const req = await pendingSelection(answered);
      expect(req.options?.min).toBe(1);
      const skip = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      expect(skip.ok).toBe(false);
      const pick = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "selectCards", instanceIds: req.options!.candidateInstanceIds!.slice(0, 1) },
      });
      expect(pick).toEqual({ ok: true });
    };

    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("agumon"));
    await refuseThenPick(0);
    await refuseThenPick(1);
    await resolution;

    const player = s.state.players[0]!;
    expect(player.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT12-038", "BT12-092"]);
    expect(player.deck.map(({ cardId }) => cardId)).toEqual(["BT1-001", expect.any(String), expect.any(String)]);
  });
});
