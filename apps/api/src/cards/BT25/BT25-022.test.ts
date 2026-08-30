import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_022 } from "./BT25-022.js";
import "../index.js";

describe("BT25-022 Lunamon", () => {
  it("reveals three and adds one Iliad plus one TS trait card", () => {
    const effect = BT25_022.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
  });

  it("resolves both trait search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-022", as: "lunamon" }],
          deck: [
            { card: "BT24-011", as: "iliad" },
            { card: "BT25-086", as: "ts" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lunamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("iliad").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ts").instanceId) &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("iliad").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("preserves inherited Jamming", () => {
    expect(BT25_022.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }),
      ]),
    );
  });
});
