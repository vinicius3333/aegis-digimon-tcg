import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-11.js";

describe("ST16-11 WereGarurumon", () => {
  it("trashes one hand card to unsuspend itself after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-11", as: "weregarurumon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "ST16-08", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handCostId = s.inst("cost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("weregarurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("weregarurumon").isSuspended);

    expect(s.perm("weregarurumon").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === handCostId)).toBe(true);
  });

  it("uses its errata inherited effect to trash a hand card and delete a level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-12", as: "host", under: [{ card: "ST16-11" }] }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "ST16-08", as: "levelFour", suspended: true },
            { card: "ST16-11", as: "levelFive", suspended: true },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST16-08"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST16-11")).toBe(true);
  });

  it("cannot unsuspend when there is no card in hand to pay the activation cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-11", as: "weregarurumon" }] },
      1: { battleArea: [{ card: "ST16-08", as: "target", suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("weregarurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("weregarurumon").isSuspended);

    expect(s.perm("weregarurumon").isSuspended).toBe(true);
  });
});
