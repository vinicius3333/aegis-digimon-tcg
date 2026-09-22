import { useMemo, useState } from "react";
import { CATALOG_DECKS } from "@aegis/shared";
import { colorKey } from "../design/theme";
import { GameScreen } from "../game/GameScreen";
import { loadIdentity } from "../identity";
import { useTranslation } from "../i18n";
import type { AegisJoinOptions } from "../net/types";
import "./arenaDemo.css";

type DevScenario = NonNullable<AegisJoinOptions["devScenario"]>;
type ScenarioCopy = { en: string; ptBR: string };

const DEFAULT_NOTE: ScenarioCopy = {
  ptBR: "Termine a criação, selecione um Digimon, ataque e clique na segurança do oponente.",
  en: "End breeding, select a Digimon, choose Attack and click the opponent's security.",
};

const SCENARIO_NOTES: Partial<Record<DevScenario, ScenarioCopy>> = {
  "arena-mervamon-effect-assembly": {
    ptBR: "Jogue Mervamon, aceite o efeito, escolha Aegiochusmon: Dark no lixo e use o Lv.4 TB como material de Assembly.",
    en: "Play Mervamon, accept its effect, choose Aegiochusmon: Dark in trash, then use the Lv.4 TB card as its Assembly material.",
  },
  "arena-bt11-analogman-redirect-timing": {
    ptBR: "Jogue GrapLeomon e mande Gaomon atacar o jogador. O efeito Ao Atacar de Gaomon (cada jogador compra 1) deve resolver ANTES de o Analogman do bot suspender e redirecionar o ataque.",
    en: "Play GrapLeomon and order Gaomon to attack the player. Gaomon's When Attacking effect (each player draws 1) must resolve BEFORE the bot's Analogman suspends and redirects the attack.",
  },
  "arena-bt20-grademon-redirect": {
    ptBR: "O bot ataca sua segurança. Aceite o efeito herdado de Grademon e escolha seu Digimon para mudar o alvo do ataque para ele.",
    en: "The bot attacks your security. Accept Grademon's inherited effect and choose your Digimon to redirect the attack to it.",
  },
  "arena-ex11-ryutaro-suspended": {
    ptBR: "Evolua o primeiro MasterTyrannomon para Dinomon e use Ryutaro. Depois, evolua o segundo: o efeito não deve aparecer novamente porque Ryutaro já está suspenso.",
    en: "Digivolve the first MasterTyrannomon into Dinomon and use Ryutaro. Then digivolve the second one: the effect must not appear again because Ryutaro is already suspended.",
  },
  "arena-issue-4888-app-fusion": {
    ptBR: "Selecione Mienumon na mão e use App Fusion no Mirrormon com Copipemon vinculado. O custo deve ser 0.",
    en: "Select Mienumon in hand and App Fuse onto Mirrormon with linked Copipemon. The cost must be 0.",
  },
  "arena-issue-4889-weregarurumon-dna": {
    ptBR: "Selecione WereGarurumon na mão e faça DNA Digivolve usando Apemon amarelo e Garurumon roxo.",
    en: "Select WereGarurumon in hand and DNA Digivolve using yellow Apemon and purple Garurumon.",
  },
  "arena-issue-4890-reina-deletion": {
    ptBR: "Use Heat Viper e delete Myotismon; Reina deve oferecer GrandDracmon com Piedmon. Reinicie e delete WereGarurumon: Reina ainda pode suspender, mas nenhum DNA ocorre porque não há alvo NSo legal para esse nível 5.",
    en: "Use Heat Viper and delete Myotismon; Reina must offer GrandDracmon with Piedmon. Reset and delete WereGarurumon: Reina can still suspend, but no DNA occurs because no legal NSo target can use that level 5.",
  },
  "arena-issue-4891-seiten-on-play": {
    ptBR: "Jogue SeitenGokuumon, escolha o Digimon adversário e confirme que ele recebe -8000 DP antes do ataque opcional.",
    en: "Play SeitenGokuumon, choose the opposing Digimon, and confirm it gets -8000 DP before the optional attack.",
  },
  "arena-issue-4892-effect-digixros": {
    ptBR: "Ative o efeito Main de Hakubamon, escolha Gokuumon e use Kakamon como material de DigiXros. O custo final deve ser 3.",
    en: "Activate Hakubamon's Main effect, choose Gokuumon, and use Kakamon as DigiXros material. The final cost must be 3.",
  },
  "arena-issue-4893-seiten-evo-cost": {
    ptBR: "Selecione SeitenGokuumon e evolua sobre Gokuumon pela condição especial. O custo exibido e pago deve ser 4.",
    en: "Select SeitenGokuumon and digivolve onto Gokuumon through the special condition. The shown and paid cost must be 4.",
  },
  "arena-ex13-magnamon-end-turn": {
    ptBR: "Encerre a criação, ataque a segurança com Magnamon e Meteormon e encerre o turno. Aceite dessuspender Magnamon: deve ocorrer ainda no seu turno. Reboot de Meteormon deve ocorrer na Dessuspensão do oponente, antes da Main. Reinicie para testar recusar o efeito.",
    en: "End breeding, attack security with Magnamon and Meteormon, then end your turn. Accept Magnamon’s unsuspend: it should resolve during your turn. Meteormon’s Reboot should resolve in the opponent’s Unsuspend phase, before Main. Reset to test declining the effect.",
  },
  "arena-sagasol-effect-assembly": {
    ptBR: "Encerre a criação, jogue HiAndromon, escolha Megadramon e depois o material no lixo para Assembly.",
    en: "End breeding, play HiAndromon, choose Megadramon, then choose the trash material for Assembly.",
  },
  "arena-sagasol-etemon-protected-dp": {
    ptBR: "Encerre a criação e jogue Etemon, escolhendo Kabuterimon. Enquanto ele estiver protegido, a badge de ataque não deve aparecer. No começo da Main Phase, o ataque forçado deve ser anunciado por toast.",
    en: "End breeding and play Etemon, choosing Kabuterimon. While it is protected, the attack badge must stay hidden. At the start of the Main Phase, the forced attack must be announced by a toast.",
  },
  "arena-sagasol-guard-source": {
    ptBR: "O bot usa Gaia Force no Megadramon. A decisão deve mostrar ToyAgumon usando Guard para salvá-lo.",
    en: "The bot uses Gaia Force on Megadramon. The decision must show ToyAgumon using Guard to save it.",
  },
  "arena-bt26-chronomon-dm-succession": {
    ptBR: "Digivolva Chronomon: Destroy Mode da mão sobre Chronomon: Holy Mode. Depois ataque com Giant Slayer no Titamon suspenso: ele perde a batalha e digivolve no segundo Destroy Mode de graça. Nos dois casos a janela [When Digivolving] deve oferecer o efeito do próprio Destroy Mode E o de Holy Mode, ganho por Succession.",
    en: "Digivolve Chronomon: Destroy Mode from hand onto Chronomon: Holy Mode. Then attack the suspended Titamon with Giant Slayer: it loses the battle and digivolves into the second Destroy Mode for free. Both windows must offer Destroy Mode's own [When Digivolving] AND Holy Mode's, gained through Succession.",
  },
  "arena-ex13-gotsumon-blocker-search": {
    ptBR: "Compre BT1-009, encerre a criação e jogue Gotsumon. Na busca por Blocker, somente BT20-047 deve ser elegível; BT19-069 e EX8-046 têm Blocker apenas herdado e devem voltar ao fundo.",
    en: "Draw BT1-009, end breeding, and play Gotsumon. Only BT20-047 should be eligible for the Blocker search; BT19-069 and EX8-046 have inherited-only Blocker and must return to the bottom.",
  },
  "arena-p097-zubamon-reveal-order": {
    ptBR: "Compre a carta do turno, jogue Zubamon e aceite colocá-lo sob o Digimon. As 3 cartas reveladas devem aparecer já na pergunta topo/fundo, antes de você escolher.",
    en: "Draw for the turn, play Zubamon, and accept placing it under the Digimon. The 3 revealed cards must already be shown in the top/bottom question, before you choose.",
  },
  "arena-ex5-attack-priority": {
    ptBR: "O bot ataca com Shoutmon EX6. Os efeitos Ao Atacar e Alliance dele devem resolver antes das reações de MetalEtemon e da herança de Etemon.",
    en: "The bot attacks with Shoutmon EX6. Its When Attacking and Alliance effects must resolve before MetalEtemon and inherited Etemon react.",
  },
  "arena-reboot-timing": {
    ptBR: "Seu turno começa com todos os seus Digimon com Reboot suspensos. Observe a fase de Dessuspensão.",
    en: "Your turn starts with all your Reboot Digimon suspended. Watch the Unsuspend phase.",
  },
  "arena-alliance-20": {
    ptBR: "Encerre a criação, ataque com Seadramon e escolha 1 dos outros 19 Digimon para Alliance.",
    en: "End breeding, attack with Seadramon, and choose 1 of the other 19 Digimon for Alliance.",
  },
  "arena-bt21-davis-top-stack": {
    ptBR: "Encerre a criação e ative o efeito Main de Davis. Magnamon deve ir ao lixo e Veemon deve permanecer no campo.",
    en: "End breeding and activate Davis's Main effect. Magnamon should be trashed and Veemon should remain in play.",
  },
  "arena-seven-code-link-dp": {
    ptBR: "DP esperado: Medicmon 7000, Globemon 13000 e Weatherdramon 8000. Compare os valores exibidos.",
    en: "Expected DP: Medicmon 7000, Globemon 13000, and Weatherdramon 8000. Compare the displayed values.",
  },
  "arena-vortex-target-legality": {
    ptBR: "Encerre o turno e aceite Vortex. Só o Digimon suspenso do oponente deve ser um alvo válido.",
    en: "End the turn and accept Vortex. Only the opponent's suspended Digimon should be a valid target.",
  },
  "arena-junomon-opponent-target": {
    ptBR: "Encerre a criação, jogue Junomon e aceite o efeito. O seletor deve permitir escolher o Digimon do oponente.",
    en: "End breeding, play Junomon, and accept the effect. The target picker must allow the opponent's Digimon.",
  },
  "arena-ex13-giromon-block-triggers": {
    ptBR: "O bot ataca primeiro. Bloqueie com Giromon para abrir os 6 efeitos simultâneos de Giromon, Guardromon e dos 4 Tai.",
    en: "The bot attacks first. Block with Giromon to open the 6 simultaneous Giromon, Guardromon, and 4 Tai effects.",
  },
  "arena-ex13-deletion-trigger-ordering": {
    ptBR: "Use Heat Viper, delete seu EX13-028 Sukamon e escolha a ordem entre o efeito On Deletion dele e a herança do KingSukamon sob KingEtemon.",
    en: "Use Heat Viper, delete your EX13-028 Sukamon, and choose the order between its On Deletion effect and KingSukamon inherited under KingEtemon.",
  },
  "arena-ex13-kingsukamon-immunity-lapse": {
    ptBR: "Jogue KingSukamon, descarte Chuumon e transforme o Digimon adversário. A aura de KingEtemon deve deletá-lo com 0 DP; então aceite a herança para revelar 3 e jogar Chuumon.",
    en: "Play KingSukamon, trash Chuumon, and rewrite the opposing Digimon. KingEtemon's aura should delete it at 0 DP; then accept the inherited effect to reveal 3 and play Chuumon.",
  },
  "arena-ex13-kings-opponent-sukamon": {
    ptBR: "Os 2 KingSukamon adversários completam o requisito de 3 nomes: ambos devem estar com 3000 DP. Ataque o suspenso com KingEtemon; a herança deve revelar 3 cartas.",
    en: "The opponent's 2 KingSukamon complete the 3-name threshold: both should have 3000 DP. Attack the suspended one with KingEtemon; the inherited effect should reveal 3 cards.",
  },
  "arena-ex10-god-grade-raising-color": {
    ptBR: "Copipemon é o único Appmon e está na criação. Compare Cyber Engage com God Grade Unleashed na mão.",
    en: "Copipemon is the only Appmon and is in breeding. Compare Cyber Engage with God Grade Unleashed in hand.",
  },
  "arena-suspend-lock-block": {
    ptBR: "Seu Blocker já começa impedido de suspender. O ataque do bot não deve poder ser bloqueado.",
    en: "Your Blocker starts unable to suspend. It must not be able to block the bot's attack.",
  },
};

