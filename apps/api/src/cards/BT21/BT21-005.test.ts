import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-005.js";
import "../index.js";

describe("BT21-005 Swipemon", () => {
  it("encodes the inherited once-per-turn trigger only for this Digimon getting linked", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("draws when the realistic Swipemon evolution stack gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-005", "BT21-009"] }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-005", "BT21-009"]);
  });

  it("ignores another Digimon getting linked and draws only once for its own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-018", as: "host", under: ["BT21-005"] },
            { card: "BT21-009", as: "other" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when its stack gets linked during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-018", as: "host", under: ["BT21-005"] }],
        deck: ["BT1-001"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
