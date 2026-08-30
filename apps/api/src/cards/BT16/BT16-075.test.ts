import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-075.js";
import "../index.js";

describe("BT16-075", () => {
  it("returns a Dark Animal or Shaman Digimon from trash on play or digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash" }, count: 1 } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash" }, count: 1 } }],
    });
  });

  it("grants Rush to one of your Digimon when one is played as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { byEffect: true },
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn" }],
        },
      ],
    });
  });

  it("returns a qualifying Dark Animal from trash on play live", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-075", as: "cerberus" }], trash: [{ card: "BT16-068", as: "darkAnimal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cerberus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-068"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-068")).toBe(true);
  });
});
