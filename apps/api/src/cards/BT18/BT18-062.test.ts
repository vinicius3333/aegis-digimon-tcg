import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-062.js";

describe("BT18-062 Gladimon", () => {
  it("trashes a Knightmon-text card to protect an own Digimon from opponent deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "protectedDigimon" }],
          hand: [
            { card: "BT18-062", as: "gladimon" },
            { card: "BT18-099", as: "knightmonText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("protectedDigimon"), "beDeleted"));

    expect(observe(s.engine).isRestricted(s.perm("protectedDigimon"), "beDeleted")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("knightmonText").instanceId)).toBe(true);
  });
});
