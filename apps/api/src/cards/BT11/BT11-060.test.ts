import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-060.js";

describe("BT11-060 Monmon", () => {
  it("maps the catalog facts and opponent-only return protection to IR", () => {
    expect(getCardDefinition("BT11-060")).toMatchObject({
      cardId: "BT11-060",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Beast"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [{ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true }],
      },
    ]);
  });

  it("continuously prevents opponent-effect returns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-060", as: "monmon" },
          { card: "BT1-075", as: "neighbor" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("monmon"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("neighbor"), "beReturned")).toBe(false);
  });
});
