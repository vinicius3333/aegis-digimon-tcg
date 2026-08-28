import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-111.js";

describe("P-111 Knightmon", () => {
  it("gives exactly one opposing Digimon -3000 DP per allied Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-111", as: "knightmon" }], battleArea: [{ card: "BT1-025", as: "ally" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "first" },
            { card: "BT1-025", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP === 5000);

    expect(s.perm("first").currentDP).toBe(5000);
    expect(s.perm("second").currentDP).toBe(11000);
    assertNoLoudGap(s);
  });

  it("inherited effect plays one yellow or black level 3 when another Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "host", under: ["P-111"] },
            { card: "BT1-025", as: "attacker" },
          ],
          hand: [{ card: "BT1-045", as: "rookie" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rookie").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rookie").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
