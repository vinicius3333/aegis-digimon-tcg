import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-011.js";
import "../index.js";

describe("BT24-011 Cyclonemon", () => {
  it("grants Rush and Raid as printed", () => {
    const staticKeywords = compiled.effects
      .filter((effect) => !effect.isInherited)
      .flatMap((effect) => effect.keywords ?? []);
    expect(staticKeywords.map((keyword) => keyword.keyword)).toEqual(["Rush", "Raid"]);
  });

  it("grants inherited Raid and keeps the TS level-3 alternate requirement", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
    expect(compiled.digivolutionRequirement ?? []).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("exposes printed and inherited keywords through observable game state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-011", as: "cyclonemon" },
          { card: "BT1-009", as: "host", under: ["BT24-011"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("cyclonemon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("cyclonemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);
  });

  it("digivolves from a level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: "BT24-011", as: "cyclonemon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("cyclonemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("cyclonemon").instanceId);

    expect(s.state.memory).toBe(3);
  });
});
