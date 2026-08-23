import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-030.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";

describe("BT14-030", () => {
  it("registers the return-to-hand effects on play and digivolution", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "Return", optional: true, abortOnDecline: true });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({ kind: "Return", optional: true, abortOnDecline: true });
  });
  it("registers the once-per-turn recovery watcher", () =>
    expect(compiled.effects[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDigimonReturnsToHand" }],
    }));

  it("recovers when another Digimon returns to hand during your turn", async () => {
    const s = setup({
      0: {
        battleArea: [
          { card: "BT14-030", as: "marine" },
          { card: "BT1-009", as: "ownDigimon" },
        ],
        security: [{ card: "BT1-001" }],
        deck: [{ card: "BT1-002" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.turnSeat = 0;

    await advance(s.engine).verb.returnToHand([s.perm("ownDigimon").topCard!.instanceId]);
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
