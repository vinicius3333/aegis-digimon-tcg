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
  "arena-bt20-bakemon-violet-retroactive": {
    ptBR: "Evolua Ghostmon para BT20-068 Bakemon. Aceite jogar BT23-087 Violet Inboots da mão. Como Violet entrou depois da evolução, ela deve permanecer desuspensa e não deve oferecer Rush para esse Bakemon.",
    en: "Digivolve Ghostmon into BT20-068 Bakemon. Accept playing BT23-087 Violet Inboots from hand. Violet entered after the evolution, so it should remain unsuspended and should not offer Rush to this Bakemon.",
  },
  "arena-bt23-bakemon-no-target": {
    ptBR: "Jogue EX11-051 Necromon e aceite jogar o primeiro Bakemon da lixeira. Necromon deleta o Digimon adversário de nível 4; Bakemon ainda deve oferecer deletar um Agumon próprio como custo, mesmo sem alvo de nível 4. Depois evolua o segundo EX11-051 sobre o Digimon roxo de nível 5 e jogue o segundo Bakemon da lixeira. Escolha o outro Agumon como custo. Um Digimon adversário de nível 5 permanece em campo.",
    en: "Play EX11-051 Necromon and accept playing the first Bakemon from trash. Necromon deletes the opposing level-4 Digimon; Bakemon should still offer to delete one of your Agumon as its cost with no level-4 target. Then digivolve the second EX11-051 onto your purple level-5 Digimon and play the second Bakemon from trash. Delete your other Agumon as the cost. One opposing level-5 Digimon remains.",
  },
  "arena-p240-arcturusmon-vb-routes": {
    ptBR: "Jogue uma P-240 Arcturusmon da mão com Assembly -6, escolhendo os três cards da lixeira (nível 5, 4 e 3): custo 7. Depois evolua sua Canoweissmon EX12-014 (Vermelha/Amarela, nível 5, [VB]) para a outra Arcturusmon pela evolução alternativa: custo 4. As duas rotas devem estar disponíveis e a memória termina em 0.",
    en: "Play one P-240 Arcturusmon from hand with Assembly -6, choosing the three trash cards (levels 5, 4, and 3): cost 7. Then digivolve your EX12-014 Canoweissmon (Red/Yellow, level 5, [VB]) into the other Arcturusmon with the alternate route: cost 4. Both routes must be offered, and memory ends at 0.",
  },
  "arena-ex12-proximamon-dual-siriusmon": {
    ptBR: "Você tem dois Digimon com a linha do Gammamon nas fontes: Siriusmon (sobre Gammamon, BetelGammamon e Canoweissmon) e Canoweissmon (sobre Gammamon e BetelGammamon). Evolua a EX12-018 Siriusmon para EX12-077 Proximamon pela rota alternativa (custo 5). No efeito de Quando Evolui que joga ou usa um card das fontes, a lista deve mostrar os cards das fontes dos dois Digimon, incluindo Siriusmon. Escolha Siriusmon: ela é usada como Option (Planet Punch) e deleta o Groundramon do bot (maior DP). Depois você pode recusar ou aceitar a Arts Digivolve da Canoweissmon para Siriusmon; recusando, Siriusmon vai para a lixeira.",
    en: "You have two Digimon with the Gammamon line in their sources: Siriusmon (over Gammamon, BetelGammamon, and Canoweissmon) and Canoweissmon (over Gammamon and BetelGammamon). Digivolve EX12-018 Siriusmon into EX12-077 Proximamon with the alternate route (cost 5). In the When Digivolving play-or-use effect, the list must show the source cards of both Digimon, including Siriusmon. Choose Siriusmon: it is used as an Option (Planet Punch) and deletes the bot's Groundramon (highest DP). Then you may decline or accept Arts Digivolve from Canoweissmon into Siriusmon; if you decline, Siriusmon goes to trash.",
  },
  "arena-ex12-virus-busters-effect-attack": {
    ptBR: "Encerre seu turno. A fonte EX12-001 Nyaromon oferece a DNA: aceite e junte BetelGammamon com Garurumon em EX12-032 WereGarurumon, depois aceite atacar. A escolha de ordem deve listar juntos o Virus Busters EX12-069 da segurança, o [Quando Evolui] e o [Ao Atacar] de WereGarurumon e o [Ao Atacar] herdado de Garurumon. Resolva o Virus Busters por último: ele ainda deve oferecer jogar um Digimon [VB] do mesmo nível.",
    en: "End your turn. The EX12-001 Nyaromon source offers its DNA: accept, combine BetelGammamon and Garurumon into EX12-032 WereGarurumon, then accept the attack. The order prompt must list together EX12-069 Virus Busters from security, WereGarurumon's [When Digivolving] and [When Attacking], and Garurumon's inherited [When Attacking]. Resolve Virus Busters last: it must still offer to play a same-level [VB] Digimon.",
  },
  "arena-ex7-seventh-fascination-turn": {
    ptBR: "Jogue EX7-072 Seventh Fascination e encerre seu turno. O Digimon do bot deve permanecer em campo, sem pedido de deleção nesse momento. O efeito concedido só deve ativar no fim do turno do bot.",
    en: "Play EX7-072 Seventh Fascination and end your turn. The bot's Digimon should stay in play, with no deletion prompt yet. The granted effect should activate only at the end of the bot's turn.",
  },
  "arena-ex7-seventh-fascination-trash-turn": {
    ptBR: "Evolua BT11-083 para EX7-061 Lilithmon (X Antibody) e aceite devolver EX7-072 da lixeira ao fundo do deck. O Digimon do bot deve sobreviver ao fim do seu turno e só ser deletado no fim do turno dele.",
    en: "Digivolve BT11-083 into EX7-061 Lilithmon (X Antibody) and accept returning EX7-072 from trash to the deck bottom. The bot's Digimon should survive your turn end and be deleted only at the end of its own turn.",
  },
  "arena-bt22-rie-kishibe-delete-without-digivolve": {
    ptBR: "Você tem 5 cards de segurança, BT22-090 Rie Kishibe e EX13-074 Rie Kishibe ([CS]) em campo, e BT19-073 e EX13-064 LordKnightmon na mão. Encerre seu turno. O [Fim do Seu Turno] da BT22-090 deve oferecer deletar a EX13-074: aceite. A EX13-074 vai para a lixeira, mas a BT22-090 não evolui, porque nenhuma LordKnightmon cumpre o requisito com mais de 3 cards de segurança. As duas LordKnightmon ficam na mão.",
    en: "You have 5 security cards, BT22-090 Rie Kishibe and EX13-074 Rie Kishibe ([CS]) in play, and BT19-073 and EX13-064 LordKnightmon in hand. End your turn. BT22-090's [End of Your Turn] must offer to delete EX13-074: accept. EX13-074 goes to the trash, but BT22-090 does not digivolve, because no LordKnightmon meets its requirement with more than 3 security cards. Both LordKnightmon stay in hand.",
  },
  "arena-ex3-wingdramon-evade-suspend-lock": {
    ptBR: "Use Bishop Device e escolha o Wingdramon adversário. Em seguida, use Crimson Flare para deletá-lo. Wingdramon não pode suspender para pagar Evade: não deve aparecer uma escolha de Evade, e ele deve ir para a lixeira.",
    en: "Use Bishop Device and choose the opposing Wingdramon. Then use Crimson Flare to delete it. Wingdramon cannot suspend to pay for Evade: no Evade choice should appear, and it should go to the trash.",
  },
  "arena-ex13-wingdramon-evade-suspend-lock": {
    ptBR: "Use EX13 Wingdramon para descartar as duas fontes do Wingdramon adversário e impedir sua suspensão. Depois, use Crimson Flare para deletá-lo. Evade não deve ser oferecido, e o Wingdramon deve ir para a lixeira.",
    en: "Play EX13 Wingdramon to trash both sources under the opposing Wingdramon and prevent it from suspending. Then use Crimson Flare to delete it. Evade should not be offered, and Wingdramon should go to the trash.",
  },
  "arena-moon-pending-source-deleted": {
    ptBR: "Encerre a criação e use Heat Viper: delete seu ShadowSeraphimon e o Tapirmon adversário. ShadowSeraphimon deve recuperar sua segurança de 4 para 5; escolha MoonMillenniummon para receber -20000 DP. Moon deve ser deletado e seu efeito pendente de descartar segurança não pode ativar. Sua segurança deve continuar em 5; Tapirmon ainda compra 1 para o oponente.",
    en: "End breeding and use Heat Viper: delete your ShadowSeraphimon and the opposing Tapirmon. ShadowSeraphimon must recover your security from 4 to 5; choose MoonMillenniummon for -20000 DP. Moon must be deleted and its pending security-trash effect must not activate. Your security stays at 5; Tapirmon still draws 1 for the opponent.",
  },
  "arena-mirage-hidden-hand": {
    ptBR: "Encerre a criação e ataque a segurança com MirageGaogamon: Burst Mode. Aceite o efeito Ao Atacar e escolha 6 das 14 cartas viradas para baixo da mão adversária. Confirme; o bot confere suas próprias cartas. Ordene as 6 cartas ainda ocultas e confirme. A mão adversária deve ficar com 8 cartas e Mirage deve desuspender antes da checagem de segurança.",
    en: "End breeding and attack security with MirageGaogamon: Burst Mode. Accept When Attacking and choose 6 of the opponent's 14 face-down hand cards. Confirm; the bot inspects its own selected cards. Order the 6 still-concealed cards and confirm. The opponent must have 8 hand cards left and Mirage must unsuspend before the security check.",
  },
  "arena-piedmon-declined-opt": {
    ptBR: "Encerre a criação. Use Heat Viper: delete seu ShadowSeraphimon como custo e o Tapirmon adversário. Escolha resolver Piedmon primeiro e recuse jogar da lixeira. Resolva ShadowSeraphimon: recupere segurança e reduza o DP de Titamon para deletá-lo. Piedmon deve oferecer novamente seu efeito; agora aceite jogar da lixeira. Recusar a primeira ocorrência não gasta o Uma Vez por Turno.",
    en: "End breeding. Use Heat Viper: delete your ShadowSeraphimon as the cost and the opponent's Tapirmon. Resolve Piedmon first and decline playing from trash. Resolve ShadowSeraphimon: recover security and reduce Titamon's DP to delete it. Piedmon must offer its effect again; now accept playing from trash. Declining the first occurrence does not spend Once Per Turn.",
  },
  "arena-dominimon-security-priority": {
    ptBR: "Encerre a criação e evolua MagnaAngemon para Dominimon. Aceite jogar o outro MagnaAngemon da segurança e dê -7000 DP a Valkyrimon. MagnaAngemon deve recuperar antes da reação de Valkyrimon à remoção da segurança. Recuse a proteção de Dominimon se quiser observar a deleção posterior de MagnaAngemon.",
    en: "End breeding and evolve MagnaAngemon into Dominimon. Accept playing the other MagnaAngemon from security and give Valkyrimon -7000 DP. MagnaAngemon must recover before Valkyrimon's security-removal reaction. Decline Dominimon's protection to observe MagnaAngemon's subsequent deletion.",
  },
  "arena-rizegreymon-derived-priority": {
    ptBR: "Encerre a criação, evolua RizeGreymon para RizeGreymon X e resolva seu Quando Digivolve antes de Cool Boy. Jogue Marcus de graça e reduza o DP de Tapirmon. A ordem deve ser Marcus Ao Jogar, Tapirmon Ao Deletar e só então o efeito antigo de Cool Boy.",
    en: "End breeding, evolve RizeGreymon into RizeGreymon X and resolve its When Digivolving before Cool Boy. Play Marcus for free and reduce Tapirmon's DP. Resolve Marcus On Play, Tapirmon On Deletion, then Cool Boy's older pending effect.",
  },
  "arena-trident-derived-priority": {
    ptBR: "Encerre a criação e jogue Trident Revolver. Delete Tapirmon e aceite jogar Marcus. O Ao Jogar de Marcus deve resolver antes da compra do Tapirmon adversário, embora a deleção tenha acontecido primeiro.",
    en: "End breeding and play Trident Revolver. Delete Tapirmon and accept playing Marcus. Marcus On Play must resolve before the opposing Tapirmon's draw, even though the deletion happened first.",
  },
  "arena-flashy-attack-priority": {
    ptBR: "Encerre a criação e jogue Flashy Boss Punch. Suspenda Tapirmon e dê -12000 DP a ele; aceite atacar a segurança com Leomon. Tapirmon deve ser deletado e comprar antes da checagem de segurança, durante a interrupção da Option pelo ataque.",
    en: "End breeding and play Flashy Boss Punch. Suspend Tapirmon and give it -12000 DP; accept attacking security with Leomon. Tapirmon must be deleted and draw before the security check, while the attack interrupts the Option.",
  },
  "arena-hellscythe-onplay-priority": {
    ptBR: "Encerre a criação e jogue Flame Hellscythe. Escolha o Wizardmon adversário para -6000 DP e aceite jogar MagnaAngemon do lixo. A recuperação de MagnaAngemon deve resolver ANTES do Ao Deletar de Wizardmon, mesmo que Wizardmon depois reduza o DP de MagnaAngemon. Confira a ordem no histórico: MagnaAngemon, depois Wizardmon.",
    en: "End breeding and play Flame Hellscythe. Give the opposing Wizardmon -6000 DP and accept playing MagnaAngemon from trash. MagnaAngemon's recovery must resolve BEFORE Wizardmon's On Deletion, even if Wizardmon then reduces MagnaAngemon's DP. Check the history: MagnaAngemon, then Wizardmon.",
  },
  "arena-vikemon-live-source-lock": {
    ptBR: "Encerre a criação e ataque a segurança com Monodramon. O bot faz Blast Digivolve de Zudomon para Vikemon ACE. Gomamon, com 1 fonte, fica impedido de suspender/atacar. Evolua esse Gomamon para Gorillamon: com 2 fontes, ele deve poder atacar a segurança. Jogue o outro Gomamon da mão: ele também recebe a trava, embora tenha entrado depois do efeito. A trava dura até o fim deste turno.",
    en: "End breeding and attack security with Monodramon. The bot Blast Digivolves Zudomon into Vikemon ACE. Gomamon, with 1 source, cannot suspend/attack. Evolve that Gomamon into Gorillamon: with 2 sources, it must be able to attack security. Play the other Gomamon from hand: it also receives the lock despite entering after the effect. The lock expires at the end of this turn.",
  },
  "arena-kotone-digixros-pending-attack": {
    ptBR: "Encerre a criação e recuse os efeitos do início da Main. Jogue Shoutmon X7 da mão sem DigiXros e recuse seus efeitos e o ataque de Taiki. Ative Kotone para jogar Shoutmon EX6: selecione Taiki BT10-087, escolha os materiais sob ele e use OmniShoutmon + RaptorSparrowmon. Resolva o On Play de EX6 antes de Taiki e aceite jogar ShootingStarmon. Recuse o ataque de ShootingStarmon; depois aceite o ataque pendente de EX6 via Taiki BT21-083, escolha a segurança e recuse Alliance. EX6 deve atacar com Rush herdado; ambos os Taikis ficam suspensos.",
    en: "End breeding and decline the Start of Main effects. Play Shoutmon X7 from hand without DigiXros; decline its effects and Taiki's attack. Activate Kotone to play Shoutmon EX6: select Taiki BT10-087, choose the materials under it, and use OmniShoutmon + RaptorSparrowmon. Resolve EX6's On Play before Taiki and accept playing ShootingStarmon. Decline ShootingStarmon's attack, then accept EX6's pending attack through Taiki BT21-083, target security and decline Alliance. EX6 must attack with inherited Rush; both Taikis end suspended.",
  },
  "arena-bt6-beelstarmon-duplicate-cost": {
    ptBR: "Encerre a criação e jogue uma BT6-112 BeelStarmon da mão. Há outra cópia na mão e sete redutores no lixo (uma BeelStarmon e seis Options de custo 7). O custo impresso 12 deve cair para 5 apenas uma vez: a memória vai de 6 para 1, não para 6. Depois, resolva o Ao Jogar escolhendo uma Option do lixo.",
    en: "End breeding and play one BT6-112 BeelStarmon from hand. Another copy is in hand and seven reducers are in trash (one BeelStarmon and six cost-7 Options). Its printed cost 12 must fall to 5 only once: memory goes from 6 to 1, not stay at 6. Then resolve On Play by choosing an Option from trash.",
  },
  "arena-bt13-king-drasil-source-count": {
    ptBR: "O turno abre direto na Principal: King Drasil_7D6 já colocou o Digi-Ovo do topo embaixo de si e tem 3 fontes. Jogue Omekamon (memória 10 para 5) e, no Ao Jogar, coloque Kentaurosmon embaixo de King Drasil: agora são 4 fontes. Jogue Jesmon e aceite a redução: o custo 12 cai 4 + 4 e a memória vai de 5 para 1, não para 0.",
    en: "The turn opens in Main: King Drasil_7D6 has already placed the top Digi-Egg under itself and holds 3 sources. Play Omekamon (memory 10 to 5) and, on its On Play, place Kentaurosmon under King Drasil: it now holds 4 sources. Play Jesmon and accept the reduction: cost 12 falls by 4 + 4 and memory goes from 5 to 1, not to 0.",
  },
  "arena-bt21-dracomon-start-main": {
    ptBR: "Mova Dracomon X da criação: os dois efeitos devem aparecer juntos. Resolva BT20-007 primeiro, descarte Dracomon EX13-008 e compre Coredramon. Depois resolva BT21-046 e aceite evoluir de graça. Reinicie para testar a ordem inversa: resolver BT21-046 antes da compra consome sua oportunidade.",
    en: "Move Dracomon X out of breeding: both effects should appear together. Resolve BT20-007 first, trash Dracomon EX13-008 and draw Coredramon. Then resolve BT21-046 and accept the free evolution. Reset to try the reverse order: resolving BT21-046 before the draw consumes its opportunity.",
  },
  "arena-mervamon-effect-assembly": {
    ptBR: "Jogue Mervamon, aceite o efeito, escolha Aegiochusmon: Dark no lixo e use o Lv.4 TB como material de Assembly.",
    en: "Play Mervamon, accept its effect, choose Aegiochusmon: Dark in trash, then use the Lv.4 TB card as its Assembly material.",
  },
  "arena-bt11-analogman-redirect-timing": {
    ptBR: "Jogue GrapLeomon e mande Gaomon atacar o jogador. O efeito Ao Atacar de Gaomon (cada jogador compra 1) deve resolver ANTES de o Analogman do bot suspender e redirecionar o ataque.",
    en: "Play GrapLeomon and order Gaomon to attack the player. Gaomon's When Attacking effect (each player draws 1) must resolve BEFORE the bot's Analogman suspends and redirects the attack.",
  },
  "arena-bt11-rina-ulforce-immunity": {
    ptBR: "Encerre a criação e ataque a segurança com Rebootmon. Ao Atacar, vincule Logimon de graça e desuspenda Rebootmon (imunidade a efeitos de Digimon do oponente). Logimon suspende UlforceVeedramon; a Rina do bot ativa o Quando Digivolve de Ulforce. Rebootmon deve ficar; só BT1-013 volta ao fundo do deck.",
    en: "End breeding and attack security with Rebootmon. On When Attacking, link Logimon for free and unsuspend Rebootmon (immune to opponent Digimon effects). Logimon suspends UlforceVeedramon; the bot's Rina activates Ulforce's When Digivolving. Rebootmon must stay; only BT1-013 goes to the deck bottom.",
  },
  "arena-bt20-grademon-redirect": {
    ptBR: "O bot ataca sua segurança. Aceite o efeito herdado de Grademon e escolha seu Digimon para mudar o alvo do ataque para ele.",
    en: "The bot attacks your security. Accept Grademon's inherited effect and choose your Digimon to redirect the attack to it.",
  },
  "arena-bt20-invisimon-empty-stack": {
    ptBR: "Ataque o jogador com Invisimon. A segurança do topo está virada para cima, mas Invisimon não tem cartas de digivolução: ele deve ficar na área de batalha.",
    en: "Attack the player with Invisimon. The top security card is face up, but Invisimon has no digivolution cards: it must stay in the battle area.",
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
  "arena-paildramon-dna-inheritance": {
    ptBR: "Jogue ExVeemon (4 memória) e faça DNA Digivolve em Paildramon usando ExVeemon e Lighdramon. Confira os efeitos herdados das cartas de digivolução, incluindo Veemon embaixo de Lighdramon. A primeira carta da segurança do bot é um Agumon de 2000 DP.",
    en: "Play ExVeemon (4 memory), then DNA Digivolve into Paildramon with ExVeemon and Lighdramon. Check the inherited effects from the digivolution cards, including Veemon under Lighdramon. The bot's top security card is a 2000 DP Agumon.",
  },
  "arena-bt24-silphymon-dna": {
    ptBR: "Selecione Silphymon na mão e faça DNA Digivolve usando Gatomon amarelo e Garurumon verde/azul. O custo deve ser 0.",
    en: "Select Silphymon in hand and DNA Digivolve using yellow Gatomon and green/blue Garurumon. The cost must be 0.",
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
  "arena-issue-4894-jesmon-token-limit": {
    ptBR: "Ataque com Jesmon tendo um token Atho, René & Por em jogo. O modal não deve oferecer a rota do token: apenas Sistermon Ciel, e nenhum segundo token pode entrar em jogo.",
    en: "Attack with Jesmon while an Atho, René & Por token is in play. The modal must not offer the token route: only Sistermon Ciel, and no second token may enter play.",
  },
  "arena-jesmon-scramble-dp-blocked": {
    ptBR: "Encerre a criação e use Red Scramble. O adversário tem Garurumon com 5000 DP e Analog Youth: Jesmon não deve ser oferecido para evoluir Huckmon. Red Scramble fica no campo, Jesmon na mão e a memória cai de 5 para 3.",
    en: "End breeding and use Red Scramble. The opponent has Garurumon at 5000 DP and Analog Youth: Jesmon must not be offered to evolve Huckmon. Red Scramble stays in play, Jesmon stays in hand, and memory goes from 5 to 3.",
  },
  "arena-jesmon-scramble-dp-allowed": {
    ptBR: "Encerre a criação e use Red Scramble. O MetalTyrannomon adversário tem exatamente 10000 DP: aceite evoluir Huckmon em Jesmon e recuse os efeitos opcionais seguintes. A evolução custa 2 após a redução; a memória cai de 5 para 1, incluindo o custo da Opção.",
    en: "End breeding and use Red Scramble. The opposing MetalTyrannomon has exactly 10000 DP: accept evolving Huckmon into Jesmon, then decline further optional effects. Evolution costs 2 after reduction; memory goes from 5 to 1 including the Option cost.",
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
  "arena-bt20-takemikazuchi-turn-continue": {
    ptBR: "Fenriloogamon esta nas cartas de digivolucao de Takemikazuchi. Jogue os dois Monodramon: a memoria vai de +2 para 2 do oponente e o seu turno DEVE continuar. Jogue Gazimon: a memoria chega a 3 do oponente e o turno termina.",
    en: "Fenriloogamon sits in Takemikazuchi's digivolution cards. Play both Monodramon: memory walks from +2 to 2 on the opponent's side and your turn MUST continue. Then play Gazimon: memory reaches 3 on the opponent's side and the turn ends.",
  },
  "arena-ex13-gotsumon-blocker-search": {
    ptBR: "Compre BT1-009, encerre a criação e jogue Gotsumon. Na busca por Blocker, somente BT20-047 deve ser elegível; BT19-069 e EX8-046 têm Blocker apenas herdado e devem voltar ao fundo.",
    en: "Draw BT1-009, end breeding, and play Gotsumon. Only BT20-047 should be eligible for the Blocker search; BT19-069 and EX8-046 have inherited-only Blocker and must return to the bottom.",
  },
  "arena-rainbow-evo-cost": {
    ptBR: "Compre a carta do turno e encerre a criação. Digivolva Omnimon: Merciful Mode em WarGreymon (Lv.6 vermelho/preto) pagando 6: a memória vai de 12 para 6. Recuse o ataque. Depois digivolva Susanoomon em Boltmon (Lv.6 roxo) pagando 6: a memória chega a 0. As duas cartas devem oferecer Digivolver, não só Jogar.",
    en: "Draw the turn card and end breeding. Digivolve Omnimon: Merciful Mode onto WarGreymon (red/black Lv.6) for 6: memory goes from 12 to 6. Decline the attack. Then digivolve Susanoomon onto Boltmon (purple Lv.6) for 6: memory reaches 0. Both cards must offer Digivolve, not only Play.",
  },
  "arena-hand-reconnect-sync": {
    ptBR: "Compre a carta do turno e encerre o turno. Assim que o bot começar, fique offline (DevTools › Network › Offline ou modo avião) e só volte quando o seu próximo turno começar. Você comprou Kotemon offline: ele deve aparecer na mão. Jogue SkullKnightmon: no custo de descartar 1 carta da mão, Kotemon e DarkKnightmon devem aparecer com a arte, nunca como verso.",
    en: "Draw the turn card and end your turn. Once the bot starts, go offline (DevTools › Network › Offline or airplane mode) and come back only when your next turn starts. You drew Kotemon while offline: it must show in your hand. Play SkullKnightmon: its trash-1-card-from-hand cost must show Kotemon and DarkKnightmon with their art, never as a card back.",
  },
  "arena-mightyaxe-mode-digixros": {
    ptBR: "Compre a carta do turno, encerre a criação e jogue DarkKnightmon (BT10-066) com DigiXros. Mighty Axe Mode na mão deve ser oferecido nos dois espaços: como [DeadlyAxemon] junto com SkullKnightmon, ou como [SkullKnightmon]. Ele sozinho não pode preencher os dois espaços.",
    en: "Draw the turn card, end breeding, and play DarkKnightmon (BT10-066) with DigiXros. Mighty Axe Mode in hand must be offered for both slots: as [DeadlyAxemon] next to SkullKnightmon, or as [SkullKnightmon]. It cannot fill both slots on its own.",
  },
  "arena-ex13-examon-battle-win-timing": {
    ptBR: "Faça a DNA digivolução de Wingdramon + Groundramon em Examon. Examon ataca a segurança e depois batalha com o Digimon do bot. O efeito de vencer a batalha não pode resolver sozinho: ele deve aparecer no mesmo prompt de ordem que o efeito de suspensão do Wingdramon e o [When Attacking] do Bebydomon, e você escolhe a ordem.",
    en: "DNA digivolve Wingdramon + Groundramon into Examon. Examon attacks security, then battles the bot's Digimon. The win-battle effect must not resolve on its own: it must appear in the same order prompt as Wingdramon's suspend effect and Bebydomon's [When Attacking], and you choose the order.",
  },
  "arena-ex13-chirinmon-cost-choice": {
    ptBR: "Digivolva o Lv.4 [DATA SQUAD] em Chirinmon. O efeito deve perguntar uma vez se você quer usá-lo e, depois, qual custo pagar: a carta do topo da segurança ou a carta virada para baixo sob o Tamer. Nenhum botão deve repetir o texto do efeito.",
    en: "Digivolve the [DATA SQUAD] Lv.4 into Chirinmon. The effect must ask once whether to use it, then which cost to pay: the top security card or the face-down card under the Tamer. No button should repeat the effect text.",
  },
  "arena-sukamon-transform-digivolve": {
    ptBR: "Jogue KingSukamon (custo 7), aceite descartar Chuumon e transforme o Sunflowmon verde do bot em um Sukamon branco. Encerre o turno. No turno do bot, ele tem Blossomon verde (Nv.5) na mão e 3 de memória, mas não pode digievoluir o Sukamon branco nele: Sunflowmon continua no topo com o token Sukamon. O bot é quem digievolui porque o KingSukamon só afeta Digimon do oponente.",
    en: "Play KingSukamon (cost 7), accept trashing Chuumon, and turn the bot's green Sunflowmon into a white Sukamon. End your turn. On the bot's turn it holds green Blossomon (Lv.5) and has 3 memory, but it can't digivolve the white Sukamon into it: Sunflowmon stays on top under the Sukamon token. The bot does the digivolving because KingSukamon only affects the opponent's Digimon.",
  },
  "arena-sukamon-transform-digivolve-viewer": {
    ptBR: "O bot joga KingSukamon, descarta Chuumon e transforma seu Sunflowmon verde em Sukamon branco até o fim do seu turno. No seu turno, Blossomon verde não deve aparecer nem ser aceito como digievolução sobre ele.",
    en: "The bot plays KingSukamon, trashes Chuumon, and rewrites your green Sunflowmon into a white Sukamon until your turn ends. On your turn, green Blossomon must not be offered or accepted as a digivolution onto it.",
  },
  "arena-p097-zubamon-reveal-order": {
    ptBR: "Compre a carta do turno, jogue Zubamon e aceite colocá-lo sob o Digimon. As 3 cartas reveladas devem aparecer já na pergunta topo/fundo, antes de você escolher.",
    en: "Draw for the turn, play Zubamon, and accept placing it under the Digimon. The 3 revealed cards must already be shown in the top/bottom question, before you choose.",
  },
  "arena-p246-motimon-kingetemon": {
    ptBR: "KingEtemon (Nv.6) está no topo de Motimon → Chuumon → Sukamon → KingSukamon. Ataque a segurança com Sukamon: Titamon o destrói na batalha e a herança de Motimon ativa. MetalEtemon (Nv.6, exige Nv.5) NÃO deve ser oferecido e KingEtemon continua no topo. Só depois de um De-Digivolve 1 (KingSukamon Nv.5 no topo) MetalEtemon é legal.",
    en: "KingEtemon (Lv.6) sits on top of Motimon → Chuumon → Sukamon → KingSukamon. Attack security with Sukamon: Titamon deletes it in battle and Motimon's inherited effect triggers. MetalEtemon (Lv.6, needs Lv.5) must NOT be offered, and KingEtemon stays on top. Only after a De-Digivolve 1 (KingSukamon Lv.5 on top) is MetalEtemon legal.",
  },
  "arena-p246-motimon-after-de-digivolve": {
    ptBR: "Mesmo campo depois que o De-Digivolve 1 do oponente mandou KingEtemon para o lixo: KingSukamon (Nv.5) está no topo. Ataque a segurança com Sukamon: ele morre na batalha, Motimon ativa e MetalEtemon deve ser oferecido por 2 de memória (4 − 2), ficando sobre KingSukamon.",
    en: "Same board after the opponent's De-Digivolve 1 trashed KingEtemon: KingSukamon (Lv.5) is on top. Attack security with Sukamon: it dies in battle, Motimon triggers, and MetalEtemon must be offered for 2 memory (4 − 2), landing on top of KingSukamon.",
  },
  "arena-de-digivolve-visibility": {
    ptBR: 'O bot começa e joga Aegiochusmon: Blue (BT25-025). O ＜De-Digivolve 1＞ dele tira KingEtemon do topo da sua pilha: deve aparecer o aviso "Aegiochusmon: Blue aplicou De-Digivolve no seu KingEtemon", o painel "Removidas por De-Digivolve" e KingEtemon saindo da pilha rumo ao lixo, com KingSukamon (Nv.5) no topo. No seu turno, ataque a segurança com Sukamon (se Aegiochusmon bloquear, Sukamon morre na batalha do mesmo jeito): Motimon ativa e MetalEtemon é legal por 2 de memória.',
    en: 'The bot goes first and plays Aegiochusmon: Blue (BT25-025). Its ＜De-Digivolve 1＞ strips KingEtemon off your stack: you must see the notice "Aegiochusmon: Blue de-digivolved your KingEtemon", the "De-Digivolved" panel, and KingEtemon lifting off toward the trash, leaving KingSukamon (Lv.5) on top. On your turn, attack security with Sukamon (if Aegiochusmon blocks, Sukamon still dies in battle): Motimon triggers and MetalEtemon is legal for 2 memory.',
  },
  "arena-ex5-biting-crush-delay": {
    ptBR: "Jogue Fujitsumon (EX5-058). O token vai para o campo do oponente por efeito, e o ＜Delay＞ de Biting Crush deve ser oferecido na hora: aceite para descartar Biting Crush e jogar Leviamon do lixo.",
    en: "Play Fujitsumon (EX5-058). The token enters the opponent's battle area by effect, and Biting Crush's ＜Delay＞ must be offered right then: accept it to trash Biting Crush and play Leviamon from the trash.",
  },
  "arena-p108-training-delay-no-target": {
    ptBR: "Wisdom Training está no campo desde um turno anterior e você não tem Digimon. Ative o ＜Delay＞: a carta vai para o lixo e o efeito não faz nada.",
    en: "Wisdom Training has been in the battle area since an earlier turn and you have no Digimon. Activate its ＜Delay＞: the card goes to the trash and the effect does nothing.",
  },
  "arena-bt13-royal-purge-delay-rush": {
    ptBR: "Encerre a criação e resolva o efeito do início da Main de King Drasil. Ative o ＜Delay＞ de Royal Knights of the Purge e escolha BT20-102 Omnimon (X Antibody) entre as cartas de digievolução de King Drasil. Aceite ou recuse a redução de custo e resolva os dois Tamers BT20-091. Omnimon não ativa o Ao Jogar, ganha ＜Rush＞ e deve poder atacar neste turno.",
    en: "End breeding and resolve King Drasil's Start of Main effect. Activate Royal Knights of the Purge's ＜Delay＞ and choose BT20-102 Omnimon (X Antibody) from King Drasil's digivolution cards. Accept or decline the cost reduction and resolve both BT20-091 Tamers. Omnimon's On Play does not activate, it gains ＜Rush＞, and it must be able to attack this turn.",
  },
  "arena-p206-digital-gate-breeding-color": {
    ptBR: "Encerre a criação sem mover Monodramon. Seu único Digimon é Monodramon (vermelho) na área de criação. Ative o ＜Delay＞ de Digital Gate Open: Tai Kamiya (vermelho) deve ser oferecido com custo reduzido em 4 e entrar em jogo; Matt Ishida (azul) não pode ser escolhido.",
    en: "End breeding without moving Monodramon. Your only Digimon is the red Monodramon in the breeding area. Activate Digital Gate Open's ＜Delay＞: the red Tai Kamiya must be offered at 4 less cost and enter play; the blue Matt Ishida can't be chosen.",
  },
  "arena-ex13-merciful-mode-attack-order": {
    ptBR: "Tabuleiro da partida f9505ba7 (Discord 1554922883652784198), turno 6. Encerre a criação. Jogue Omnimon: Merciful Mode com Assembly usando do lixo: WarGreymon, MetalGarurumon, WereGarurumon: Sagittarius Mode, Angemon, MegaKabuterimon e Biyomon. Aceite o ataque, escolha o próprio Merciful Mode e ataque o jogador. São 7 cores, então 3 ativações: as 3 devem resolver (Battle; Recovery só aparece com 5 cartas no lixo do bot) antes da Alliance e dos Ao Atacar herdados de Angemon, WereGarurumon, MetalGarurumon e WarGreymon. A checagem de segurança vem por último.",
    en: "Board of match f9505ba7 (Discord 1554922883652784198), turn 6. End breeding. Play Omnimon: Merciful Mode with Assembly from the trash: WarGreymon, MetalGarurumon, WereGarurumon: Sagittarius Mode, Angemon, MegaKabuterimon, and Biyomon. Accept the attack, choose Merciful Mode itself, and attack the player. Seven colors give 3 activations: all 3 must resolve (Battle; Recovery appears only once the bot has 5 trash cards) before Alliance and the inherited When Attacking effects of Angemon, WereGarurumon, MetalGarurumon, and WarGreymon. The security check comes last.",
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
  "arena-bt21-dogatchmon-link-attack": {
    ptBR: "Vincule Navimon ao DoGatchmon e resolva o ataque dele primeiro. O efeito da Tamer Haru Shinkai deve resolver antes da checagem de segurança.",
    en: "Link Navimon to DoGatchmon and resolve its attack first. Tamer Haru Shinkai's effect must resolve before the security check.",
  },
  "arena-bt8-digimon-emperor-breeding-memory": {
    ptBR: "Você tem 1 de memória. Mova o Hyokomon nível 3 da criação: o Digimon Emperor do bot ganha 2 de memória e o medidor vira para o lado dele. O turno deve terminar na fase de criação — sem Main Phase, e Ai & Mako não deve ganhar memória.",
    en: "You start with 1 memory. Move the level 3 Hyokomon out of breeding: the bot's Digimon Emperor gains 2 memory and the gauge flips to its side. The turn must end with the breeding phase — no Main Phase, and Ai & Mako must not gain memory.",
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
  "arena-ex13-kentaurosmon-each-player-security": {
    ptBR: "O bot ataca com ST1-10. Ative o Counter do EX13-036 Kentaurosmon e coloque ele mesmo na segurança. O atacante do bot também deve ir para o topo da segurança do bot, e o ataque termina sem checar segurança.",
    en: "The bot attacks with ST1-10. Activate EX13-036 Kentaurosmon's Counter and place Kentaurosmon itself as security. The bot's attacker must also go on top of the bot's security, and the attack ends without a security check.",
  },
  "arena-ex13-kentaurosmon-two-counters": {
    ptBR: "Você tem dois EX13-036 Kentaurosmon e o bot ataca com ST1-10. Toque no Kentaurosmon que vai usar o Counter e depois confirme em Ativar.",
    en: "You have two EX13-036 Kentaurosmon and the bot attacks with ST1-10. Tap the Kentaurosmon whose Counter you want, then confirm with Activate.",
  },
  "arena-ex13-deletion-trigger-ordering": {
    ptBR: "Use Heat Viper, delete seu EX13-028 Sukamon e escolha a ordem entre o efeito On Deletion dele e a herança do KingSukamon sob KingEtemon.",
    en: "Use Heat Viper, delete your EX13-028 Sukamon, and choose the order between its On Deletion effect and KingSukamon inherited under KingEtemon.",
  },
  "arena-gate-deadly-sins-effect-order": {
    ptBR: "O bot joga o primeiro turno. No seu turno, pule a fase de criação. Gate of Deadly Sins deleta seus 4 Digimon no início da fase principal. Clique nos 4 efeitos On Deletion na ordem desejada, use Sim/Não por efeito ou Sim para todos e resolva tudo em um único prompt.",
    en: "The bot plays the first turn. On your turn, skip the breeding phase. Gate of Deadly Sins deletes your 4 Digimon at the start of your main phase. Click the 4 On Deletion effects in the order you want, set Yes/No per effect or Yes to all, and resolve them all from one prompt.",
  },
  "arena-rika-optional-effect-presets": {
    ptBR: "Pule a criação e ataque a segurança com Sakuyamon. Ordene Rika primeiro e Sakuyamon depois. Marque Sim na Rika ou Sim para todos: a confirmação de ativação não deve reaparecer, mas você ainda escolhe o Plug-In da mão. Reinicie e teste Não: Rika não suspende nem usa o Plug-In. Com Perguntar, a confirmação deve aparecer uma vez.",
    en: "Skip breeding and attack security with Sakuyamon. Order Rika first and Sakuyamon second. Set Rika to Yes or use Yes to all: the activation confirmation must not appear again, but you still choose the Plug-In from hand. Reset and try No: Rika neither suspends nor uses the Plug-In. With Ask, the confirmation should appear once.",
  },
  "arena-davis-optional-effect-presets": {
    ptBR: "Pule a criação. Ataque a segurança com Aquilamon e depois evolua-o em Silphymon da mão. Ordene os dois Davis & Ken antes do efeito de evolução. Teste Sim para todos, Não para todos e Não no primeiro / Sim no segundo: só os Tamers aceitos suspendem; Silphymon fica ativo se algum aceitar. Reinicie para testar Perguntar.",
    en: "Skip breeding. Attack security with Aquilamon, then digivolve it into Silphymon from hand. Order both Davis & Ken before the evolution effect. Try Yes to all, No to all, and No on the first / Yes on the second: only accepted Tamers suspend; Silphymon unsuspends if either accepts. Reset to test Ask.",
  },
  "arena-ukkomon-optional-effect-presets": {
    ptBR: "Mova o Digimon da criação para abrir os dois Ukkomon. Ordene ambos e teste Não no primeiro / Sim no segundo. Os dois ainda revelam cartas e adicionam uma à mão; só a eclosão é opcional. Não para todos impede a eclosão. Sim para todos não repete a confirmação. Reinicie para testar Perguntar.",
    en: "Move the Digimon out of breeding to trigger both Ukkomon. Order both and try No on the first / Yes on the second. Both still reveal cards and add one to hand; only hatching is optional. No to all prevents hatching. Yes to all skips repeated confirmations. Reset to test Ask.",
  },
  "arena-drasil-optional-effect-presets": {
    ptBR: "Pule a criação e jogue Dracmon BT23-062. Ordene os dois King Drasil e teste Não no primeiro / Sim no segundo. Só o segundo suspende, e Dracmon ganha Rush, Raid, Reboot e Blocker. Reinicie para testar Sim para todos, Não para todos e Perguntar.",
    en: "Skip breeding and play Dracmon BT23-062. Order both King Drasil and try No on the first / Yes on the second. Only the second suspends, and Dracmon gains Rush, Raid, Reboot, and Blocker. Reset to test Yes to all, No to all, and Ask.",
  },
  "arena-matt-repeated-effect-presets": {
    ptBR: "Pule a criação, evolua Devimon em LadyDevimon e descarte 2 cartas. O descarte é simultâneo: Matt deve perguntar uma única vez, sem painel de ordenação duplicado. Aceite para suspender Matt e ganhar 1 memória (de 7 para 8). Reinicie e recuse: Matt continua ativo, a memória fica em 7 e a pergunta não reaparece.",
    en: "Skip breeding, digivolve Devimon into LadyDevimon, and trash 2 cards. The discard is simultaneous: Matt must ask only once, with no duplicate ordering panel. Accept to suspend Matt and gain 1 memory (from 7 to 8). Reset and decline: Matt stays unsuspended, memory stays at 7, and the question does not repeat.",
  },
  "arena-ex13-kingsukamon-immunity-lapse": {
    ptBR: "Jogue KingSukamon, descarte Chuumon e transforme o Digimon adversário. A aura de KingEtemon deve deletá-lo com 0 DP; então aceite a herança para revelar 3 e jogar Chuumon.",
    en: "Play KingSukamon, trash Chuumon, and rewrite the opposing Digimon. KingEtemon's aura should delete it at 0 DP; then accept the inherited effect to reveal 3 and play Chuumon.",
  },
  "arena-bt16-phoenixmon-x-antibody-name": {
    ptBR: "Você tem 2 Phoenixmon (X Antibody). Ataque um dos 3 Digimon adversários suspensos com o que tem só WarGrowlmon (X Antibody) embaixo: o On Deletion NÃO deve ganhar End of Attack, e nada mais é deletado. Depois ataque com o que tem a Opção X Antibody (BT9-109) embaixo: no End of Attack, o On Deletion herdado de Garudamon deve deletar outro Digimon adversário.",
    en: "You have 2 Phoenixmon (X Antibody). Attack one of the 3 suspended opposing Digimon with the one that has only WarGrowlmon (X Antibody) under it: its On Deletion effects must NOT gain End of Attack, and nothing else is deleted. Then attack with the one that has the X Antibody Option (BT9-109) under it: at End of Attack, Garudamon's inherited On Deletion must delete another opposing Digimon.",
  },
  "arena-ex13-kings-opponent-sukamon": {
    ptBR: "Os 2 KingSukamon adversários completam o requisito de 3 nomes: ambos devem estar com 3000 DP. Ataque o suspenso com KingEtemon; a herança deve revelar 3 cartas.",
    en: "The opponent's 2 KingSukamon complete the 3-name threshold: both should have 3000 DP. Attack the suspended one with KingEtemon; the inherited effect should reveal 3 cards.",
  },
  "arena-ex10-god-grade-raising-color": {
    ptBR: "Copipemon é o único Appmon e está na criação. Compare Cyber Engage com God Grade Unleashed na mão.",
    en: "Copipemon is the only Appmon and is in breeding. Compare Cyber Engage with God Grade Unleashed in hand.",
  },
  "arena-ex10-malomyotismon-trash-main": {
    ptBR: "Encerre a criação, abra o visualizador do lixo e ative o efeito [Main] de MaloMyotismon deletando Arukenimon e Mummymon. A carta no lixo deve ser oferecida com memória 1 e entrar por 3.",
    en: "End breeding, open the trash viewer, and activate MaloMyotismon's [Main] effect by deleting Arukenimon and Mummymon. The trash card must be offered at memory 1 and play for 3.",
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
  ["arena-bt11-rina-ulforce-immunity", "BT11 Rina · Ulforce return vs Digimon immunity"],
  ["arena-ex3-wingdramon-evade-suspend-lock", "EX3 Wingdramon · Evade cannot pay suspend"],
  ["arena-ex13-wingdramon-evade-suspend-lock", "EX13 Wingdramon · Evade cannot pay suspend"],
  ["arena-bt20-grademon-redirect", "BT20 Grademon · inherited redirect"],
  ["arena-bt20-bakemon-violet-retroactive", "BT20 Bakemon · new Violet must not see old evolution"],
  ["arena-bt23-bakemon-no-target", "BT23 Bakemon · effect play with no deletion target"],
  ["arena-bt20-invisimon-empty-stack", "BT20 Invisimon · no digivolution cards stays in play"],
  ["arena-bt20-takemikazuchi-turn-continue", "BT20 Takemikazuchi · turn continues at 2 memory"],
  ["arena-bt16-phoenixmon-x-antibody-name", "BT16 Phoenixmon X · [X Antibody] name gate"],
  ["arena-bt21-davis-top-stack", "BT21 Davis · top stacked card regression"],
  ["arena-bt21-dracomon-start-main", "BT21 Dracomon X + BT20 Dracomon · start-main order"],
  ["arena-bt21-dogatchmon-link-attack", "BT21 DoGatchmon · link attack waits for pending effects"],
  ["arena-bt26-chronomon-dm-succession", "BT26 Chronomon DM · Succession When Digivolving"],
  ["arena-bt8-digimon-emperor-breeding-memory", "BT8 Digimon Emperor · breeding memory ends turn"],
  ["arena-face-up-security", "Security · opponent face-up cards"],
  ["arena-ex13-grademon-immunity", "EX13 Alphamon · Assembly from trash"],
  ["arena-ex7-seventh-fascination-turn", "EX7 Seventh Fascination · opponent turn end"],
  ["arena-p240-arcturusmon-vb-routes", "P-240 Arcturusmon · [VB] digivolve and Assembly"],
  ["arena-ex12-proximamon-dual-siriusmon", "EX12 Proximamon · use DUAL Siriusmon from sources"],
  ["arena-ex12-virus-busters-effect-attack", "EX12 Virus Busters · ordered with an effect-driven attack"],
  ["arena-ex7-seventh-fascination-trash-turn", "EX7 Seventh Fascination · trash activation"],
  ["arena-bt22-rie-kishibe-delete-without-digivolve", "BT22 Rie Kishibe · delete without a legal LordKnightmon"],
  ["arena-ex13-gotsumon-blocker-search", "EX13 Gotsumon · printed Blocker search"],
  ["arena-rainbow-evo-cost", "EX13 Merciful Mode / EX12 Susanoomon · any-color Lv.6 digivolve"],
  ["arena-mightyaxe-mode-digixros", "BT10 Mighty Axe Mode · DigiXros name alias"],
  ["arena-hand-reconnect-sync", "Reconnect · card drawn offline reaches the hand"],
  ["arena-ex13-giromon-block-triggers", "EX13 Giromon · 6 block triggers"],
  ["arena-ex13-kentaurosmon-each-player-security", "EX13 Kentaurosmon · Counter places both"],
  ["arena-ex13-kentaurosmon-two-counters", "EX13 Kentaurosmon · two Counters on the field"],
  ["arena-ex13-deletion-trigger-ordering", "EX13 Kings · deletion trigger ordering"],
  ["arena-gate-deadly-sins-effect-order", "EX6 Gate of Deadly Sins · effect resolution plan"],
  ["arena-rika-optional-effect-presets", "Optional effects · 1/5 Rika"],
  ["arena-davis-optional-effect-presets", "Optional effects · 2/5 Davis & Ken"],
  ["arena-ukkomon-optional-effect-presets", "Optional effects · 3/5 Ukkomon"],
  ["arena-drasil-optional-effect-presets", "Optional effects · 4/5 King Drasil"],
  ["arena-matt-repeated-effect-presets", "Optional effects · 5/5 Matt simultaneous discard"],
  ["arena-ex13-kings-opponent-sukamon", "EX13 Kings · opponent Sukamon"],
  ["arena-ex13-kingsukamon-immunity-lapse", "EX13 KingSukamon · 0 DP deletion"],
  ["arena-ex13-examon", "EX13 Examon · Lv.5 DNA + battle timing"],
  ["arena-ex13-examon-battle-win-timing", "EX13 Examon · win-battle trigger order"],
  ["arena-ex13-chirinmon-cost-choice", "EX13 Chirinmon · either-or cost choice"],
  ["arena-sukamon-transform-digivolve", "EX13 KingSukamon · white Sukamon can't take green digivolve"],
  ["arena-sukamon-transform-digivolve-viewer", "Sukamon rewrite · your Blossomon refused"],
  ["arena-p097-zubamon-reveal-order", "P-097 Zubamon · reveal before top/bottom"],
  ["arena-p246-motimon-kingetemon", "P-246 Motimon · Lv.6 KingEtemon can't become MetalEtemon"],
  ["arena-p246-motimon-after-de-digivolve", "P-246 Motimon · after De-Digivolve, MetalEtemon is legal"],
  ["arena-de-digivolve-visibility", "BT25-025 · visible De-Digivolve on KingEtemon"],
  ["arena-st24-dna-charge-start-of-main", "ST24 DNA Charge · placed Option start of main"],
  ["arena-ex5-attack-priority", "EX5 Etemon · attack trigger priority"],
  ["arena-ex5-biting-crush-delay", "EX5 Biting Crush · Delay on effect play"],
  ["arena-p108-training-delay-no-target", "P-108 Wisdom Training · Delay with no target"],
  ["arena-bt13-royal-purge-delay-rush", "BT13 Royal Knights of the Purge · Delay Rush"],
  ["arena-p206-digital-gate-breeding-color", "P-206 Digital Gate Open · breeding-area colour"],
  ["arena-ex13-merciful-mode-attack-order", "EX13 Merciful Mode · match f9505ba7 attack order"],
  ["arena-ex10-god-grade-raising-color", "EX10 God Grade · raising-area colour"],
  ["arena-ex10-malomyotismon-trash-main", "EX10 MaloMyotismon · [Trash] [Main] activation"],
  ["arena-ex11-ryutaro-suspended", "EX11 Ryutaro · suspended activation"],
  ["arena-issue-4888-app-fusion", "#4888 · co-linked App Fusion"],
  ["arena-issue-4889-weregarurumon-dna", "#4889 · WereGarurumon DNA"],
  ["arena-paildramon-dna-inheritance", "Paildramon · DNA inheritance"],
  ["arena-bt24-silphymon-dna", "BT24 Silphymon · yellow + green DNA"],
  ["arena-issue-4890-reina-deletion", "#4890 · Reina deletion trigger"],
  ["arena-issue-4891-seiten-on-play", "#4891 · SeitenGokuumon On Play"],
  ["arena-issue-4892-effect-digixros", "#4892 · effect DigiXros"],
  ["arena-moon-pending-source-deleted", "MoonMillenniummon · pending source deleted"],
  ["arena-mirage-hidden-hand", "Mirage BM · concealed hand selection"],
  ["arena-vikemon-live-source-lock", "Vikemon ACE · live source-count lock"],
  ["arena-kotone-digixros-pending-attack", "Kotone · DigiXros + EX6 pending attack"],
  ["arena-bt6-beelstarmon-duplicate-cost", "BT6 BeelStarmon · duplicate hand cost"],
  ["arena-bt13-king-drasil-source-count", "BT13 King Drasil · source count after an earlier play"],
  ["arena-hellscythe-onplay-priority", "Flame Hellscythe · MagnaAngemon priority"],
  ["arena-rizegreymon-derived-priority", "RizeGreymon X · derived effect priority"],
  ["arena-trident-derived-priority", "Trident Revolver · deletion and On Play"],
  ["arena-flashy-attack-priority", "Flashy Boss Punch · attack interruption"],
  ["arena-dominimon-security-priority", "Dominimon · security removal priority"],
  ["arena-piedmon-declined-opt", "Piedmon · declined OPT retriggers"],
  ["arena-issue-4893-seiten-evo-cost", "#4893 · SeitenGokuumon evo cost"],
  ["arena-issue-4894-jesmon-token-limit", "#4894 · Jesmon token limit"],
  ["arena-jesmon-scramble-dp-blocked", "Jesmon · Red Scramble vs 5000 DP (blocked)"],
  ["arena-jesmon-scramble-dp-allowed", "Jesmon · Red Scramble vs 10000 DP (allowed)"],
  ["arena-junomon-opponent-target", "Junomon · opponent target"],
  ["arena-jupitermon-siren", "Jupitermon · Sirenmon + Dan & Kanan"],
  ["arena-security-effect-pacing", "Security effects · pacing"],
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
  ["counter-blast-dna", "Counter · Blast DNA on a full board"],
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
      <header className="aegis-arena-demo-toolbar aegis-arena-live-toolbar">
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
        <a className="aegis-arena-demo-back" href="/dev/arena?mode=visual">
          {portuguese ? "Prévia visual" : "Visual preview"}
        </a>
        <details className="aegis-arena-live-instructions" open>
          <summary>{portuguese ? "Instruções do cenário" : "Scenario instructions"}</summary>
          <p tabIndex={0}>{portuguese ? note.ptBR : note.en}</p>
        </details>
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
