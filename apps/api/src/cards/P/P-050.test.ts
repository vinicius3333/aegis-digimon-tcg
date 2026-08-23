import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-050.js";

describe("P-050 WarGreymon", () => {
  it("deletes an opponent Digimon with 13000 DP or more when digivolving with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-002", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-050", as: "source" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 13000 },
            { card: "BT1-009", as: "too-small", dp: 12000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const eligibleId = s.perm("eligible").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("too-small").permanentId),
    ).toBe(true);
  });

  it("does not delete the 13000-DP target without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [{ card: "P-050", as: "source" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("deletes only an opponent Digimon with 4000 DP or less when attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-050", as: "attacker" }] },
        1: {
          security: ["BT1-028"],
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 4000 },
            { card: "BT1-009", as: "too-large", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").topCard!.instanceId);
    await s.ready();
    const eligibleId = s.perm("eligible").permanentId;
    const tooLargeId = s.perm("too-large").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tooLargeId)).toBe(true);
  });
});
