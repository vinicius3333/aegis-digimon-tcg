import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-053.js";

describe("BT23-053 Strikedramon", () => {
  it("evolves into Cyberdramon for 2 less when its controller places an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "nonCs" },
            { card: "BT23-100", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const strikeId = s.perm("strike").permanentId;

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);

    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === strikeId)?.topCard?.cardId).toBe("BT23-055");
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === strikeId)?.stack.at(-1)?.cardId).toBe(
      "BT23-053",
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-020")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("may digivolve from hand into Cyberdramon or a CS Digimon for 2 less when your Option enters the battle area", () => {
    const effect = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(effect).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionPlayed",
      sourceFilter: { controller: "mine", kind: ["Option"] },
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true, kind: ["Digimon"] }, isSelf: true },
          into: {
            nameOrTrait: [
              { tokens: ["Cyberdramon"], match: "name" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
        },
      ],
    });
  });

  it("grants the inherited host +1000 DP permanently", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });
});
