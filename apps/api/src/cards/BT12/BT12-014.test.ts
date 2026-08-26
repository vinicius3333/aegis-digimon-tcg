import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-014.js";
describe("BT12-014 OmniShoutmon", () => {
  it("digivolves for 3 from a level 4 with Save text and rejects a non-Save near-match", async () => {
    expect(digivolutionRequirementsFor("BT12-014")).toContainEqual({
      level: 4,
      texts: ["Save"],
      cost: 3,
      isAlternate: true,
    });
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-011", as: "save" }],
        hand: [{ card: "BT12-014", as: "omni" }],
        deck: ["BT1-009"],
      },
    });
    valid.state.memory = 10;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("save").permanentId,
        instanceId: valid.inst("omni").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("save").topCard.cardId === "BT12-014");
    expect(valid.state.memory).toBe(7);
    expect(valid.perm("save").stack.map(({ cardId }) => cardId)).toContain("BT12-011");
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT12-025", as: "plain" }], hand: [{ card: "BT12-014", as: "omni" }] },
    });
    invalid.state.memory = 10;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("omni").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("registers the deletion-budget clause without a residual gap", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-014")!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(JSON.stringify(card)).not.toContain("RawUnparsed");
  });

  it("adds 3000 to its deletion budget per 2 digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-011"] }] },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes multiple Digimon whose combined DP fits the expanded budget", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-011"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-009", as: "second" },
            { card: "BT12-021", as: "tooLarge", dp: 8000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("gains Security Attack +1 only on its turn with at least four digivolution cards", async () => {
    const four = setupEngine({
      0: { battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-009", "BT12-010", "BT12-011"] }] },
    });
    await advance(four.engine).fire(EffectTiming.None, four.perm("omni"));
    expect(observe(four.engine).keywordAmount(four.perm("omni"), "SecurityAttack")).toBe(1);
    four.state.turnSeat = 1;
    await four.engine.recomputeContinuousEffects();
    expect(observe(four.engine).hasKeyword(four.perm("omni"), "SecurityAttack")).toBe(false);

    const three = setupEngine({
      0: { battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-009", "BT12-010"] }] },
    });
    await advance(three.engine).fire(EffectTiming.None, three.perm("omni"));
    expect(observe(three.engine).hasKeyword(three.perm("omni"), "SecurityAttack")).toBe(false);
  });

  it("deletes one 4000 DP target through the inherited Save attack and only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-014"] }] },
        1: {
          battleArea: [
            { card: "BT12-021", dp: 4000 },
            { card: "BT12-021", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    const noSave = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-014"] }] },
      1: { battleArea: [{ card: "BT12-021", dp: 4000 }] },
    });
    await advance(noSave.engine).fire(EffectTiming.OnUseAttack, noSave.perm("host"));
    expect(noSave.state.players[1]!.battleArea).toHaveLength(1);
  });
  it("keeps the base 4000 deletion ceiling without digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-014", as: "omni" }] },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT12-038");
  });

  it("adds two 3000 increments for four digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-009", "BT12-010", "BT12-011"] }],
        },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps the printed 4000 total DP cap with no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-014", as: "omni" }] },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
