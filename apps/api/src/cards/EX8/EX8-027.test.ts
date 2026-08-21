import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-027.js";

describe("EX8-027", () => {
  it("plays a level 4 or lower Digimon from its digivolution cards when digivolving", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { count: 1 } }));
  it("can DNA digivolve into DS and attack after another DS Digimon is played or digivolves", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({ kind: "SubTrigger", actions: [{ kind: "DnaDigivolve" }, { kind: "Attack", optional: true }] });
    expect(actions[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
  });
  it("registers the live Plesiomon permanent with its DS trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-027", as: "plesiomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plesiomon"), "DS")).toBe(true);
  });
});
