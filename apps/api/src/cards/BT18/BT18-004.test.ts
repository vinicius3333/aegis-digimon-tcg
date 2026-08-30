import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-004.js";

describe("BT18-004 Puroromon", () => {
  it("places a Royal Base Digimon face up at security bottom and adds the top security card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      isInherited: true,
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          toTop: true,
          cost: {
            kind: "place",
            target: {
              filter: { zone: "hand", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] },
            },
          },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["BT18-004"] }],
          hand: [
            { card: "BT1-030", as: "nonRoyal" },
            { card: "BT18-044", as: "royal" },
          ],
          security: [{ card: "BT1-001", as: "top" }],
          deck: ["BT1-002"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT18-044");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonRoyal").instanceId)).toBe(true);
  });

  it("may decline without moving either the hand card or top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["BT18-004"] }],
          hand: [{ card: "BT18-044", as: "royal" }],
          security: [{ card: "BT1-001", as: "top" }],
          deck: ["BT1-002"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("royal").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });
});
