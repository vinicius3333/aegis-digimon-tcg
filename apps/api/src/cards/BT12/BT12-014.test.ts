import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-014.js";
describe("BT12-014 OmniShoutmon", () => {
  it("registers the deletion-budget clause without a residual gap", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-014")!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(JSON.stringify(card)).not.toContain("RawUnparsed");
  });

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

  it("keeps the printed 4000 total DP cap with no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-014", as: "omni" }] },
      1: { battleArea: [{ card: "BT12-038", as: "victim", dp: 5000 }] },
    }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
