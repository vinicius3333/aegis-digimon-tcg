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
      requested === "arena-ex13-gotsumon-blocker-search" ||
      requested === "arena-ex13-giromon-block-triggers" ||
      requested === "arena-ex13-deletion-trigger-ordering" ||
      requested === "arena-ex13-kings-opponent-sukamon" ||
      requested === "arena-ex13-kingsukamon-immunity-lapse" ||
      requested === "arena-ex13-examon" ||
      requested === "arena-ex5-attack-priority" ||
      requested === "arena-ex10-god-grade-raising-color" ||
      requested === "arena-issue-4888-app-fusion" ||
      requested === "arena-issue-4889-weregarurumon-dna" ||
      requested === "arena-issue-4890-reina-deletion" ||
      requested === "arena-issue-4891-seiten-on-play" ||
      requested === "arena-issue-4892-effect-digixros" ||
      requested === "arena-issue-4893-seiten-evo-cost" ||
      requested === "arena-junomon-opponent-target" ||
      requested === "arena-jupitermon-siren" ||
      requested === "arena-magnamon-x" ||
      requested === "arena-reboot-timing" ||
      requested === "arena-sagasol-effect-assembly" ||
      requested === "arena-sagasol-guard-source" ||
      requested === "arena-ex13-magnamon-end-turn" ||
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
            <option value="arena-ex13-gotsumon-blocker-search">EX13 Gotsumon · printed Blocker search</option>
            <option value="arena-ex13-giromon-block-triggers">EX13 Giromon · 6 block triggers</option>
            <option value="arena-ex13-deletion-trigger-ordering">EX13 Kings · deletion trigger ordering</option>
            <option value="arena-ex13-kings-opponent-sukamon">EX13 Kings · opponent Sukamon</option>
            <option value="arena-ex13-kingsukamon-immunity-lapse">EX13 KingSukamon · 0 DP deletion</option>
            <option value="arena-ex13-examon">EX13 Examon · Lv.5 DNA + battle timing</option>
            <option value="arena-ex5-attack-priority">EX5 Etemon · attack trigger priority</option>
            <option value="arena-ex10-god-grade-raising-color">EX10 God Grade · raising-area colour</option>
            <option value="arena-issue-4888-app-fusion">#4888 · co-linked App Fusion</option>
            <option value="arena-issue-4889-weregarurumon-dna">#4889 · WereGarurumon DNA</option>
            <option value="arena-issue-4890-reina-deletion">#4890 · Reina deletion trigger</option>
            <option value="arena-issue-4891-seiten-on-play">#4891 · SeitenGokuumon On Play</option>
            <option value="arena-issue-4892-effect-digixros">#4892 · effect DigiXros</option>
            <option value="arena-issue-4893-seiten-evo-cost">#4893 · SeitenGokuumon evo cost</option>
            <option value="arena-junomon-opponent-target">Junomon · opponent target</option>
            <option value="arena-jupitermon-siren">Jupitermon · Sirenmon + Dan &amp; Kanan</option>
            <option value="arena-magnamon-x">Magnamon X · Sonic Shot unsuspend</option>
            <option value="arena-ex13-magnamon-end-turn">EX13 Magnamon · End of turn / Reboot</option>
            <option value="arena-reboot-timing">Reboot · Active phase timing</option>
            <option value="arena-sagasol-effect-assembly">SagaSol · effect-played Assembly</option>
            <option value="arena-sagasol-guard-source">SagaSol · granted Guard source</option>
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
          {scenario === "arena-issue-4888-app-fusion"
            ? portuguese
              ? "Selecione Mienumon na mão e use App Fusion no Mirrormon com Copipemon vinculado. O custo deve ser 0."
              : "Select Mienumon in hand and App Fuse onto Mirrormon with linked Copipemon. The cost must be 0."
            : scenario === "arena-issue-4889-weregarurumon-dna"
              ? portuguese
                ? "Selecione WereGarurumon na mão e faça DNA Digivolve usando Apemon amarelo e Garurumon roxo."
                : "Select WereGarurumon in hand and DNA Digivolve using yellow Apemon and purple Garurumon."
              : scenario === "arena-issue-4890-reina-deletion"
                ? portuguese
                  ? "Use Heat Viper e delete Myotismon; Reina deve oferecer GrandDracmon com Piedmon. Reinicie e delete WereGarurumon: Reina ainda pode suspender, mas nenhum DNA ocorre porque não há alvo NSo legal para esse nível 5."
                  : "Use Heat Viper and delete Myotismon; Reina must offer GrandDracmon with Piedmon. Reset and delete WereGarurumon: Reina can still suspend, but no DNA occurs because no legal NSo target can use that level 5."
                : scenario === "arena-issue-4891-seiten-on-play"
                  ? portuguese
                    ? "Jogue SeitenGokuumon, escolha o Digimon adversário e confirme que ele recebe -8000 DP antes do ataque opcional."
                    : "Play SeitenGokuumon, choose the opposing Digimon, and confirm it gets -8000 DP before the optional attack."
                  : scenario === "arena-issue-4892-effect-digixros"
                    ? portuguese
                      ? "Ative o efeito Main de Hakubamon, escolha Gokuumon e use Kakamon como material de DigiXros. O custo final deve ser 3."
                      : "Activate Hakubamon's Main effect, choose Gokuumon, and use Kakamon as DigiXros material. The final cost must be 3."
                    : scenario === "arena-issue-4893-seiten-evo-cost"
                      ? portuguese
                        ? "Selecione SeitenGokuumon e evolua sobre Gokuumon pela condição especial. O custo exibido e pago deve ser 4."
                        : "Select SeitenGokuumon and digivolve onto Gokuumon through the special condition. The shown and paid cost must be 4."
                      : scenario === "arena-ex13-magnamon-end-turn"
                        ? portuguese
                          ? "Encerre a criação, ataque a segurança com Magnamon e Meteormon e encerre o turno. Aceite dessuspender Magnamon: deve ocorrer ainda no seu turno. Reboot de Meteormon deve ocorrer na Dessuspensão do oponente, antes da Main. Reinicie para testar recusar o efeito."
                          : "End breeding, attack security with Magnamon and Meteormon, then end your turn. Accept Magnamon’s unsuspend: it should resolve during your turn. Meteormon’s Reboot should resolve in the opponent’s Unsuspend phase, before Main. Reset to test declining the effect."
                        : scenario === "arena-sagasol-effect-assembly"
                          ? portuguese
                            ? "Encerre a criação, jogue HiAndromon, escolha Megadramon e depois o material no lixo para Assembly."
                            : "End breeding, play HiAndromon, choose Megadramon, then choose the trash material for Assembly."
                          : scenario === "arena-sagasol-guard-source"
                            ? portuguese
                              ? "O bot usa Gaia Force. A decisão de Guard deve mostrar Metal Empire e seu texto, não o efeito do Digimon."
                              : "The bot uses Gaia Force. The Guard decision must show Metal Empire and its text, not the Digimon's effect."
                            : scenario === "arena-ex13-gotsumon-blocker-search"
                              ? portuguese
                                ? "Compre BT1-009, encerre a criação e jogue Gotsumon. Na busca por Blocker, somente BT20-047 deve ser elegível; BT19-069 e EX8-046 têm Blocker apenas herdado e devem voltar ao fundo."
                                : "Draw BT1-009, end breeding, and play Gotsumon. Only BT20-047 should be eligible for the Blocker search; BT19-069 and EX8-046 have inherited-only Blocker and must return to the bottom."
                              : scenario === "arena-ex5-attack-priority"
                                ? portuguese
                                  ? "O bot ataca com Shoutmon EX6. Os efeitos Ao Atacar e Alliance dele devem resolver antes das reações de MetalEtemon e da herança de Etemon."
                                  : "The bot attacks with Shoutmon EX6. Its When Attacking and Alliance effects must resolve before MetalEtemon and inherited Etemon react."
                                : scenario === "arena-reboot-timing"
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
                                              : scenario === "arena-ex13-deletion-trigger-ordering"
                                                ? portuguese
                                                  ? "Use Heat Viper, delete seu EX13-028 Sukamon e escolha a ordem entre o efeito On Deletion dele e a herança do KingSukamon sob KingEtemon."
                                                  : "Use Heat Viper, delete your EX13-028 Sukamon, and choose the order between its On Deletion effect and KingSukamon inherited under KingEtemon."
                                                : scenario === "arena-ex13-kingsukamon-immunity-lapse"
                                                  ? portuguese
                                                    ? "Jogue KingSukamon, descarte Chuumon e transforme o Digimon adversário. A aura de KingEtemon deve deletá-lo com 0 DP; então aceite a herança para revelar 3 e jogar Chuumon."
                                                    : "Play KingSukamon, trash Chuumon, and rewrite the opposing Digimon. KingEtemon's aura should delete it at 0 DP; then accept the inherited effect to reveal 3 and play Chuumon."
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
