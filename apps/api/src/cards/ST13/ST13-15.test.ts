import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-15.js";

describe("ST13-15 Direct Smasher", () => {
  it("waives its color requirement with Legend-Arms and deletes the highest-DP Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST13-09"], hand: [{ card: "ST13-15", as: "smasher" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low", dp: 3000 },
          { card: "BT1-010", as: "high", dp: 9000 },
        ],
      },
    });
    const highId = s.perm("high").permanentId;
    const highCardId = s.perm("high").topCard.instanceId;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smasher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === highCardId)).toBe(true);
  });

  it("deletes exactly one Digimon when the highest DP is tied", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST13-09"], hand: [{ card: "ST13-15", as: "smasher" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 9000 },
            { card: "BT1-010", as: "second", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smasher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not waive its red color requirement without a Legend-Arms Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["ST13-08"],
        hand: [{ card: "ST13-15", as: "smasher" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("smasher").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("activates its Main effect from Security and deletes the attacker's highest-DP ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 3000 },
            { card: "BT1-010", as: "highest", dp: 9000 },
          ],
        },
        1: { security: ["ST13-15"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const highestId = s.perm("highest").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === highestId));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
  });
});
