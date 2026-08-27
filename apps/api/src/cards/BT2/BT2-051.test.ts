import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-051.js";

describe("BT2-051 RustTyrannomon", () => {
  it("can attack an unsuspended Digimon with a green Tamer and suspends another after winning", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-051", as: "attacker", dp: 20000 },
            { card: "BT1-089", as: "greenTamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "defender", dp: 1000 },
            { card: "BT1-011", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.perm("other").isSuspended);

    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-051")).toBe(true);
  });

  it("Q1022 leaves the unsuspended target ready during battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-051", as: "attacker" },
          { card: "BT1-089", as: "greenTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT2-050", as: "defender", dp: 12000 }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT2-051"));

    expect(s.perm("defender").isSuspended).toBe(false);
  });

  it("cannot attack an unsuspended Digimon without a green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-051", as: "attacker" },
          { card: "BT1-085", as: "redTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "defender" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not suspend another Digimon when RustTyrannomon does not survive the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-051", as: "attacker" },
            { card: "BT1-089", as: "greenTamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-050", as: "defender", dp: 11000 },
            { card: "BT1-011", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT2-051") &&
        s.state.players[1]!.trash.some((card) => card.cardId === "BT2-050"),
    );

    expect(s.perm("other").isSuspended).toBe(false);
  });
});
