import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-007.js";
import "../index.js";

describe("BT24-007 Tsunomon", () => {
  it("plays one level 4+ Demon/Titan Digimon from trash with a 2-cost reduction", () => {
    const effect = compiled.effects[0]!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenHandTrashed",
      fireCondition: { kind: "triggerHandTrashedSeat", seat: "mine" },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              levelComparison: { op: "gte", value: 4 },
              nameOrTrait: [
                { tokens: ["Demon"], match: "trait" },
                { tokens: ["Titan"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("plays a qualifying Titan from trash when your hand is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-008", as: "host", under: ["BT24-007"] }],
          trash: [{ card: "BT24-045", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0 });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-045"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-045")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-045")).toBe(false);
  });
});
