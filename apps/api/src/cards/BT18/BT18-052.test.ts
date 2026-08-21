import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-052.js";

describe("BT18-052 CannonBeemon", () => {
  it("de-digivolves an exact opposing target once per face-up security card and grants Insectoid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-052", as: "cannon" }], security: [{ card: "BT1-001", faceUp: true }, { card: "BT1-002", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030", "BT1-009", "BT1-010"] }] },
    }, { autoSelectCards: true });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("cannon"), "Insectoid")).toBe(true);
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("cannon").topCard!);
    await s.ready();

    expect(s.perm("target").topCard?.cardId).toBe("BT1-010");
    expect(s.perm("target").stack).toHaveLength(2);
  });
});
