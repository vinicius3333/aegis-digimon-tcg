import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-052.js";
import "../index.js";

describe("EX4-052 Fake Agumon Expert", () => {
  it("once per turn draws two after an opponent Digimon is deleted by trashing a same-level hand card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 2 }],
          cost: { kind: "trash", target: { filter: { levelMatchesTriggerSource: true } } },
        },
      ],
    });
  });

  it("publicly pays a same-level Digimon hand cost before drawing two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-052", as: "host" }],
          hand: [
            { card: "BT1-009", as: "sameLevelCost" },
            { card: "BT4-005", as: "levellessCost" },
          ],
          deck: [{ card: "BT1-010" }, { card: "BT1-012" }, { card: "BT1-013" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length >= 3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sameLevelCost").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levellessCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(3);
  });
});
