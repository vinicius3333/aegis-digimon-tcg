import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-083.js";

describe("BT4-083 Cerberusmon", () => {
  it("draws 2 and then trashes 1 card when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "cerberus", under: ["BT4-082"] }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await (s.engine as any).primitives.deletePermanent([s.perm("cerberus").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
