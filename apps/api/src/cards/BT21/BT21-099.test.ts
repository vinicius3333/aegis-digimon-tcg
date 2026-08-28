import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-099.js";
import "../index.js";

describe("BT21-099 Xros Up", () => {
  it("executes the Main placement by moving a Save Digimon from hand under an own Tamer", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT21-089", as: "tamer", under: [{ card: "BT1-009", as: "existing" }] }],
          hand: [
            { card: "BT14-057", as: "save" },
            { card: "BT21-099", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("save").instanceId)).toBe(false);
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT14-057")).toBe(true);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("save").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("places Save from hand/trash under a Tamer and offers Save digivolution from trash", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    const place = main?.actions[0];
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      from: ["hand", "trash"],
      target: { filter: { controller: "mine", kind: ["Digimon"], keywords: ["Save"] } },
      underFilter: { controller: "mine", kind: ["Tamer"] },
      position: "bottom",
      optional: true,
    });
    const digivolve = main?.actions[1];
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

  it("Security plays a cost-5-or-less Save Digimon from trash and adds itself to hand", async () => {
    const s = setup(
      {
        0: {
          security: [{ card: "BT21-099", as: "option" }],
          trash: [{ card: "BT14-057", as: "save" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("save").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
