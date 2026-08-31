import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
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

  it("adds a Digimon or Tamer, bottoms the rest, and may hatch after a natural move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-082", as: "ukko" }],
          breeding: { card: "BT1-009", as: "moved" },
          deck: ["BT16-090", "BT1-009", "BT1-090"],
          eggDeck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("moved").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]?.hand.length === 1 &&
        s.state.players[0]?.deck.length === 2 &&
        s.state.players[0]?.breeding?.topCard?.cardId === "BT1-001",
    );
    expect(s.state.players[0]?.hand).toHaveLength(1);
    expect(s.state.players[0]?.deck).toHaveLength(2);
    expect(s.state.players[0]?.breeding?.topCard?.cardId).toBe("BT1-001");
  });
});
