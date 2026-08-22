import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT11-076.js";

describe("BT11-076 Ignitemon", () => {
  it("deletes another own Digimon and only an unsuspended opponent of no greater level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-076", as: "ignitemon" },
            { card: "BT1-015", as: "sacrifice" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "eligible" },
            { card: "BT1-081", as: "level-six" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const sacrificeId = s.perm("sacrifice").permanentId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ignitemon"));
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-081"]);
  });
});
