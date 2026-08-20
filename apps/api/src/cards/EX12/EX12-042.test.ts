import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-042.js";

describe("EX12-042 Gatomon", () => {
  it("shares the once-per-turn security sequence across play and attack", () => {
    const effects = registeredCompiledCards.get("EX12-042")!.effects.filter((e) => ["OnPlay", "WhenAttacking"].includes(e.trigger));
    expect(effects.map((e) => e.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
  });
});
