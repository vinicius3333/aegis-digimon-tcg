import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-021.js";

describe("EX1-021 MetalGarurumon", () => {
  it("gains 1 memory for every 4 cards in hand when digivolving", async () => {
    const filler = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-017", as: "base" }], hand: [...filler, { card: "EX1-021", as: "evo" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("bottom-decks an On Deletion Digimon and trashes all of its sources with 8 cards and a Tamer", async () => {
    const hand = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-021", as: "metalGarurumon" },
            { card: "ST2-12", as: "tamer" },
          ],
          hand,
        },
        1: {
          battleArea: [
            {
              card: "EX1-034",
              as: "target",
              under: [
                { card: "BT1-069", as: "source1" },
                { card: "BT1-070", as: "source2" },
              ],
            },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const sourceIds = [s.inst("source1").instanceId, s.inst("source2").instanceId];
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "EX1-034")).toBe(true);
    expect(sourceIds.every((id) => s.state.players[1]!.trash.some((card) => card.instanceId === id))).toBe(true);
  });
});
