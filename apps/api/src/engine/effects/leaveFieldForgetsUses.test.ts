import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX12/EX12-065.js";

// CR §3-1-3-1-1/§3-1-3-1-2: a card moved between areas becomes a "new card" and carries over
// none of the previous card's states — the [Once Per Turn] use ledger is one of them — and
// §3-4-4 treats each card placed on the field as a separate Digimon. KB Q6866 covers this exact
// board: EX12-065 Kaguyamon is deleted, ＜Fortitude＞ replays it from the trash, and the replayed
// card is a new Kaguyamon.
describe("leaving the field forgets a card's per-turn uses", () => {
  it("lets ＜Fortitude＞-replayed EX12-065 use its [On Play] after spending the same [Once Per Turn] while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          // ＜Fortitude＞ (CR §16-27) only replays a Digimon that had digivolution cards when deleted.
          battleArea: [{ card: "EX12-065", as: "kaguya", under: ["BT5-066"] }],
          trash: ["BT2-055", "BT6-055"],
        },
        1: { battleArea: [{ card: "BT1-018", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kaguya").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    const battleArea = s.state.players[0]!.battleArea;
    // One card came out of the trash for [When Attacking], the second for the replayed [On Play].
    expect(battleArea.filter((permanent) => permanent.topCard?.cardId === "BT2-055")).toHaveLength(1);
    expect(battleArea.filter((permanent) => permanent.topCard?.cardId === "BT6-055")).toHaveLength(1);
    expect(battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-065")).toBe(true);
  });
});
