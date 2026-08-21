import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-029.js";

describe("EX8-029", () => {
  it("returns opposing Digimon up to total play cost 14 and plays DS cards from digivolution cards when DNA digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Return", to: "deckBottom", target: { totalPlayCostBudget: 14, upTo: true } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({ kind: "PlayMultiple", totalCost: 12, from: ["digivolutionCards"], condition: { kind: "isDnaDigivolving" } });
  });
  it("grants DS immunity with memory and restricts opposing On Play effects at low memory, plus Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([{ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "memoryAtLeast", value: 1 } }, { kind: "Aura", while: { kind: "memoryAtMost", value: 1 } }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Aquatic"] });
  });

  it("disables opposing On Play effects only at 1 or less memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-029", as: "aegisdramon" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    await s.ready();

    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(true);

    s.state.memory = 2;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "activateOnPlay")).toBe(false);
  });
});
