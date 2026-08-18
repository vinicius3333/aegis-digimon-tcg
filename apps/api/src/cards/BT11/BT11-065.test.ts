import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

// A3 for BT11-065 (Snatchmon) — the inherited Vemmon-return clause.
//
// "[All Turns][Once Per Turn] When [Vemmon] is placed from this Digimon's digivolution cards at the
// bottom of its owner's deck, unsuspend this Digimon and it gains <Blocker> ..." (documented behavior, an
// INHERITED effect). The engine had no onDigivolutionCardReturnToDeckBottom event, so the clause was
// modeled as an UNCONDITIONAL AllTurns unsuspend (wrong — free every turn). Now `returnToDeck`-bottom
// fires the event (anchored to the host whose stack lost the card), gated to the host's own watcher
// and the returned card's name.
//
// FAILS-WHEN-REVERTED: drop the event fire and the suspended host stays suspended on a Vemmon return.

const SNATCH = "BT11-065"; // inherited under the host
const VEMMON = "BT11-061"; // a [Vemmon] Lv.3
const NON_VEMMON = "BT1-009"; // any non-Vemmon card
const TOP = "BT1-009"; // the host's top Digimon (any)

describe("BT11-065 inherited: Vemmon returned from this Digimon's stack to deck bottom unsuspends it", () => {
  it("returning a [Vemmon] to the deck bottom unsuspends the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: TOP,
              dp: 4000,
              as: "host",
              suspended: true,
              under: [{ card: SNATCH }, { card: VEMMON, as: "stackCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.returnToDeck([s.inst("stackCard").instanceId]); // to bottom (default)
    await settle(() => s.perm("host").isSuspended === false);

    // The inherited clause fired: the host is unsuspended, and the Vemmon is in the deck.
    expect(s.perm("host").isSuspended).toBe(false);
    const stackCardId = s.inst("stackCard").instanceId;
    expect((s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId)).toBe(true);
  });

  it("returning a NON-[Vemmon] stack card does NOT unsuspend (name gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: TOP,
              dp: 4000,
              as: "host",
              suspended: true,
              under: [{ card: SNATCH }, { card: NON_VEMMON, as: "stackCard" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const stackCardId = s.inst("stackCard").instanceId;

    await advance(s.engine).verb.returnToDeck([stackCardId]);
    await settle(() => (s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId));

    // The card moved, but the host stays suspended — the watcher gates on the [Vemmon] name.
    expect((s.state.players[0] as PlayerState).deck.some((c) => c.instanceId === stackCardId)).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
