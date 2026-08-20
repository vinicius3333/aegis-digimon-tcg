import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-037.js";

describe("EX12-037 Omnimon", () => {
  it("shares the once-per-turn limit between When Digivolving and When Attacking", () => {
    const effects = registeredCompiledCards.get("EX12-037")!.effects.filter((e) => ["WhenDigivolving", "WhenAttacking"].includes(e.trigger));
    expect(effects).toHaveLength(2);
    expect(effects.map((e) => e.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
  });
});