const SCENARIO_OPTIONS: readonly [DevScenario, string][] = [
  ["arena", "Attack steps · Counter/Blocker"],
  ["arena-aegiochus-dark-assembly", "Aegiochus Dark · Wizardmon Assembly"],
  ["arena-alliance-20", "Alliance · 20 Digimon"],
  ["arena-bt11-analogman-redirect-timing", "BT11 Analogman · redirect timing"],
  ["arena-bt20-grademon-redirect", "BT20 Grademon · inherited redirect"],
  ["arena-bt21-davis-top-stack", "BT21 Davis · top stacked card regression"],
  ["arena-bt26-chronomon-dm-succession", "BT26 Chronomon DM · Succession When Digivolving"],
  ["arena-face-up-security", "Security · opponent face-up cards"],
  ["arena-ex13-grademon-immunity", "EX13 Alphamon · Assembly from trash"],
  ["arena-ex13-gotsumon-blocker-search", "EX13 Gotsumon · printed Blocker search"],
  ["arena-ex13-giromon-block-triggers", "EX13 Giromon · 6 block triggers"],
  ["arena-ex13-deletion-trigger-ordering", "EX13 Kings · deletion trigger ordering"],
  ["arena-ex13-kings-opponent-sukamon", "EX13 Kings · opponent Sukamon"],
  ["arena-ex13-kingsukamon-immunity-lapse", "EX13 KingSukamon · 0 DP deletion"],
  ["arena-ex13-examon", "EX13 Examon · Lv.5 DNA + battle timing"],
  ["arena-p097-zubamon-reveal-order", "P-097 Zubamon · reveal before top/bottom"],
  ["arena-ex5-attack-priority", "EX5 Etemon · attack trigger priority"],
  ["arena-ex10-god-grade-raising-color", "EX10 God Grade · raising-area colour"],
  ["arena-ex11-ryutaro-suspended", "EX11 Ryutaro · suspended activation"],
  ["arena-issue-4888-app-fusion", "#4888 · co-linked App Fusion"],
  ["arena-issue-4889-weregarurumon-dna", "#4889 · WereGarurumon DNA"],
  ["arena-issue-4890-reina-deletion", "#4890 · Reina deletion trigger"],
  ["arena-issue-4891-seiten-on-play", "#4891 · SeitenGokuumon On Play"],
  ["arena-issue-4892-effect-digixros", "#4892 · effect DigiXros"],
  ["arena-issue-4893-seiten-evo-cost", "#4893 · SeitenGokuumon evo cost"],
  ["arena-junomon-opponent-target", "Junomon · opponent target"],
  ["arena-jupitermon-siren", "Jupitermon · Sirenmon + Dan & Kanan"],
  ["arena-magnamon-x", "Magnamon X · Sonic Shot unsuspend"],
  ["arena-mervamon-effect-assembly", "Mervamon · effect-played Assembly"],
  ["arena-ex13-magnamon-end-turn", "EX13 Magnamon · End of turn / Reboot"],
  ["arena-reboot-timing", "Reboot · Active phase timing"],
  ["arena-sagasol-effect-assembly", "SagaSol · effect-played Assembly"],
  ["arena-sagasol-etemon-protected-dp", "SagaSol · Etemon vs protected DP"],
  ["arena-sagasol-guard-source", "SagaSol · granted Guard source"],
  ["arena-seven-code-link-dp", "Seven Code · Link DP comparison"],
  ["arena-suspend-lock-block", "Suspend lock · Blocker legality"],
  ["arena-vortex-target-legality", "Vortex · target legality"],
  ["arena-vortexdramon", "Vortexdramon · optional OPT"],
];

/** Uses the normal room, bot and intent pipeline; all results come from the engine. */
export function LiveArenaDemo() {
  const { locale } = useTranslation();
  const portuguese = locale === "pt-BR";
  const [run, setRun] = useState(0);
  const [scenario, setScenario] = useState<DevScenario>(() => {
    const requested = new URLSearchParams(window.location.search).get("scenario") as DevScenario | null;
    return requested && (SCENARIO_OPTIONS.some(([value]) => value === requested) || requested === "card-bugs")
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
  const note = SCENARIO_NOTES[scenario] ?? DEFAULT_NOTE;
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
              setScenario(event.target.value as DevScenario);
              setRun((current) => current + 1);
            }}
          >
            {SCENARIO_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            {scenario === "card-bugs" ? <option value="card-bugs">Card bugs</option> : null}
          </select>
        </label>
        <button type="button" className="aegis-arena-demo-replay" onClick={reset}>
          {portuguese ? "Reiniciar combate" : "Reset combat"}
        </button>
        <span className="aegis-arena-demo-note">{portuguese ? note.ptBR : note.en}</span>
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
