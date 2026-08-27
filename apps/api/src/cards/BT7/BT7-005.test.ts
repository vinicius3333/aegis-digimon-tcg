import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-005.js";

describe("BT7-005 Dorimon", () => {
  it("draws once when an effect places digivolution cards under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-061", under: ["BT7-005"], as: "host" }],
        hand: [{ card: "BT1-010", as: "placed" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("placed").instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
  });

  it("Q1505 draws only one card when one effect places multiple cards under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-061", under: ["BT7-005"], as: "host" }],
        hand: [
          { card: "BT1-010", as: "firstPlaced" },
          { card: "BT1-011", as: "secondPlaced" },
        ],
        deck: [
          { card: "BT1-012", as: "drawn" },
          { card: "BT1-013", as: "notDrawn" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [
      s.inst("firstPlaced").instanceId,
      s.inst("secondPlaced").instanceId,
    ]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
  });

  it("Q1504 does not draw when the host digivolves by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", under: ["BT7-005"], as: "host" }],
        hand: [{ card: "BT1-015", as: "evolution" }],
        deck: [{ card: "BT1-011", as: "wouldBeDrawn" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.digivolveFromInstance(s.perm("host").permanentId, s.inst("evolution").instanceId);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-015");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("wouldBeDrawn").instanceId);
  });
});
