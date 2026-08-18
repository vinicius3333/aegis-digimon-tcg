import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-090.js";

describe("BT11-090 Nicolai Petrov", () => {
  it("grants Jamming to a Gaomon/Gaogamon-named Digimon at start of main", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT11-090", { card: "BT11-020", as: "gaogamon" }] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.state.players[0]!.battleArea[0]!);
    expect(observe(s.engine).hasKeyword(s.perm("gaogamon"), "Jamming")).toBe(true);
  });
});
