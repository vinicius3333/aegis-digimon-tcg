import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";

// A3 for EX5-062 (Anubismon) — "[Your Turn] When an effect plays one of your Digimon, delete 1 of
// your opponent's level 5 or lower Digimon. If this effect didn't delete, draw 1." (KB Q3665: it
// activates even when this card's own effect plays a card.)
//
// Two gaps closed:
//  - effect-driven plays (the `playInstances` verb) now fire the whenPlayed bus marked
//    `playedByEffect`, so the watcher triggers (it never did before — Q3665);
//  - the delete target is gated to level 5 OR LOWER (the dropped filter).
//
// FAILS-WHEN-REVERTED: drop the whenPlayed fire and the opponent's Lv.5 Digimon survives an
// effect-play.

const ANUBIS = "EX5-062";
const PURPLE_PLAY = "BT10-073"; // ChuuChuumon, purple Lv.3 — the Digimon played by effect from trash
const OPP_LV5 = "BT1-058"; // Chirinmon, Lv.5 — a legal delete target
const OPP_LV6 = "BT2-018"; // Volcanicdramon, Lv.6 — NOT a legal target (level filter)

describe("EX5-062 deletes a Lv.5- opp Digimon when an effect plays your Digimon", () => {
  it("an effect-play triggers the watcher and deletes the opponent's Lv.5 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: ANUBIS, dp: 5000 }], trash: [{ card: PURPLE_PLAY, as: "toPlay" }] },
        1: { battleArea: [{ card: OPP_LV5, dp: 5000, as: "oppLv5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const oppLv5Id = s.perm("oppLv5").permanentId;

    await advance(s.engine).verb.playInstances([s.inst("toPlay").instanceId]);
    await settle(() => !p1.battleArea.some((p) => p.permanentId === oppLv5Id));

    // The purple Digimon was played by effect...
    expect(p0.battleArea.some((p) => p.topCard?.cardId === PURPLE_PLAY)).toBe(true);
    // ...and EX5-062 deleted the opponent's Lv.5 Digimon.
    expect(p1.battleArea.some((p) => p.permanentId === oppLv5Id)).toBe(false);
  });

  it("with only a Lv.6 opp Digimon, nothing is deleted (level filter) — draws instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ANUBIS, dp: 5000 }],
          trash: [{ card: PURPLE_PLAY, as: "toPlay" }],
          deck: [OPP_LV6, OPP_LV6, OPP_LV6],
        },
        1: { battleArea: [{ card: OPP_LV6, dp: 5000, as: "oppLv6" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const oppLv6Id = s.perm("oppLv6").permanentId;
    const deckBefore = p0.deck.length;

    await advance(s.engine).verb.playInstances([s.inst("toPlay").instanceId]);
    await settle(() => p0.deck.length < deckBefore);

    // The Lv.6 Digimon is NOT a legal target (level 5 filter) → it survives, and EX5-062 draws 1.
    expect(p1.battleArea.some((p) => p.permanentId === oppLv6Id)).toBe(true);
    expect(deckBefore - p0.deck.length).toBe(1);
  });
});
