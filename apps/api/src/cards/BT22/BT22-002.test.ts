import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-002.js";

describe("BT22-002 Kyaromon", () => {
  it("draws only once when another owned Puppet Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-002"], as: "host" },
          { card: "BT2-055", as: "firstPuppet" },
          { card: "BT2-055", as: "secondPuppet" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);
    await advance(s.engine).verb.deletePermanent([s.perm("secondPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw for a non-Puppet, an opponent's Puppet, its own host, or on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-002"], as: "host" },
          { card: "BT1-010", as: "nonPuppet" },
          { card: "BT2-055", as: "wrongTurnPuppet" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "BT2-055", as: "opponentPuppet" }] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("nonPuppet").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("opponentPuppet").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("wrongTurnPuppet").permanentId], "byEffect");
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("models Tokens and Puppet Digimon as alternatives rather than requiring a Puppet Token", () => {
    const watcher = compiled.effects[0]?.actions[0] as any;
    expect(watcher.sourceFilter).toMatchObject({
      controller: "mine",
      excludeSelf: true,
      or: [
        { isToken: true },
        {
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
        },
      ],
    });
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
  });
});
