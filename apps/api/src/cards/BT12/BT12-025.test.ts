import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-025.js";

describe("BT12-025 Calmaramon", () => {
  it("digivolves from Lanamon for 1", async () => {
    expect(digivolutionRequirementsFor("BT12-025")).toContainEqual({
      names: ["Lanamon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-024", as: "lanamon" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lanamon").permanentId,
        instanceId: s.inst("calmaramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lanamon").topCard.cardId === "BT12-025");
    expect(s.state.memory).toBe(9);
    expect(s.perm("lanamon").stack.map(({ cardId }) => cardId)).toContain("BT12-024");
  });

  it("digivolves from a blue Tamer for 0 and rejects a non-blue Tamer", async () => {
    expect(digivolutionRequirementsFor("BT12-025")).toContainEqual({
      cost: 0,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    });
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-090", as: "davis" }],
        hand: [{ card: "BT12-025", as: "calmaramon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("davis").permanentId,
        instanceId: valid.inst("calmaramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("davis").topCard.cardId === "BT12-025");
    expect(valid.perm("davis").stack.map(({ cardId }) => cardId)).toContain("BT12-090");
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT12-088", as: "takuya" }], hand: [{ card: "BT12-025", as: "calmaramon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("takuya").permanentId,
        instanceId: invalid.inst("calmaramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may play a blue level 3 from one of its blue Digimon's evolution cards for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-025", as: "calmaramon" },
            { card: "BT12-024", as: "source", under: ["BT12-021"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const material = s.perm("source").stack[0]!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("calmaramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-021"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === material)).toBe(true);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("can decline and excludes level/color near-matches from evolution cards", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-025", as: "calmaramon" },
            { card: "BT12-024", as: "source", under: ["BT12-021"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnUseAttack, declined.perm("calmaramon"));
    expect(declined.perm("source").stack).toHaveLength(1);

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-025", as: "calmaramon" },
          { card: "BT12-024", as: "source", under: ["BT12-048", "BT12-024"] },
        ],
      },
    });
    await advance(invalid.engine).fire(EffectTiming.OnUseAttack, invalid.perm("calmaramon"));
    expect(invalid.perm("source").stack).toHaveLength(2);
    expect(invalid.state.players[0]!.battleArea).toHaveLength(2);
  });
});
