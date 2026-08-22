import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-090.js";

// A3 for BT17-090 (Tomonori Ryusenji, Tamer):
//   [End of Opponent's Turn][Once Per Turn] If this Tamer is suspended, 1 of your
//     Digimon with a Tamer card in its digivolution cards may digivolve into a Digimon
//     card with [Dex] or [DeathX] in its name from your trash without paying the cost.
//   [Security] Play this card without paying the cost.
//
// FAILS-WHEN-REVERTED: the declarative effect record had both clauses as RawUnparsed no-ops.
// Test proves [Security] plays the Tamer from security when a security check hits it,
// which is the simplest guaranteed-observable outcome (no timing window dependency).

const TOMONORI = "BT17-090";
const SECURITY_DIGIMON = "AD1-001"; // attacker with enough DP to force a security check

describe("BT17-090 Tomonori Ryusenji — [Security] play self", () => {
  it("installs the Your Turn Tamer-stack watcher", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", addedDigivolutionCardFilter: { kind: ["Tamer"] } }] });
  });

  it("[Security] plays this Tamer to the battle area when hit as a security card", async () => {
    // Seat 1 is the turn player attacking into seat 0's security.
    const s = setupEngine({
      0: { security: [{ card: TOMONORI, as: "tamerCard" }] },
      1: { battleArea: [{ card: SECURITY_DIGIMON, dp: 12000, as: "attacker" }] },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    const tamerId = s.inst("tamerCard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    });
    expect(res.ok).toBe(true);

    // Wait until Tomonori leaves the security stack (checked/played).
    await settle(() => !p0?.security.some((c) => c.instanceId === tamerId), 800);

    // Tomonori should now be in seat 0's battle area (played without cost by [Security]).
    const inBattleArea = p0?.battleArea.some((p) => p.topCard?.instanceId === tamerId);
    expect(inBattleArea).toBe(true);
    // And not in trash (was not trashed — it was played).
    expect(p0?.trash.some((c) => c.instanceId === tamerId)).toBe(false);
  });
});
