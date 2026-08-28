import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-038.js";

describe("BT9-038 Pegasusmon", () => {
  it("matches catalog, Patamon evolution, Armor Purge, and opponent-turn keyword IR", () => {
    expect(getCardDefinition("BT9-038")).toMatchObject({
      cardId: "BT9-038", nameEn: "Pegasusmon", colors: ["Yellow", "Blue"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 5000, evoCosts: [{ color: "Yellow", level: 3, memoryCost: 3 }], forms: ["ArmorForm"],
      attributes: ["Free"], types: ["Holy Beast"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Patamon"], cost: 2, isAlternate: true }],
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Armor Purge" }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }] },
      ],
    });
  });

  it("gives an opposing Digimon Security Attack -1 when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-045", as: "base" }], hand: [{ card: "BT9-038", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  });

  it("uses the two-cost Patamon alternate evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-048", as: "base" }], hand: [{ card: "BT9-038", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  });
});
