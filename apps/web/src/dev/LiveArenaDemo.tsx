import { useMemo, useState } from "react";
import { colorKey } from "../design/theme";
import { CATALOG_DECKS } from "@aegis/shared";
import { GameScreen } from "../game/GameScreen";
import { loadIdentity } from "../identity";
import { useTranslation } from "../i18n";
import type { AegisJoinOptions } from "../net/types";
import "./arenaDemo.css";

/** Uses the normal room, bot and intent pipeline; all results come from the engine. */
export function LiveArenaDemo() {
  const { locale } = useTranslation();
  const portuguese = locale === "pt-BR";
  const [run, setRun] = useState(0);
  const [scenario, setScenario] = useState<NonNullable<AegisJoinOptions["devScenario"]>>(() =>
    new URLSearchParams(window.location.search).get("scenario") === "card-bugs" ? "card-bugs" : "arena",
  );
  const player = useMemo(loadIdentity, []);
  const joinOptions = useMemo<AegisJoinOptions>(() => {
    const deck = CATALOG_DECKS.find((entry) => entry.deckId === "bt26-dgo-2026-08-28-7-chronomon");
    if (!deck) throw new Error("Missing BT26 Chronomon demo deck");
    return {
      displayName: player.name,
      deckId: deck.deckId,
      deckName: deck.name,
      deck: { mainDeck: [...deck.decklist.mainDeck], eggDeck: [...deck.decklist.eggDeck] },
      devScenario: scenario,
    };
  }, [player, scenario]);
  const reset = () => setRun((current) => current + 1);
  return (
    <div className="aegis-arena-demo">
      <header className="aegis-arena-demo-toolbar">
        <strong>{portuguese ? "Demo com servidor · contra bot" : "Server demo · vs bot"}</strong>
        <label className="aegis-arena-demo-field">
          <span className="aegis-arena-demo-field-label">{portuguese ? "Cenário" : "Scenario"}</span>
          <select
            value={scenario}
            onChange={(event) => {
              setScenario(event.target.value as NonNullable<AegisJoinOptions["devScenario"]>);
              setRun((current) => current + 1);
            }}
          >
            <option value="arena">Attack steps · Counter/Blocker</option>
            <option value="arena-aegiochus-dark-assembly">Aegiochus Dark · Wizardmon Assembly</option>
            <option value="arena-magnamon-x">Magnamon X · Sonic Shot unsuspend</option>
            <option value="arena-vortexdramon">Vortexdramon · optional OPT</option>
            {scenario === "card-bugs" ? <option value="card-bugs">Card bugs</option> : null}
          </select>
        </label>
        <button type="button" className="aegis-arena-demo-replay" onClick={reset}>
          {portuguese ? "Reiniciar combate" : "Reset combat"}
        </button>
        <span className="aegis-arena-demo-note">
          {portuguese
            ? "Termine a criação, selecione um Digimon, ataque e clique na segurança do oponente."
            : "End breeding, select a Digimon, choose Attack and click the opponent's security."}
        </span>
        <a className="aegis-arena-demo-back" href="/dev/arena?mode=visual">
          {portuguese ? "Prévia visual" : "Visual preview"}
        </a>
      </header>
      <GameScreen
        key={`${scenario}-${run}`}
        joinOptions={joinOptions}
        identityColor={colorKey(player.color)}
        startMode="bot"
        botDeckId="bt26-dgo-2026-08-28-8-plutomon"
        onExit={reset}
      />
    </div>
  );
}
