import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_047 } from "./BT25-047.js";
import "../index.js";

describe("BT25-047 Floramon", () => {
  it("reveals three and adds Vegetation/Shaman plus TS", () => {
    const onPlay = BT25_047.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect((onPlay?.actions?.[0] as { add?: unknown }).add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vegetation", "Shaman"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
    const inherited = BT25_047.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
    });
  });

  it("resolves both search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-047", as: "floramon" }],
          deck: [
            { card: "BT1-065", as: "vegetation" },
            { card: "BT25-034", as: "ts" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("floramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("vegetation").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ts").instanceId) &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("vegetation").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });
});
