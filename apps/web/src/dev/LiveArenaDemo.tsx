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
  const [scenario, setScenario] = useState<NonNullable<AegisJoinOptions["devScenario"]>>(() => {
    const requested = new URLSearchParams(window.location.search).get("scenario");
    return requested === "arena-aegiochus-dark-assembly" ||
      requested === "arena-alliance-20" ||
      requested === "arena-bt21-davis-top-stack" ||
      requested === "arena-face-up-security" ||
      requested === "arena-ex13-grademon-immunity" ||
      requested === "arena-ex13-giromon-block-triggers" ||
      requested === "arena-ex13-kings-opponent-sukamon" ||
      requested === "arena-ex13-kingsukamon-immunity-lapse" ||
      requested === "arena-ex13-examon" ||
      requested === "arena-ex10-god-grade-raising-color" ||
      requested === "arena-junomon-opponent-target" ||
      requested === "arena-jupitermon-siren" ||
      requested === "arena-magnamon-x" ||
      requested === "arena-reboot-timing" ||
      requested === "arena-seven-code-link-dp" ||
      requested === "arena-suspend-lock-block" ||
      requested === "arena-vortex-target-legality" ||
      requested === "arena-vortexdramon" ||
      requested === "card-bugs"
      ? requested
      : "arena";
  });
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
            <option value="arena-alliance-20">Alliance · 20 Digimon</option>
            <option value="arena-bt21-davis-top-stack">BT21 Davis · top stacked card regression</option>
            <option value="arena-face-up-security">Security · opponent face-up cards</option>
            <option value="arena-ex13-grademon-immunity">EX13 Alphamon · Assembly from trash</option>
            <option value="arena-ex13-giromon-block-triggers">EX13 Giromon · 6 block triggers</option>
            <option value="arena-ex13-kings-opponent-sukamon">EX13 Kings · opponent Sukamon</option>
            <option value="arena-ex13-kingsukamon-immunity-lapse">EX13 KingSukamon · immunity lapse</option>
            <option value="arena-ex13-examon">EX13 Examon · Lv.5 DNA + battle timing</option>
            <option value="arena-ex10-god-grade-raising-color">EX10 God Grade · raising-area colour</option>
            <option value="arena-junomon-opponent-target">Junomon · opponent target</option>
            <option value="arena-jupitermon-siren">Jupitermon · Sirenmon + Dan &amp; Kanan</option>
            <option value="arena-magnamon-x">Magnamon X · Sonic Shot unsuspend</option>
            <option value="arena-reboot-timing">Reboot · Active phase timing</option>
            <option value="arena-seven-code-link-dp">Seven Code · Link DP comparison</option>
            <option value="arena-suspend-lock-block">Suspend lock · Blocker legality</option>
            <option value="arena-vortex-target-legality">Vortex · target legality</option>
            <option value="arena-vortexdramon">Vortexdramon · optional OPT</option>
            {scenario === "card-bugs" ? <option value="card-bugs">Card bugs</option> : null}
          </select>
        </label>
        <button type="button" className="aegis-arena-demo-replay" onClick={reset}>
          {portuguese ? "Reiniciar combate" : "Reset combat"}
        </button>
        <span className="aegis-arena-demo-note">
          {scenario === "arena-reboot-timing"
            ? portuguese
              ? "Seu turno começa com todos os seus Digimon com Reboot suspensos. Observe a fase de Dessuspensão."
              : "Your turn starts with all your Reboot Digimon suspended. Watch the Unsuspend phase."
            : scenario === "arena-alliance-20"
              ? portuguese
                ? "Encerre a criação, ataque com Seadramon e escolha 1 dos outros 19 Digimon para Alliance."
                : "End breeding, attack with Seadramon, and choose 1 of the other 19 Digimon for Alliance."
              : scenario === "arena-bt21-davis-top-stack"
                ? portuguese
                  ? "Encerre a criação e ative o efeito Main de Davis. Magnamon deve ir ao lixo e Veemon deve permanecer no campo."
                  : "End breeding and activate Davis's Main effect. Magnamon should be trashed and Veemon should remain in play."
                : scenario === "arena-seven-code-link-dp"
                  ? portuguese
                    ? "DP esperado: Medicmon 7000, Globemon 13000 e Weatherdramon 8000. Compare os valores exibidos."
                    : "Expected DP: Medicmon 7000, Globemon 13000, and Weatherdramon 8000. Compare the displayed values."
                  : scenario === "arena-vortex-target-legality"
                    ? portuguese
                      ? "Encerre o turno e aceite Vortex. Só o Digimon suspenso do oponente deve ser um alvo válido."
                      : "End the turn and accept Vortex. Only the opponent's suspended Digimon should be a valid target."
                    : scenario === "arena-junomon-opponent-target"
                      ? portuguese
                        ? "Encerre a criação, jogue Junomon e aceite o efeito. O seletor deve permitir escolher o Digimon do oponente."
                        : "End breeding, play Junomon, and accept the effect. The target picker must allow the opponent's Digimon."
                      : scenario === "arena-ex13-giromon-block-triggers"
                        ? portuguese
                          ? "O bot ataca primeiro. Bloqueie com Giromon para abrir os 6 efeitos simultâneos de Giromon, Guardromon e dos 4 Tai."
                          : "The bot attacks first. Block with Giromon to open the 6 simultaneous Giromon, Guardromon, and 4 Tai effects."
                        : scenario === "arena-ex13-kingsukamon-immunity-lapse"
                          ? portuguese
                            ? "Jogue KingSukamon, descarte Chuumon e escolha o Digimon imune. Encerre o turno; ele deve então virar Sukamon branco de 3000 DP."
                            : "Play KingSukamon, trash Chuumon, and choose the immune Digimon. End the turn; it should then become a white 3000 DP Sukamon."
                          : scenario === "arena-ex13-kings-opponent-sukamon"
                            ? portuguese
                              ? "Os 2 KingSukamon adversários completam o requisito de 3 nomes: ambos devem estar com 3000 DP. Ataque o suspenso com KingEtemon; a herança deve revelar 3 cartas."
                              : "The opponent's 2 KingSukamon complete the 3-name threshold: both should have 3000 DP. Attack the suspended one with KingEtemon; the inherited effect should reveal 3 cards."
                            : scenario === "arena-ex10-god-grade-raising-color"
                              ? portuguese
                                ? "Copipemon é o único Appmon e está na criação. Compare Cyber Engage com God Grade Unleashed na mão."
                                : "Copipemon is the only Appmon and is in breeding. Compare Cyber Engage with God Grade Unleashed in hand."
                              : scenario === "arena-suspend-lock-block"
                                ? portuguese
                                  ? "Seu Blocker já começa impedido de suspender. O ataque do bot não deve poder ser bloqueado."
                                  : "Your Blocker starts unable to suspend. It must not be able to block the bot's attack."
                                : portuguese
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
