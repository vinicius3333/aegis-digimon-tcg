import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-002.js";

describe("BT6-002 Kyaromon", () => {
  it("draws once when an opponent's digivolution card is trashed on your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-025", under: ["BT6-002"], as: "host" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT2-047", under: [{ card: "BT1-011", as: "source" }], as: "target" }] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("host"));
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("target").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("ignores own sources and draws only once for two opponent source-trash events", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-025", under: ["BT6-002"], as: "host" },
          { card: "BT2-047", under: [{ card: "BT1-011", as: "ownSource" }], as: "ownTarget" },
        ],
        deck: [
          { card: "BT1-010", as: "firstDraw" },
          { card: "BT1-012", as: "secondDraw" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT2-047", under: [{ card: "BT1-013", as: "oppSourceA" }], as: "oppA" },
          { card: "BT2-047", under: [{ card: "BT1-014", as: "oppSourceB" }], as: "oppB" },
        ],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("host"));

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("ownTarget").permanentId,
      [s.inst("ownSource").instanceId],
      0,
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("oppA").permanentId,
      [s.inst("oppSourceA").instanceId],
      0,
    );
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("oppB").permanentId,
      [s.inst("oppSourceB").instanceId],
      0,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("secondDraw").instanceId]);
  });

  it("does not draw when a bounce discards the opponent stack by rule (Q1399)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-025", under: ["BT6-002"], as: "host" }],
        deck: [{ card: "BT1-010", as: "notDrawn" }],
      },
      1: {
        battleArea: [{ card: "BT2-047", under: [{ card: "BT1-011", as: "source" }], as: "target" }],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("host"));

    await advance(s.engine).verb.returnToHand([s.perm("target").topCard.instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });
});
