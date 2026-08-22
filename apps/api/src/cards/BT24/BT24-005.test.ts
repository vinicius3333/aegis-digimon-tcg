import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-005.js";
import "../index.js";

describe("BT24-005 Kyokyomon", () => {
  it("reveals exactly three cards and lets the player return them to the top or bottom", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [{ kind: "RevealAdd", revealCount: 3, add: [], rest: "deckTopOrBottom" }],
        },
      ],
    });
  });

  it("reacts only when a Tamer is added to this host's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-006", as: "host", under: ["BT24-005"] }],
          hand: [{ card: "BT24-085", as: "addedTamer" }],
          deck: ["BT24-085", "BT24-066", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("addedTamer").instanceId],
    });
    await settle(() => s.state.players[0]!.hand.filter((card) => card.cardId === "BT24-085").length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT24-085")).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
