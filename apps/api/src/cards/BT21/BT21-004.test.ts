import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-004.js";
import "../index.js";

describe("BT21-004 Koromon", () => {
  it("encodes the inherited once-per-turn trigger for one of your red or yellow Tamers", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["red", "BT1-085"],
    ["yellow", "BT1-087"],
    ["red/yellow", "BT12-092"],
  ])("draws when your %s Tamer suspends", async (_label, tamer) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "host", under: ["BT21-004"] },
          { card: tamer, as: "tamer" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("tamer").permanentId,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-004"]);
  });

  it.each([
    ["your blue Tamer", 0, "BT1-086"],
    ["your red Digimon", 0, "BT1-009"],
    ["an opponent red Tamer", 1, "BT1-085"],
  ])("does not draw for %s", async (_label, seat, card) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "host", under: ["BT21-004"] },
          ...(seat === 0 ? [{ card, as: "subject" }] : []),
        ],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { battleArea: seat === 1 ? [{ card, as: "subject" }] : [] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("subject").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once when multiple matching Tamers suspend in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "host", under: ["BT21-004"] },
          { card: "BT1-085", as: "red" },
          { card: "BT1-087", as: "yellow" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("red").permanentId });
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("yellow").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
