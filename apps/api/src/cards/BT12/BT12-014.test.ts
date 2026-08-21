import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-014.js";
describe("BT12-014 OmniShoutmon", () => {
  it("adds 3000 to its deletion budget per 2 digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-011"] }] },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps the base 4000 deletion ceiling without digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-014", as: "omni" }] },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT12-038");
  });

  it("adds two 3000 increments for four digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-014", as: "omni", under: ["BT12-008", "BT12-011", "BT12-008", "BT12-011"] }],
        },
        1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
