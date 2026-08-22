import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-043.js";

describe("EX4-043 Garurumon", () => {
  it("may digivolve another own Digimon into a level six or lower Greymon from hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], optional: true, target: { filter: { controller: "mine", excludeSelf: true } }, into: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] } });
  });
  it("has inherited self-unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ isInherited: true, actions: [{ kind: "Unsuspend" }] });
  });

  it("can digivolve another own Digimon into a Greymon from hand", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX4-044", as: "greymon" }], battleArea: [{ card: "EX4-043", as: "source" }, { card: "BT1-009", as: "other" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("other").topCard?.cardId === "EX4-044");

    expect(s.perm("other").topCard?.cardId).toBe("EX4-044");
  });
});
