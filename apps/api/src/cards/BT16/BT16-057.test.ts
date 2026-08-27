import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-057.js";
import "../index.js";

describe("BT16-057", () => {
  it("de-digivolves an opposing Digimon by 1 by placing another DigiPolice Digimon underneath itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }],
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
        },
      ],
    });
  });

  it("cannot attack on your turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "permanent",
          condition: { kind: "selfHasNoDigivolutionCards" },
        },
      ],
    });
  });

  it("restricts attacking only while it has no digivolution cards", async () => {
    const empty = setupEngine({ 0: { battleArea: [{ card: "BT16-057", as: "empty" }] } });
    await empty.engine.recomputeContinuousEffects();
    expect(observe(empty.engine).isRestricted(empty.perm("empty"), "attack")).toBe(true);

    const stacked = setupEngine({ 0: { battleArea: [{ card: "BT16-057", as: "stacked", under: ["BT16-050"] }] } });
    await stacked.engine.recomputeContinuousEffects();
    expect(observe(stacked.engine).isRestricted(stacked.perm("stacked"), "attack")).toBe(false);
  });
});
