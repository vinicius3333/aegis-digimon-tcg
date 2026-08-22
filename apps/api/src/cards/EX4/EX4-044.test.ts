import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-044.js";

describe("EX4-044 Greymon", () => {
  it("may digivolve another own Digimon into a level six or lower Garurumon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], costDelta: -2, optional: true, target: { filter: { controller: "mine", excludeSelf: true } }, into: { filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] } } });
  });
  it("has inherited self-unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ isInherited: true, actions: [{ kind: "Unsuspend" }] });
  });

  it("can digivolve another own Digimon into a Garurumon from hand", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX4-043", as: "garurumon" }], battleArea: [{ card: "EX4-044", as: "source" }, { card: "BT10-058", as: "other" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("other").topCard?.cardId === "EX4-043");

    expect(s.perm("other").topCard?.cardId).toBe("EX4-043");
  });
});
