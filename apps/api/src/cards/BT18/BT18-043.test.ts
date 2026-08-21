import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-043.js";

describe("BT18-043 Tinkermon", () => {
  it("reduces a qualifying multicolor digivolution by one memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-043", as: "tinkermon" }], hand: [{ card: "BT11-052", as: "evolving" }] },
    });
    await s.ready();
    s.state.memory = 10;
    const initialMemory = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tinkermon"));

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("tinkermon").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tinkermon").topCard?.instanceId === s.inst("evolving").instanceId);

    expect(s.perm("tinkermon").topCard?.cardId).toBe("BT11-052");
    expect(s.state.memory).toBe(initialMemory - 2);
  });
});
