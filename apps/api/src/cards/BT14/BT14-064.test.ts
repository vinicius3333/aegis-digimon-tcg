import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-064.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-064", () => {
  it("reveals three to optionally play a D-Brigade or DigiPolice card costing four or less on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "trash",
        add: [{ to: "play", optional: true, filter: { playCostLte: 4 } }],
      });
  });
  it("inherits a once-per-turn Commandramon play response when another own Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "play", payCost: false }] }],
        },
      ],
    }));
  it("plays a revealed low-cost D-Brigade card", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-064", as: "source" }], deck: ["BT14-056", "BT1-001", "BT1-002"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-056"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-056")).toBe(true);
  });
});
