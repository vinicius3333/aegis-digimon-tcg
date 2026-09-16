/* Dev-only route (/dev/battle): a live bot match that starts mid-battle, with a Digimon on
   each side ready to fight. The reset button remounts the match screen, which leaves the
   room and opens a fresh one laid out the same way.

   `?scenario=security-battle` lays a different board instead: the bot takes the turn and
   attacks into a security Digimon that kills it, and the [On Deletion] effects that death
   sets off hold the check open for seconds. Watch the revealed card — it has to stay on
   screen until the battle's verdict arrives, rather than leaving and being flashed back. */

import { useMemo, useState } from "react";
import { colorKey } from "../design/theme";
import { deckById, selectableDecks } from "../game/decks";
import { GameScreen } from "../game/GameScreen";
import { loadActiveDeckId, loadDecks, loadIdentity } from "../identity";
import type { AegisJoinOptions } from "../net/types";
import "./battleLab.css";

export function isBattleLabPath(pathname: string): boolean {
  return /^\/dev\/battle\/?$/i.test(pathname);
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
      devScenario:
        new URLSearchParams(window.location.search).get("scenario") === "security-battle"
          ? "security-battle"
          : "battle",
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
