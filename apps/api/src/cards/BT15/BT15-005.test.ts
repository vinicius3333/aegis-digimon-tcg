import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-005.js";

describe("BT15-005", () => {
  it("draws once when one of your Digimon becomes unsuspended during the opponent's turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });

  it("draws exactly once when two of its controller's Digimon unsuspend during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["BT15-005"] },
          { card: "BT1-009", as: "first", suspended: true },
          { card: "BT1-009", as: "second", suspended: true },
        ],
        deck: [
          { card: "BT1-001", as: "drawn" },
          { card: "BT1-001", as: "leftInDeck" },
        ],
      },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    await advance(s.engine).verb.unsuspend([s.perm("second").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw for an opponent's unsuspend or during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["BT15-005"] },
          { card: "BT1-009", as: "mine", suspended: true },
        ],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "theirs", suspended: true }] },
    });

    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("theirs").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);

    s.state.turnSeat = 0;
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
