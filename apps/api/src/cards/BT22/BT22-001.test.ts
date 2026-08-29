import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-001.js";

async function placeByEffect(s: ReturnType<typeof setupEngine>, permanentId: string, instanceIds: string[]) {
  advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
  try {
    await advance(s.engine).verb.placeUnder(permanentId, instanceIds);
  } finally {
    advance(s.engine).verb.leaveEffectResolution();
  }
}

describe("BT22-001 Puyoyomon", () => {
  it("requires effect provenance for its inherited stack-add watcher", () => {
    const watcher = compiled.effects[0]?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine", byEffect: true },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }] },
    });
  });

  it("draws once when an effect adds a Sea Animal Digimon to its inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT22-001"], as: "host" }],
        hand: [
          { card: "BT1-033", as: "firstSeaAnimal" },
          { card: "BT1-033", as: "secondSeaAnimal" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await placeByEffect(s, s.perm("host").permanentId, [s.inst("firstSeaAnimal").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    await placeByEffect(s, s.perm("host").permanentId, [s.inst("secondSeaAnimal").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw for a nonmatching Digimon, another stack, or the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-030", under: ["BT22-001"], as: "host" },
          { card: "BT6-030", as: "otherHost" },
        ],
        hand: [
          { card: "BT1-010", as: "nonmatching" },
          { card: "BT1-033", as: "wrongStack" },
          { card: "BT1-033", as: "opponentTurn" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("nonmatching").instanceId]);
    await advance(s.engine).verb.placeUnder(s.perm("otherHost").permanentId, [s.inst("wrongStack").instanceId]);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("opponentTurn").instanceId]);

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
