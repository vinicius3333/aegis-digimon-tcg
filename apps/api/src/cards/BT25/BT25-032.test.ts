import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_032 } from "./BT25-032.js";
import "../index.js";

describe("BT25-032 Liollmon", () => {
  it("reveals three and adds one card from each required trait pool", () => {
    const effect = BT25_032.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          colors: ["Yellow"],
          nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }],
        },
      }),
    ]);
  });

  it("keeps inherited Barrier", () => {
    expect(BT25_032.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });

  it("naturally plays and takes distinct cards for the Glowing Dawn and yellow BEATBREAK slots", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-032", as: "liollmon" }],
          deck: [
            { card: "BT25-035", as: "first" },
            { card: "BT25-032", as: "second" },
            { card: "BT25-046", as: "wrongColor" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("first").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("wrongColor").instanceId]);
    expect(s.state.memory).toBe(0);
  });
});
