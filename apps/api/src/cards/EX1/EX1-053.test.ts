import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-053.js";

describe("EX1-053 MetalEtemon", () => {
  it("gets +1000 DP per Etemon card in trash on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-053", as: "metalEtemon", dp: 11000 }],
          hand: ["BT1-009"],
          trash: ["EX1-052", "EX1-053", "EX1-054"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    await s.ready();
    expect(s.perm("metalEtemon").currentDP).toBe(13000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not scale on its own turn when no Etemon is in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-053", as: "metalEtemon", dp: 11000 }] },
    });
    await s.ready();
    expect(s.perm("metalEtemon").currentDP).toBe(11000);
  });

  it("de-digivolves an opposing Digimon by 1 after a real battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-053", as: "metalEtemon", dp: 1000 }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "EX1-054", as: "target", under: ["EX1-052"], suspended: true }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalEtemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-053"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX1-054"));
    expect(s.perm("target").topCard.cardId).toBe("EX1-052");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
