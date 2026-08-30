import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-061.js";

describe("BT7-061 Gigasmon", () => {
  it("records black Tamer eligibility and separates the active Blocker grant", () => {
    const card = runtimeCompiledCard("BT7-061");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ baseIsTamer: true, baseColors: ["Black"] }],
      effects: [
        {
          trigger: "Static",
          actions: [
            { kind: "Digivolve", onto: { filter: { kind: ["Tamer"], colors: ["Black"] } }, asLevel: 3, from: "hand" },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } }],
        },
      ],
    });
  });

  it("digivolves onto a black Tamer and has Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "tamer" }],
        hand: [{ card: "BT7-061", as: "gigas" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("gigas").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-061" && s.state.memory === 0);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("tamer"), "Blocker")).toBe(true);
  });
});
