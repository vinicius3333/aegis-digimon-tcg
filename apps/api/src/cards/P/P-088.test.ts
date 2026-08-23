import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-088.js";
import "../index.js"; // the full catalog is registered in a real match

describe("P-088 Siriusmon", () => {
  it("places a Gammamon from hand at stack bottom to gain +2000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "P-088", as: "siriusmon" },
            { card: "P-058", as: "gammamon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const gammamonId = s.inst("gammamon").instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    // AD1-002 slides under as a digivolution card and its own inherited "[Your Turn] +4000 DP"
    // applies too, so the placement's +2000 is read on top of that.
    const expectedDP = () => s.perm("base").baseDP + 2000 + 4000;
    await settle(
      () => s.perm("base").stack[0]?.instanceId === gammamonId && s.perm("base").currentDP === expectedDP(),
      5000,
    );

    expect(s.perm("base").stack[0]?.instanceId).toBe(gammamonId);
    expect(s.perm("base").currentDP).toBe(expectedDP());
  });

  it("deletes only 1 low-DP Digimon while below 12000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-088", as: "attacker", dp: 11000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 3000 },
            { card: "BT1-010", as: "second", dp: 4000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q4180: deletes 2 low-DP Digimon when it has 12000 DP or more", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-088", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000 },
            { card: "BT1-010", dp: 4000 },
            { card: "BT1-011", as: "tooLarge", dp: 7000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const tooLargeId = s.perm("tooLarge").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([tooLargeId]);
  });
});
