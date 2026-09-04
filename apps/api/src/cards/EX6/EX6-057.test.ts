import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-057.js";

describe("EX6-057 Lilithmon", () => {
  it("contains the granted end-of-turn deletion and once-per-turn protection IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("GainTriggeredEffect");
    expect(text).toContain("wouldLeavePlay");
    expect(text).toContain("OncePerTurn");
  });
  it("trashes opponent security only when an opposing Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    }));
  it("publicly trashes the opponent's top security when their Digimon is deleted on their turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-057", as: "lilith" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: 1 },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
