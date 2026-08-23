import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-056.js";

describe("BT6-056 Chikurimon", () => {
  it("De-Digivolves an opposing Digimon from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-056", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-016", under: [{ card: "BT1-010", as: "source" }], as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("source").instanceId);
  });
});
