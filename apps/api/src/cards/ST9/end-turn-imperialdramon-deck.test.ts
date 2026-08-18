import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST9-05.js";
import "./ST9-08.js";

describe("ST9 end-of-turn Imperialdramon deck gauntlet", () => {
  it("uses the public end-phase flow to DNA with Wormmon before handing over the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-09", as: "greenMaterial", under: ["ST9-08"] },
            { card: "ST9-04", as: "blueMaterial" },
          ],
          hand: [{ card: "ST9-05", as: "paildramon" }, "ST9-02"],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          hand: ["ST9-02"],
          deck: ["BT1-003"],
          battleArea: [{ card: "ST9-03", as: "returnTarget" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const targetInstanceId = s.perm("returnTarget").topCard.instanceId;

    await advance(s.engine).runTurn(0);

    const paildramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("paildramon").instanceId,
    );
    expect(paildramon).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(paildramon!.isSuspended).toBe(false);
    expect(paildramon!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST9-09", "ST9-08", "ST9-04"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetInstanceId);
  });
});
