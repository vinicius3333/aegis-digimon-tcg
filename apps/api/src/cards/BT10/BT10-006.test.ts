import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-006.js";

// A3 for BT10-006 (Tokomon) — inherited rider:
//   "[Opponent's Turn] When an effect trashes this digivolution card, Draw 1."
// source: documented behavior (EffectTiming.OnDigivolutionCardDiscarded, isSelfRef).
//
// The override installs a SubTrigger watcher on `onDigivolutionCardDiscarded` under the
// `OpponentsTurn` turn-gate; trashDigivolutionCards fires that event per card trashed.
//
// FAILS-WHEN-REVERTED:
//   - Positive draws 0 if the SubTrigger consumer is removed or the onDigivolutionCardDiscarded
//     fire seam (primitives.ts trashDigivolutionCards) is dropped.
//   - Negative draws 1 if the `OpponentsTurn` turnOwnerGuard is removed (the watcher would arm
//     on the controller's OWN turn too).

describe("BT10-006 [Opponent's Turn] this digivolution card trashed by effect → Draw 1", () => {
  it("draws 1 when its host's BT10-006 is trashed during the OPPONENT's turn (positive)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            dp: 3000,
            as: "host",
            // BT10-006 sits as a digivolution card under the host — the inherited effect source.
            under: [{ card: "BT10-006", as: "digiCard", faceUp: false }],
          },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1; // opponent's turn relative to p0 (the host's controller)

    const host = s.perm("host");
    const digiCard = s.inst("digiCard");
    const deckBefore = p0.deck.length;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trashDigivolutionCards(host.permanentId, [digiCard.instanceId], 1);
    await settle(() => p0.deck.length < deckBefore);

    expect(p0.deck.length).toBe(deckBefore - 1); // Draw 1 fired
  });

  it("does NOT draw when trashed during the CONTROLLER's own turn (negative — OpponentsTurn gate)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            dp: 3000,
            as: "host",
            under: [{ card: "BT10-006", as: "digiCard", faceUp: false }],
          },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 0; // host controller's own turn — [Opponent's Turn] gate must reject

    const host = s.perm("host");
    const digiCard = s.inst("digiCard");
    const deckBefore = p0.deck.length;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trashDigivolutionCards(host.permanentId, [digiCard.instanceId], 0);
    await settle(() => p0.deck.length < deckBefore, 50);

    expect(p0.deck.length).toBe(deckBefore); // no draw on own turn
  });

  it("draws when the controller's own effect trashes it during the opponent's turn (Q1931)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            under: [{ card: "BT10-006", as: "tokomon" }],
          },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.turnSeat = 1;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("tokomon").instanceId], 0);
    await settle(() => s.state.players[0]!.deck.length === deckBefore - 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("draws only for Tokomon when an effect trashes it alongside another digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-009",
            as: "host",
            under: ["BT10-006", "BT1-010"],
          },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.turnSeat = 1;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      s
        .perm("host")
        .stack.slice(0, 2)
        .map((card) => card.instanceId),
      0,
    );
    await settle(() => s.state.players[0]!.deck.length === deckBefore - 1);

    expect(s.state.players[0]!.deck.length).toBe(deckBefore - 1);
  });

  it("does not draw when deleting the host moves Tokomon to trash as collateral", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-006"] }],
        deck: ["BT1-009"],
      },
    });
    s.state.turnSeat = 1;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
