import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-048.js";

describe("BT12-048 Dracmon", () => {
it("places up to three revealed Tamers from hand at deck bottom and draws that many", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-048", as: "dracmon" }],
          hand: [
            { card: "BT12-087", as: "tamer1" },
            { card: "BT12-087", as: "tamer2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dracmon"));
    await settle(() => s.state.players[0]!.hand.length === handBefore);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual([
      s.inst("tamer1").instanceId,
      s.inst("tamer2").instanceId,
    ]);
});

it("does not draw or move cards when the hand has no Tamers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT12-048", as: "dracmon" }],
      hand: ["BT1-009"],
      deck: ["BT1-010", "BT1-011"],
    },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dracmon"));
  await settle(() => s.state.pendingDecision === undefined);
  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
  expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
});

it("gives an inherited Save host 2000 DP during its controller's turn", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-048"] }] },
  });
  await s.ready();
  expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
});
});
