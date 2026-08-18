import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-025.js";
import "./EX2-061.js";

describe("EX2-025 Terriermon", () => {
  it("gains 1 memory once when its controller plays a green Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-025"], hand: [{ card: "EX2-061", as: "henry" }] } }, { autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("henry").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.state.memory).toBe(7);
  });
});
