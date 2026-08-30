import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-005.js";
import "./BT8-092.js";

describe("BT8-005 Kyokyomon", () => {
  it("gives its host +1000 DP when an effect places a digivolution card under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-092", as: "yuji" },
            { card: "BT8-060", as: "host", under: ["BT8-005"] },
          ],
          hand: [{ card: "BT8-060", as: "placed" }],
        },
        1: { security: ["BT1-093"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("host").currentDP;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP > before);

    expect(s.perm("host").currentDP).toBe(before + 1000);
  });

  it("applies only once when two effects place cards under the host in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-060", as: "host", under: ["BT8-005"] }],
        hand: [
          { card: "BT8-060", as: "placedOne" },
          { card: "BT8-060", as: "placedTwo" },
        ],
      },
    });
    const before = s.perm("host").currentDP;
    const hostId = s.perm("host").permanentId;

    await advance(s.engine).verb.placeUnder(hostId, [s.inst("placedOne").instanceId]);
    expect(s.perm("host").currentDP).toBe(before + 1000);
    await advance(s.engine).verb.placeUnder(hostId, [s.inst("placedTwo").instanceId]);

    expect(s.perm("host").stack).toHaveLength(3);
    expect(s.perm("host").currentDP).toBe(before + 1000);
  });

  it("does not grant DP when an effect places a card under a different Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-092", as: "yuji" },
            { card: "BT8-060", as: "host", under: ["BT8-005"] },
            { card: "BT8-063", as: "other" },
          ],
          hand: [{ card: "BT8-060", as: "placed" }],
        },
        1: { security: ["BT1-093"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("host").currentDP;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("other").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.perm("host").currentDP).toBe(before);
  });
});
