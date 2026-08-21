import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-082.js";
import "../index.js";

describe("BT16-082 Ukkomon", () => {
  it("watches your breeding move once per turn, searches three, then may hatch", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          actions: [{ kind: "RevealAdd" }, { kind: "Hatch", optional: true }],
        },
      ],
    });
  });

  it("adds a Digimon or Tamer and bottoms the rest after a friendly move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-082", as: "ukko" },
            { card: "BT1-009", as: "moved" },
          ],
          deck: ["BT16-090", "BT1-009", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenMovedFromBreeding", {
      subjectPermanentId: s.perm("moved").permanentId,
    });
    await settle(() => s.state.players[0]?.hand.length === 1);
    expect(s.state.players[0]?.hand).toHaveLength(1);
    expect(s.state.players[0]?.deck).toHaveLength(1);
  });
});
