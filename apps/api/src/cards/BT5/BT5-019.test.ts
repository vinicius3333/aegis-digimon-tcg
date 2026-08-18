import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-019.js";

describe("BT5-019 Shoutmon DX", () => {
  it("places a red Digimon under itself and deletes once per named source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-019", under: ["BT5-014"], as: "shoutmon" }],
          hand: [{ card: "BT5-014", as: "placed" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 5000 },
            { card: "BT1-011", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoutmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("shoutmon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Blitz")).toBe(true);
  });
});
