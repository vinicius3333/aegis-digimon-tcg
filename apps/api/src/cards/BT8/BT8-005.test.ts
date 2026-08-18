import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-005.js";
import "./BT8-092.js";

describe("BT8-005 Kyokyomon", () => {
  it("gives its host +1000 DP when an effect places a digivolution card under it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-092", as: "yuji" },
          { card: "BT8-063", as: "host", under: ["BT8-005"] },
        ],
        hand: [{ card: "BT8-060", as: "placed" }],
      },
      1: { security: ["BT8-033"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const before = s.perm("host").currentDP;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP > before);

    expect(s.perm("host").currentDP).toBe(before + 1000);
  });
});
