import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-102.js";

describe("P-102 SkullGreymon", () => {
  it("Q4187 may delete itself as cost, delete 2 small enemies, then play a rookie on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-102", as: "skullgreymon" }],
          trash: [{ card: "BT1-009", as: "rookie" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 4000, as: "firstVictim" },
            { card: "BT1-011", dp: 5000, as: "secondVictim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const victimIds = [s.perm("firstVictim").permanentId, s.perm("secondVictim").permanentId];
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("skullgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("rookie").instanceId,
        ) && victimIds.every((id) => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === id)),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("skullgreymon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q4187 also permits self-deletion after digivolving and resolves the full chain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-074", as: "base" }],
          hand: [{ card: "P-102", as: "skullgreymon" }],
          trash: [{ card: "BT2-069", as: "rookie" }],
          deck: [{ card: "BT1-001", as: "evolutionDraw" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 4000, as: "firstVictim" },
            { card: "BT1-011", dp: 5000, as: "secondVictim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const victimIds = [s.perm("firstVictim").permanentId, s.perm("secondVictim").permanentId];
    const baseCardInstanceId = s.perm("base").topCard.instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("rookie").instanceId,
        ) && victimIds.every((id) => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === id)),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("skullgreymon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === baseCardInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("inherited On Deletion plays exactly 1 eligible red or purple level 3 from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", dp: 11000, as: "host", under: ["P-102"] }],
          trash: [
            { card: "BT2-069", as: "eligible" },
            { card: "BT1-028", as: "wrongColor" },
          ],
        },
        1: { battleArea: [{ card: "BT4-073", dp: 13000, suspended: true, as: "winner" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId,
      ),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongColor").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
