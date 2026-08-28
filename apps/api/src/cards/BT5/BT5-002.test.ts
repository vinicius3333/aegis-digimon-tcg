import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-002.js";

describe("BT5-002 Tsunomon", () => {
  it("gives its Garurumon host +1000 DP on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-114", as: "host", under: ["BT5-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("also recognizes Omnimon but not an unrelated Greymon name", async () => {
    const omnimon = setupEngine({ 0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-002"] }] } });
    await omnimon.engine.recomputeContinuousEffects();
    expect(omnimon.perm("host").currentDP).toBe(omnimon.perm("host").baseDP + 1000);

    const unrelated = setupEngine({ 0: { battleArea: [{ card: "BT4-113", as: "host", under: ["BT5-002"] }] } });
    await unrelated.engine.recomputeContinuousEffects();
    expect(unrelated.perm("host").currentDP).toBe(unrelated.perm("host").baseDP);
  });

  it("only applies during the owner's turn and follows a legal evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT4-114",
            as: "host",
            // BT5-002 (Lv.2) -> BT1-029 (Lv.3) -> BT1-036 (Lv.4) ->
            // BT1-040 (Lv.5) -> BT4-114 (Lv.6), all on blue requirements.
            under: ["BT5-002", "BT1-029", "BT1-036", "BT1-040"],
          },
        ],
      },
    });
    const host = s.perm("host");
    expect(host.stack.map((card) => card.cardId)).toEqual(["BT5-002", "BT1-029", "BT1-036", "BT1-040"]);

    await s.ready();
    expect(host.currentDP).toBe(host.baseDP + 1000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(host.currentDP).toBe(host.baseDP);
  });

  it("does not grant the inherited bonus to a matching host without Tsunomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-114", as: "host" }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
