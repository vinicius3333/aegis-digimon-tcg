import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-054.js";

describe("EX8-054", () => {
  it("registers the printed keywords and once-per-turn effect windows", () => {
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(3);
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ActivateForeignEffect", zone: "digivolutionCards", fromTriggers: ["WhenDigivolving"] }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", optional: true });
  });
  it("exposes the three printed static keywords on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-054", as: "justimon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("justimon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("justimon"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("justimon"), "SecurityAttack")).toBe(1);
  });
});
