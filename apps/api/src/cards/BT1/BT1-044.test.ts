import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-044.js";
import "./BT1-029.js";

describe("BT1-044 MetalGarurumon", () => {
  it("plays a level 4 or lower digivolution card as another Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-044", as: "attacker", under: [{ card: "BT1-032", as: "source" }] }] },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-044", "BT1-032"]);
    expect(s.perm("attacker").stack).toHaveLength(0);
  });

  it("must play an eligible Digimon source unsuspended, fires On Play, and leaves Digi-Eggs underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-003", as: "egg" },
                { card: "BT1-029", as: "gabumon" },
              ],
            },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnCount = 3;
    const gabumonInstanceId = s.inst("gabumon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === gabumonInstanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === gabumonInstanceId)!;
    expect(played.isSuspended).toBe(false);
    expect(played.currentDP).toBe(played.baseDP);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("does not play a level 5 Digimon or Digi-Egg from its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-003", as: "egg" },
                { card: "BT1-039", as: "levelFive" },
              ],
            },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([
      s.inst("egg").instanceId,
      s.inst("levelFive").instanceId,
    ]);
  });

  it("only plays an eligible source from the attacking MetalGarurumon's own stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-044", as: "attacker", under: [{ card: "BT1-032", as: "source" }] },
          { card: "BT1-039", as: "otherOwn", under: [{ card: "BT1-032", as: "wrongOwn" }] },
        ],
      },
      1: { battleArea: [{ card: "BT1-039", as: "opponent", under: [{ card: "BT1-032", as: "wrongOpponent" }] }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId)).toBe(
      true,
    );
    expect(s.perm("otherOwn").stack.map((card) => card.instanceId)).toEqual([s.inst("wrongOwn").instanceId]);
    expect(s.perm("opponent").stack.map((card) => card.instanceId)).toEqual([s.inst("wrongOpponent").instanceId]);
  });
});
