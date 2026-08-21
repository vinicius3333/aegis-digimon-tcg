import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-041.js";

describe("BT18-041 MetalEtemon", () => {
  it("reduces an opponent's Security Attack by 2 and De-Digivolves exactly 1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-041", as: "metal" }] },
      1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
    }, { autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("metal").topCard!);
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    expect(s.perm("target").topCard!.cardId).toBe("BT1-030");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
