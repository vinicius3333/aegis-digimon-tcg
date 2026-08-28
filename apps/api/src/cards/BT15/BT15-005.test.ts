import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-005.js";

describe("BT15-005", () => {
  it("draws once when a Digimon becomes unsuspended during the opponent's turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      sourceFilter: { kind: ["Digimon"] },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });

  it("draws exactly once when two Digimon unsuspend during the opponent's turn", async () => {
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

  it("draws for an opponent's unsuspend, but not during its controller's turn", async () => {
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
    expect(s.state.players[0]!.hand).toHaveLength(1);

    s.state.turnSeat = 0;
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("draws when the opponent's production unsuspend phase unsuspends a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-005"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "theirs", suspended: true }], deck: ["BT1-002"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
