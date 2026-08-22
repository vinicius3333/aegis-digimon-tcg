import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-069.js";
import "../index.js";

describe("EX11-069 Yuuki", () => {
  it("trashes a hand card and gains memory at start of main", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-069", as: "yuuki" }], hand: ["BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yuuki"));
    expect(s.state.memory).toBe(1);
  });
});
