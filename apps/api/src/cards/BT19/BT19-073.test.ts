import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-073.js";

describe("BT19-073", () => {
  it("runs its de-digivolve restriction from a public digivolution", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-073", as: "source" }], battleArea: [{ card: "BT13-090", as: "base" }] },
        1: { battleArea: [{ card: "BT19-070", as: "opponent", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-073");
    expect(s.perm("base").topCard?.cardId).toBe("BT19-073");
    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("preserves Collision/Piercing, scaled de-digivolve lock, and Knightmon Alliance DP grant", () => {
    const card = runtimeCompiledCard("BT19-073");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Collision" }] },
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, bindAs: "deDigivolveTarget" },
            scaling: { per: 1, unit: "cards" },
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: "digivolve",
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Alliance" }, duration: "permanent" },
          { kind: "ModifyDP", amount: 3000, duration: "permanent" },
        ],
      },
    ]);
  });
});
