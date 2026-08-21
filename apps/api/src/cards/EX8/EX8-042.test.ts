import { describe, expect, it } from "vitest";
import { requireCardDefinition, PlayerState } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { compiled } from "./EX8-042.js";

describe("EX8-042", () => {
  it("has Fortitude and gains +3000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fortitude",
      raw: "＜Fortitude＞",
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)?.actions[0],
    ).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 3000 }, while: { kind: "selfIsSuspended" } });
  });
  it("applies the suspended +3000 DP aura in a live game", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-042", as: "mega", suspended: true }] } });
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).recompute();
    expect(player.battleArea[0]!.currentDP).toBe(requireCardDefinition("EX8-042").dp! + 3000);
  });
});
