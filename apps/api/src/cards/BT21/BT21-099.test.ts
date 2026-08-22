import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-099.js";
import "../index.js";

describe("BT21-099 Xros Up", () => {
  it("executes the Main placement by moving a Save Digimon from hand under an own Tamer", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT12-087", as: "tamer" }],
          hand: [{ card: "BT14-057", as: "save" }, { card: "BT21-099", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId)).toBe(false);
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT14-057")).toBe(true);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("places Save from hand/trash under a Tamer and offers Save digivolution from trash", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    const place = main?.actions[0] as any;
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      from: ["hand", "trash"],
      target: { filter: { controller: "mine", kind: ["Digimon"], keywords: ["Save"] } },
      underFilter: { controller: "mine", kind: ["Tamer"] },
      optional: true,
    });
    const digivolve = main?.actions[1] as any;
    expect(digivolve).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      optional: true,
      into: { kind: ["Digimon"], keywords: ["Save"] },
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
      target: { filter: { playCostLte: 5, keywords: ["Save"] } },
    });
    expect(security?.actions[1]).toEqual({ kind: "AddToHandSelf" });
  });
});
