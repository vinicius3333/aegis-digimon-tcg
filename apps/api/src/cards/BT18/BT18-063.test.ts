import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-063.js";

describe("BT18-063 Beetlemon", () => {
  it("prevents opponent-effect deletion after digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-057", as: "base" }], hand: [{ card: "BT18-063", as: "beetlemon" }] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("beetlemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-063");
    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("base").topCard!);
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "beDeleted"));

    expect(observe(s.engine).isRestricted(s.perm("base"), "beDeleted")).toBe(true);
  });
});
