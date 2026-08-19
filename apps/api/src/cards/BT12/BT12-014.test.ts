import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-014.js";
import { module } from "./BT12-014.js";
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
});
