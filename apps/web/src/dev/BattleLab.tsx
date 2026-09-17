/* Dev-only route (/dev/battle): a live bot match that starts mid-battle, with a Digimon on
   each side ready to fight. The reset button remounts the match screen, which leaves the
   room and opens a fresh one laid out the same way.

   `?scenario=` lays a different board instead. Both security boards put the bot on the turn,
   attacking into a security Digimon that kills it, and hold the check open while the bot
   answers what that death sets off. Watch the revealed card — it has to stay on screen until
   the battle's verdict arrives, rather than leaving and being flashed back.

   - `security-battle` asks the bot one question, so the card holds for about one think time.
   - `security-chain` asks two back to back, which is the ~5 s hold seen in production. Use
     this one to judge how long a check may sit there with nothing moving on screen. */

import { useMemo, useState } from "react";
import { colorKey } from "../design/theme";
import { deckById, selectableDecks } from "../game/decks";
import { GameScreen } from "../game/GameScreen";
import { loadActiveDeckId, loadDecks, loadIdentity } from "../identity";
import type { AegisJoinOptions } from "../net/types";
import "./battleLab.css";

/** Boards this route can lay. Anything else in `?scenario=` falls back to the default battle. */
const BATTLE_LAB_SCENARIOS = ["security-battle", "security-chain"] as const;

type BattleLabScenario = (typeof BATTLE_LAB_SCENARIOS)[number];

export function isBattleLabPath(pathname: string): boolean {
  return /^\/dev\/battle\/?$/i.test(pathname);
}

function requestedScenario(search: string): BattleLabScenario | "battle" {
  const asked = new URLSearchParams(search).get("scenario");
  return BATTLE_LAB_SCENARIOS.find((scenario) => scenario === asked) ?? "battle";
}

export function BattleLab() {
  const [run, setRun] = useState(0);
  const player = useMemo(loadIdentity, []);
  const joinOptions = useMemo<AegisJoinOptions>(() => {
    const decks = selectableDecks(loadDecks());
    const deck = deckById(decks, loadActiveDeckId(decks));
    return {
      displayName: player.name,
      deckId: deck?.id,
      deckName: deck?.name,
      deck: { mainDeck: deck?.mainDeck ?? [], eggDeck: deck?.eggDeck ?? [] },
      devScenario: requestedScenario(window.location.search),
    };
  }, [player]);
  const reset = () => setRun((current) => current + 1);

  return (
    <>
      <GameScreen
        key={run}
        joinOptions={joinOptions}
        identityColor={colorKey(player.color)}
        startMode="bot"
        onExit={reset}
      />
      <button type="button" className="aegis-battle-lab-reset" onClick={reset}>
        Reset battle
      </button>
    </>
  );
}
