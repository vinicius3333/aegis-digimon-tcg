import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-077.js";

describe("BT12-077 Arresterdramon", () => {
  it("gains Rush when digivolving with at least 2 digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-077", as: "arrester", under: ["BT1-009", "BT1-010"] }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arrester"));
    expect(observe(s.engine).hasKeyword(s.perm("arrester"), "Rush")).toBe(true);
  });
});
