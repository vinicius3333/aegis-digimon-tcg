import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-099.js";

describe("P-099 Etemon", () => {
  it("De-Digivolves exactly 1 card on play and promotes the next source", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-099", as: "etemon" }] },
        1: {
          battleArea: [{
            card: "BT1-025",
            as: "target",
            under: [
              { card: "BT1-009", as: "bottom" },
              { card: "BT1-015", as: "promoted" },
            ],
          }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("etemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("promoted").instanceId);

    expect(s.state.players[1]!.trash.some(
      (card) => card.cardId === "BT1-025",
    )).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([
      s.inst("bottom").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("De-Digivolves exactly 1 card after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-057", as: "base" }],
          hand: [{ card: "P-099", as: "etemon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{
            card: "BT1-025",
            as: "target",
            under: [
              { card: "BT1-009", as: "bottom" },
              { card: "BT1-015", as: "promoted" },
            ],
          }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("etemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("promoted").instanceId);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("etemon").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-025")).toBe(true);
    assertNoLoudGap(s);
  });

  it("inherited On Deletion plays only an eligible cost-3 yellow or black Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", dp: 11000, as: "host", under: ["P-099"] }],
          hand: [
            { card: "BT2-055", as: "eligible" },
            { card: "BT2-057", as: "tooExpensive" },
          ],
        },
        1: { battleArea: [{ card: "BT4-073", dp: 13000, suspended: true, as: "winner" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId,
    ));

    expect(s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("tooExpensive").instanceId,
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
