import { useMemo, useState } from "react";
import { CATALOG_DECKS } from "@aegis/shared";
import { colorKey } from "../design/theme";
import { SEQUENTIAL_PACING_ENABLED } from "../features";
import { GameScreen } from "../game/GameScreen";
import { loadIdentity } from "../identity";
import { useTranslation } from "../i18n";
import type { AegisJoinOptions } from "../net/types";
import "./arenaDemo.css";

type DevScenario = NonNullable<AegisJoinOptions["devScenario"]>;
export type ScenarioCopy = { en: string; ptBR: string };

const DEFAULT_NOTE: ScenarioCopy = {
  ptBR: "Termine a criação, selecione um Digimon, ataque e clique na segurança do oponente.",
  en: "End breeding, select a Digimon, choose Attack and click the opponent's security.",
};

export const SCENARIO_NOTES: Partial<Record<DevScenario, ScenarioCopy>> = {
  "arena-github5326-sistermon-zero-security": {
    en: "GitHub #5326, current behavior control. You start with 0 security and 6 memory. End breeding, then play either BT23 Sistermon Blanc for 3. Its mandatory On Play recovers 1 from the deck even though no security card could be added to hand; security becomes 1 and memory becomes 3. Play the second Blanc for 3: the previous security card goes to hand, then the next deck card becomes your face-down security. Security stays 1 and memory becomes 0. No payment or optional confirmation is required for either On Play effect.",
    ptBR: "GitHub #5326, controle do comportamento atual. Você começa com 0 segurança e 6 de memória. Encerre a criação e jogue qualquer Sistermon Blanc BT23 por 3. O Ao Jogar obrigatório recupera 1 do deck mesmo sem segurança para adicionar à mão; a segurança passa a 1 e a memória a 3. Jogue a segunda Blanc por 3: a segurança anterior vai para a mão e a próxima carta do deck vira sua segurança virada para baixo. A segurança continua em 1 e a memória passa a 0. Nenhum pagamento ou confirmação opcional é necessário para os efeitos Ao Jogar.",
  },
  "arena-github5331-offense-hand": {
    en: "End breeding. Activate the established Offense Training Delay, accept, and choose either of your two Tyrannomon copies. Opposing BetelGammamon must never be offered or consumed. Reset to first use Offense Training from hand, finish its search, then activate the established Delay: choose an own legal red card afresh. Blue Gorillamon and level-5 MetalGreymon are ineligible; the newly placed Training cannot Delay this turn.",
    ptBR: "Encerre a criação. Ative o Delay do Offense Training já em campo, aceite e escolha uma das suas duas cópias de Tyrannomon. BetelGammamon do oponente nunca deve aparecer como opção nem ser usado. Reinicie para primeiro usar Offense Training da mão, concluir a busca e então ativar o Delay já estabelecido: escolha novamente uma carta vermelha válida sua. Gorillamon azul e MetalGreymon nível 5 são inválidos; o Training recém-colocado não pode usar Delay neste turno.",
  },
  "arena-github5332-kekkomon-cost": {
    en: "GitHub #5332, current behavior control; the reported phone stall remains unconfirmed. End breeding and decline ST23-13's deck placement. First attack security with Liollmon. Accept its Kekkomon inherited, select ST23-13 to pay, then DECLINE evolution. Accept ST23-13's suspension/DP offer and give Liollmon +3000 DP. Accept BT25-090's suspension/place-under offer. The helper attack completes and both Tamers are suspended with face-down sources remaining. Now attack security with the fresh Gekkomon and accept its Kekkomon inherited. Select either suspended Tamer on the field and confirm targets: this pays its bottom face-down card, not a hand evolution card. Accept the separate evolution offer, select a hand Armalizamon and end selection. Gekkomon evolves for zero memory, checks one security and finishes the attack. Reset to compare the other Tamer. Observe normal effect presentation; this reduced setup is not the complete historical match.",
    ptBR: "GitHub #5332, controle atual; o travamento relatado no celular ainda não foi confirmado. Encerre a criação e recuse colocar carta sob ST23-13. Primeiro ataque a segurança com Liollmon. Aceite a herdada de Kekkomon, selecione ST23-13 para pagar e RECUSE evoluir. Aceite suspender ST23-13 e dê +3000 DP a Liollmon. Aceite suspender BT25-090 e colocar cartas sob ele. O ataque auxiliar termina e ambos os Tamers ficam suspensos com fontes viradas para baixo restantes. Agora ataque a segurança com Gekkomon e aceite a herdada de Kekkomon. Selecione um Tamer suspenso no campo e confirme os alvos: isso paga a carta inferior dele, não uma evolução da mão. Aceite a oferta separada de evolução, selecione Armalizamon da mão e encerre a seleção. Gekkomon evolui por zero memória, verifica uma segurança e termina o ataque. Reinicie para comparar o outro Tamer. Observe a apresentação normal; este cenário reduzido não é a partida histórica completa.",
  },
  "arena-github-5324-omnimon-traits": {
    en: "End breeding. Open the field details for Omnimon (X Antibody): all four types must appear — Holy Warrior, X Antibody, Royal Knight and LIBERATOR. Compare regular Omnimon: Holy Warrior and Royal Knight only. Play Cool Boy for 2 and select the revealed Omnimon (X Antibody); regular Omnimon and Agumon cannot be selected. Then evolve regular Omnimon into the copy of Omnimon (X Antibody) already in hand for 2. Choose the evolved Digimon as your survivor for the deletion effect; the other field Omnimon X is deleted. Accept Cool Boy's suspension to gain 1 memory and draw 1. Open the evolved Digimon's details and check all four types again.",
    ptBR: "Encerre a criação. Abra os detalhes de Omnimon (X Antibody) em campo: os quatro tipos devem aparecer — Holy Warrior, X Antibody, Royal Knight e LIBERATOR. Compare Omnimon normal: apenas Holy Warrior e Royal Knight. Jogue Cool Boy por 2 e selecione Omnimon (X Antibody) revelado; Omnimon normal e Agumon não podem ser selecionados. Depois evolua Omnimon normal na cópia de Omnimon (X Antibody) que já estava na mão por 2. Escolha o Digimon evoluído como sobrevivente do efeito de deleção; o outro Omnimon X em campo é deletado. Aceite virar Cool Boy para ganhar 1 memória e comprar 1 carta. Abra os detalhes do Digimon evoluído e confira os quatro tipos novamente.",
  },
  "arena-github5333-tesla-source-replay": {
    en: "#5333: End breeding. Activate TeslaJellymon Main, choose Use an Option and EX8-068. Its Main is now spent. Evolve that Tesla into EX8-024, then BT20-026 using its cost-0 alternate route, then EX8-027. Accept Plesiomon's source play and choose the original Tesla. Open the newly played Tesla: Main must be available again. Use the remaining EX8-068; a third Main activation on that new Digimon must be unavailable.",
    ptBR: "#5333: Encerre a criação. Ative Main de TeslaJellymon, escolha usar uma Opção e EX8-068. O Main fica gasto. Evolua essa Tesla em EX8-024, depois BT20-026 pela rota alternativa de custo 0 e EX8-027. Aceite jogar uma fonte de Plesiomon e escolha a Tesla original. Abra a Tesla recém-jogada: Main deve estar disponível novamente. Use o EX8-068 restante; uma terceira ativação de Main nesse novo Digimon deve ficar indisponível.",
  },
  "arena-turn-end-dp-expiry": {
    en: "Skip breeding. Evolve Kokatorimon into EX13 WarGrowlmon for 3 (4→1 memory): with no opposing Digimon to delete, it reaches 11000 DP for the turn. Use Wall Training for 2 and select either revealed Monodramon. Decline Engage at end of turn. WarGrowlmon returns to 8000 DP; opposing Davis sets memory to 3. Active, Draw and Breeding must proceed in order without an idle stall. Use normal sequential effects without skipping. This diagnoses a turn-end DP presentation cycle, not a confirmed replay of the Freezing reporter's match.",
    ptBR: "Pule a criação. Evolua Kokatorimon em WarGrowlmon EX13 por 3 (memória 4→1): sem Digimon adversário para deletar, ele fica com 11000 DP neste turno. Use Wall Training por 2 e escolha qualquer Monodramon revelado. Recuse Engage no fim do turno. WarGrowlmon volta a 8000 DP; Davis adversário ajusta a memória para 3. Ativa, Compra e Criação devem avançar em ordem, sem pausa travada. Use efeitos sequenciais normais, sem pular animações. Este cenário diagnostica um ciclo na apresentação da expiração de DP, não reproduz uma partida confirmada do autor de Freezing.",
  },
  "arena-github5307-larva-bt18-breeding": {
    en: "GitHub #5307, current behavior control. End breeding without moving Larva. Attack the suspended opposing Satan Mode with your BT18 Satan Mode. Both have 16000 DP. Accept Larva's prevention: Larva moves from breeding, your Satan Mode stays, and the opposing Satan Mode is deleted. Reset and decline to compare: your Satan Mode is deleted and Larva stays in breeding.",
    ptBR: "GitHub #5307, controle do comportamento atual. Encerre a criação sem mover Larva. Ataque o Satan Mode adversário suspenso com seu Satan Mode BT18. Ambos têm 16000 DP. Aceite a proteção de Larva: ela sai da criação, seu Satan Mode fica e o adversário é deletado. Reinicie e recuse para comparar: seu Satan Mode é deletado e Larva fica na criação.",
  },
  "arena-github5307-larva-ex10-breeding": {
    en: "GitHub #5307, EX10 current behavior control. End breeding without moving Larva. Attack the suspended opposing Satan Mode with EX10 Satan Mode. The opponent must decline deleting its Digimon for EX10's When Attacking effect; its top security is trashed and your Satan Mode unsuspends. At the equal-DP battle, accept Larva's prevention: Larva moves from breeding, your Satan Mode stays, and the opponent is deleted. Reset and decline Larva to compare.",
    ptBR: "GitHub #5307, controle atual do EX10. Encerre a criação sem mover Larva. Ataque o Satan Mode adversário suspenso com Satan Mode EX10. O oponente deve recusar deletar seu Digimon pelo Quando Ataca do EX10; o topo da segurança dele é descartado e seu Satan Mode desvira. Na batalha de DP igual, aceite Larva: ela sai da criação, seu Satan Mode fica e o adversário é deletado. Reinicie e recuse Larva para comparar.",
  },
  "arena-github5308-greymon-security-destination": {
    en: "GitHub #5308. End breeding. Use Chaos Degradation on opposing BT1 Greymon and choose the bottom of security: BT11 Greymon X cannot prevent this move. Greymon goes to security, its sources go to trash, and X Antibody is not bottom-decked. Reset for the legal control: use Cocytus Breath instead; the opponent may bottom-deck X Antibody to keep Greymon. Then Gaia Force deletes it because that payment is no longer available.",
    ptBR: "GitHub #5308. Encerre a criação. Use Chaos Degradation no Greymon BT1 adversário e escolha o fundo da segurança: Greymon X BT11 não pode impedir esse movimento. Greymon vai para a segurança, suas fontes vão para o lixo e X Antibody não volta ao fundo do deck. Reinicie para o controle legal: use Cocytus Breath; o oponente pode devolver X Antibody ao fundo do deck para manter Greymon. Depois Gaia Force o deleta, pois esse pagamento não está mais disponível.",
  },
  "arena-bt21-satellamon-cost-control": {
    en: "Freezing report: candidate-match control, not a confirmed reproducer. End breeding, then play one hand Satellamon for 7 (memory 10 to 3). Accept its optional On Play effect. Its cost panel shows 13 hand/trash cards, with 9 eligible Appmon/Three Musketeers cards. Choose the other Satellamon from hand and confirm; choose Monodramon as the receiving Digimon. That copy becomes Monodramon's bottom source, while the played Satellamon stays on the field. The choice closes, and Monodramon gains return/De-Digivolve protection until the opponent's turn ends. You can attack with Monodramon or end the phase. Reload the arena to repeat with an EX7-071 from trash or decline the optional effect; declining leaves every cost card in place. Observe normal effect presentation without skipping; report the exact action, duration and connection status if it stops progressing.",
    ptBR: "Relato de travamento: controle da partida candidata, sem reprodução confirmada. Encerre a criação e jogue um Satellamon da mão por 7 (memória de 10 para 3). Aceite o efeito opcional On Play. O painel de custo mostra 13 cartas da mão/lixo, com 9 Appmon/Three Musketeers elegíveis. Escolha o outro Satellamon da mão e confirme; escolha Monodramon para receber a carta. Essa cópia vira a fonte inferior de Monodramon; o Satellamon jogado continua em campo. A escolha fecha e Monodramon recebe proteção contra retorno/De-Digivolve até o fim do turno adversário. Você pode atacar com Monodramon ou encerrar a fase. Reinicie a arena para repetir com EX7-071 do lixo ou recusar o efeito opcional; recusar mantém as cartas de custo em seus lugares. Observe a apresentação normal sem pular; se parar, registre ação exata, duração e estado da conexão.",
  },
  "arena-github5319-bt25-murasamemon-security-option": {
    en: "GitHub #5319, separately reproduced same-name BT25-041 defect. End breeding. Evolve Cougarmon into BT25-041 Murasamemon for 3 (memory 10 to 7). Accept its When Digivolving effect with top-security payment: e-Pulse must move from security into hand, then be selectable for use with cost reduced by 3 to 0. Choose e-Pulse and play Liollmon from trash for free. Both cards remain in the battle area, security becomes empty, and memory stays 7. BT25-041 has this security payment; ST23-04 instead requires a face-down Tamer card. The original anonymous report's card attribution is unconfirmed.",
    ptBR: "GitHub #5319, defeito separado reproduzido no BT25-041 de mesmo nome. Encerre a criação. Evolua Cougarmon em Murasamemon BT25-041 por 3 (memória de 10 para 7). Aceite Quando Digievolui pagando com o topo da segurança: e-Pulse deve sair da segurança para a mão e ficar disponível para usar com redução de 3, custo final 0. Escolha e-Pulse e jogue Liollmon do lixo grátis. Ambas as cartas ficam na área de batalha, a segurança fica vazia e a memória permanece 7. BT25-041 tem esse pagamento com segurança; ST23-04 exige uma carta virada para baixo sob um Tamer. A identificação da carta no relato anônimo original não foi confirmada.",
  },
  "arena-github5319-murasamemon-e-pulse": {
    en: "GitHub #5319, current behavior control. End breeding and accept Tomoro & Kyo's deck placement: memory reaches 10 and two face-down cards are under the Tamer. Evolve Liollmon into Cougarmon for 1; its effect adds e-Pulse from security to hand and recovers 1. Evolve Cougarmon into Murasamemon, accepting the under-Tamer reduction (cost 1). Accept Murasamemon's effect and choose Use a Glowing Dawn Option, then e-Pulse: trash the remaining face-down card and use it for 0. Play Liollmon from trash for free; e-Pulse remains in the battle area. Memory ends at 8. MetalGreymon loses 5000 DP. Compare the spent-cost scenario.",
    ptBR: "GitHub #5319, controle do comportamento atual. Encerre a criação e aceite colocar o topo do deck sob Tomoro & Kyo: a memória chega a 10 e o Tamer tem duas cartas viradas para baixo. Evolua Liollmon em Cougarmon por 1; o efeito adiciona e-Pulse da segurança à mão e recupera 1. Evolua Cougarmon em Murasamemon, aceitando a redução por descartar sob o Tamer (custo 1). Aceite o efeito de Murasamemon, escolha Usar uma Opção Glowing Dawn e depois e-Pulse: descarte a carta restante sob o Tamer e use por 0. Jogue Liollmon do lixo grátis; e-Pulse fica na área de batalha. A memória termina em 8. MetalGreymon perde 5000 DP. Compare o cenário de custo já gasto.",
  },
  "arena-github5319-murasamemon-spent-cost": {
    en: "GitHub #5319, printed-cost negative control. End breeding and accept Tomoro & Kyo's deck placement: memory reaches 10 and there is only one face-down card under the Tamer. Evolve Liollmon into Cougarmon for 1 to add e-Pulse from security and recover 1. Evolve Cougarmon into Murasamemon and accept the reduction to 1: this consumes the only under-Tamer card. Murasamemon still gives the opponent -5000 DP, but cannot use e-Pulse through its effect because its separate printed cost is unavailable. e-Pulse stays in hand, Liollmon stays in trash, memory ends at 8. Restart and decline Cougarmon's reduction to preserve the card for Murasamemon's effect instead.",
    ptBR: "GitHub #5319, controle negativo do custo impresso. Encerre a criação e aceite colocar o topo do deck sob Tomoro & Kyo: a memória chega a 10 e há só uma carta virada para baixo sob o Tamer. Evolua Liollmon em Cougarmon por 1 para adicionar e-Pulse da segurança e recuperar 1. Evolua Cougarmon em Murasamemon e aceite reduzir para 1: isso consome a única carta sob o Tamer. Murasamemon ainda dá -5000 DP ao adversário, mas não pode usar e-Pulse pelo efeito porque o custo impresso separado está indisponível. e-Pulse fica na mão, Liollmon no lixo, memória final 8. Reinicie e recuse a redução de Cougarmon para preservar a carta para o efeito de Murasamemon.",
  },
  "arena-github5311-imperialdramon-cost-scope": {
    en: "GitHub #5311 same-defect sweep. End breeding. First evolve one Paildramon into the hand BT3-111 Imperialdramon for 3 (printed 5 minus 2): memory goes from 8 to 5. Then evolve the remaining Paildramon into MetalGarurumon for its full printed 3: memory ends at 2. The Imperialdramon copies already in play must not discount this unrelated evolution, and they keep Piercing.",
    ptBR: "GitHub #5311, varredura do mesmo defeito. Encerre a criação. Primeiro evolua um Paildramon em Imperialdramon BT3-111 da mão por 3 (custo impresso 5 menos 2): a memória vai de 8 para 5. Depois evolua o outro Paildramon em MetalGarurumon pelo custo impresso completo 3: a memória termina em 2. As cópias de Imperialdramon já em campo não podem reduzir essa evolução diferente e mantêm Piercing.",
  },
  "arena-github5311-crescemon-cost-scope": {
    en: "GitHub #5311. End breeding. First evolve EX5-017 Lekismon into the hand Crescemon for 1: the separate Crescemon with three sources qualifies as support, and memory goes from 6 to 5. Then evolve that original Crescemon into BT1-044 MetalGarurumon for its full printed cost 3: memory ends at 2. Q3569 allows the discount into Crescemon, never from Crescemon.",
    ptBR: "GitHub #5311. Encerre a criação. Primeiro evolua Lekismon EX5-017 no Crescemon da mão por 1: o outro Crescemon com três fontes atende à condição, e a memória vai de 6 para 5. Depois evolua esse Crescemon original em MetalGarurumon BT1-044 pelo custo impresso completo 3: a memória termina em 2. A Q3569 permite reduzir ao evoluir em Crescemon, nunca a partir dele.",
  },
  "arena-github5322-metalmamemon-no-cost": {
    ptBR: "Encerre a criação. Jogue MetalMamemon EX9-018 ou evolua o Gorillamon para ele. A lixeira contém somente uma Opção: o custo exige uma carta de Digimon. Nenhuma carta é colocada por baixo, nenhuma evolução do oponente é descartada e nenhum Digimon volta ao fundo do deck, inclusive o Monodramon sem evoluções.",
    en: "End breeding. Play EX9-018 MetalMamemon or digivolve Gorillamon into it. Trash contains only an Option: the cost requires a Digimon card. No card is placed underneath, no opposing digivolution card is trashed, and no Digimon returns to the deck bottom, including the Monodramon with no digivolution cards.",
  },
  "arena-github5322-metalmamemon-paid": {
    ptBR: "Encerre a criação. Jogue MetalMamemon EX9-018 ou evolua o Gorillamon para ele. Aceite colocar o Patamon da lixeira por baixo, virado para baixo. O Greymon do oponente perde seu Agumon; depois escolha um dos Digimon sem evoluções para voltar ao fundo do deck. Reinicie e recuse o custo: o Patamon fica na lixeira e os dois Digimon do oponente permanecem intactos.",
    en: "End breeding. Play EX9-018 MetalMamemon or digivolve Gorillamon into it. Accept placing Patamon from trash face down underneath. The opposing Greymon loses its Agumon; then choose either Digimon with no digivolution cards to return to the deck bottom. Reset and decline the cost: Patamon stays in trash and both opposing Digimon stay intact.",
  },
  "arena-github5322-metalmamemon-strip-zero": {
    ptBR: "Encerre a criação. Jogue MetalMamemon EX9-018 ou evolua o Gorillamon para ele. Aceite colocar o Patamon da lixeira por baixo, virado para baixo. O Monodramon do oponente já está sem evoluções: nenhuma carta é descartada, mas ele deve voltar ao fundo do deck. O Tamer permanece em campo.",
    en: "End breeding. Play EX9-018 MetalMamemon or digivolve Gorillamon into it. Accept placing Patamon from trash face down underneath. The opposing Monodramon already has no digivolution cards: no card is trashed, but it must return to the deck bottom. The Tamer stays in play.",
  },
  "arena-github5318-junomon-printed-cost": {
    en: "GitHub #5318, current behavior control. End breeding. Evolve LadyDevimon into Junomon using the ordinary cost 4 (memory 10 to 6). Accept placing the opponent's Monodramon in security and trashing both top security cards. Accept Junomon's security-removal play and choose either Angemon from hand or trash for free; both Venusmon copies must be excluded from that choice. Venusmon's printed play cost is 12, even when its own play payment would be reduced to 7. Memory remains 6.",
    ptBR: "GitHub #5318, controle do comportamento atual. Encerre a criação. Evolua LadyDevimon em Junomon pelo custo normal 4 (memória de 10 para 6). Aceite colocar Monodramon adversário na segurança e descartar o topo das duas seguranças. Aceite jogar pelo efeito de Junomon e escolha Angemon da mão ou do lixo grátis; ambas as Venusmon devem ficar fora dessa escolha. O custo impresso de Venusmon é 12, mesmo quando o pagamento dela seria reduzido para 7. A memória permanece em 6.",
  },
  "arena-ex12-metalgreymon-forced-attack-play": {
    en: "Skip breeding and play EX12 MetalGreymon without Assembly. Agumon Expert is deleted. Choose the opposing BT1 MetalGreymon for the mandatory attack grant: its badge and Start of Your Main Phase clause appear immediately. End Main; after the opponent skips breeding, that Digimon must attack before normal Main actions. Its controller chooses a legal attack target. The grant expires at that opponent turn's end. Restart to compare the digivolve scenario. Discord 1557600224011096104.",
    ptBR: "Pule a criação e jogue MetalGreymon EX12 sem Assembly. Agumon Expert é deletado. Escolha MetalGreymon BT1 adversário para receber o ataque obrigatório: o indicador e o texto Início da sua Fase Principal aparecem imediatamente. Encerre a Principal; depois da criação adversária, esse Digimon deve atacar antes das ações normais da Principal. Seu controlador escolhe um alvo legal. O efeito expira no fim desse turno adversário. Reinicie para comparar o cenário de digievolução. Discord 1557600224011096104.",
  },
  "arena-ex12-metalgreymon-forced-attack-digivolve": {
    en: "Skip breeding and evolve EX12 Greymon into hand EX12 MetalGreymon for 3 using the alternate cost. The opposing Agumon Expert is deleted. Choose opposing BT1 MetalGreymon: its badge and granted Start of Your Main Phase clause appear. End Main; the recipient must attack at the opponent's Main start, with a mandatory legal-target choice by its controller. Breeding Digimon cannot receive the grant. It expires at the opponent's turn end. Discord 1557600224011096104.",
    ptBR: "Pule a criação e digievolua Greymon EX12 em MetalGreymon EX12 da mão pelo custo alternativo 3. Agumon Expert adversário é deletado. Escolha MetalGreymon BT1 adversário: o indicador e o texto concedido de Início da sua Fase Principal aparecem. Encerre a Principal; o alvo deve atacar no início da Principal adversária, com escolha obrigatória de alvo legal pelo controlador. Digimons na criação não podem receber o efeito. Ele expira no fim do turno adversário. Discord 1557600224011096104.",
  },
  "arena-github-5302-kunlun-security-check": {
    en: "Skip breeding and end Main. Accept Shishimamon's Execute attack against security. When security is removed, evolve into Kaguyamon for 1; decline the other optional plays. Kunlun must remain unsuspended and Sanmyojin Arrival stays in hand: this evolution is after the pre-counter end-of-turn window closed. An evolution before counter timing has a different ruling (Q7190).",
    ptBR: "Pule a criação e encerre a Principal. Aceite o ataque Execute do Shishimamon contra a segurança. Quando a segurança sair, evolua em Kaguyamon por 1; recuse as outras jogadas opcionais. Kunlun deve continuar desvirado e Sanmyojin Arrival fica na mão: essa evolução ocorre após fechar a janela de fim do turno anterior ao contra-ataque. Uma evolução antes do contra-ataque tem outra regra (Q7190).",
  },
  "arena-github-5305-gravity-order": {
    en: "Skip breeding: Dan and Kanan give you 4 memory. Use Gravity Crush for 0 to reach 6, then play Vulcanusmon for 7 (fewer Digimon than the opponent); decline linking. At -1, choose Gravity Crush's delayed loss before Dan and Kanan. At -3, suspend the Tamer and use Factorial Area for free, then play Marsmon for 4 (both printed reductions apply because Wrath Mode has 16000 DP). Decline battles and attacks. Factorial Area grants Blocker and the opponent starts at 7. Reset and choose Dan and Kanan first: Factorial Area is unavailable at -1 and remains in hand.",
    ptBR: "Pule a criação: Dan e Kanan deixam você com 4 memórias. Use Gravity Crush por 0 para chegar a 6 e jogue Vulcanusmon por 7 (menos Digimon que o adversário); recuse os links. Em -1, escolha a perda adiada de Gravity Crush antes de Dan e Kanan. Em -3, vire o Tamer e use Factorial Area de graça; jogue Marsmon por 4 (as duas reduções impressas se aplicam porque Wrath Mode tem 16000 DP). Recuse batalhas e ataques. Factorial Area concede Blocker e o adversário começa com 7. Reinicie e escolha Dan e Kanan primeiro: Factorial Area não está disponível em -1 e fica na mão.",
  },
  "arena-github-5315-homeros-unused": {
    en: "Skip breeding and end Main. Suspend Homeros to activate Wrath Mode's unused When Digivolving effect. Trash your top security and recover 2: security increases from 2 to 3. Junomon underneath does not prevent activation.",
    ptBR: "Pule a criação e encerre a Principal. Vire Homeros para ativar o Quando Digievolui ainda não usado de Wrath Mode. Descarte o topo da segurança e recupere 2: a segurança sobe de 2 para 3. Junomon nas fontes não impede a ativação.",
  },
  "arena-github-5315-homeros-spent": {
    en: "Skip breeding and evolve Junomon into Wrath Mode for 5, crossing from 4 to -1. Its mandatory recovery resolves once and security increases from 2 to 3. At end of turn Homeros cannot repeat that spent Once Per Turn effect (Q6029); security stays at 3. Compare the unused scenario.",
    ptBR: "Pule a criação e evolua Junomon em Wrath Mode por 5, passando de 4 para -1. A recuperação obrigatória resolve uma vez e a segurança sobe de 2 para 3. No fim do turno, Homeros não pode repetir esse efeito Uma Vez Por Turno já gasto (Q6029); a segurança continua em 3. Compare o cenário de efeito ainda não usado.",
  },
  "arena-github5313-inori-memory-four": {
    en: "End breeding: Inori gains 1 memory at the start of YOUR Main, from 4 to 5. Play Monodramon for 2: memory becomes 3, with no extra Inori gain. Attack security with P-194 Aegiomon, accept Barrier, then suspend Inori and choose hand Aegiochusmon. This free evolution and the extra security check leave memory at 3. Pass: Inori must not gain memory at the start of the opponent's Main. Reset to compare the 5-memory control.",
    ptBR: "Encerre a criação: Inori ganha 1 memória no início da SUA Principal, de 4 para 5. Jogue Monodramon por 2: a memória fica em 3, sem novo ganho de Inori. Ataque a segurança com Aegiomon P-194, aceite Barrier, suspenda Inori e escolha Aegiochusmon da mão. A evolução gratuita e a checagem extra mantêm a memória em 3. Passe: Inori não deve ganhar memória no início da Principal adversária. Reinicie para comparar o controle com 5 memórias.",
  },
  "arena-github5313-inori-memory-five": {
    en: "End breeding: starting at 5 memory, Inori gains nothing. Play Monodramon for 2: falling to 3 during Main does not retrigger Inori. Attack security with P-194 Aegiomon, accept Barrier and Inori's suspend cost, and choose Aegiochusmon from hand. Memory stays at 3 through the free evolution and extra security check. Pass: the opponent's Main does not activate Inori's memory effect. Compare the 4-memory arena for the positive control.",
    ptBR: "Encerre a criação: começando com 5 memórias, Inori não ganha nada. Jogue Monodramon por 2: cair para 3 durante a Principal não reativa Inori. Ataque a segurança com Aegiomon P-194, aceite Barrier e o custo de suspender Inori, e escolha Aegiochusmon da mão. A memória permanece em 3 durante a evolução gratuita e a checagem extra. Passe: a Principal adversária não ativa o efeito de memória de Inori. Compare com a arena de 4 memórias para o controle positivo.",
  },
  "arena-github5303-magnamon-printed-dp": {
    en: "End breeding and play Magnamon without Assembly for 7. Three distinct colors across both trashes give +3000 DP: Magnamon reaches 10000. Choose BT12-112 Shoutmon X7: Superior Mode: it falls from 17000 to 9000 (-4000 twice); Groundramon stays at 6000. Pass without attacking again: the modifiers remain through the opponent's turn and expire when that turn ends. Restart to compare the other target.",
    ptBR: "Encerre a criação e jogue Magnamon sem Assembly por 7. Três cores diferentes nos dois lixos dão +3000 DP: Magnamon chega a 10000. Escolha Shoutmon X7: Superior Mode BT12-112: ele cai de 17000 para 9000 (-4000 duas vezes); Groundramon permanece com 6000. Passe sem atacar novamente: os modificadores duram até o fim do turno adversário. Reinicie para comparar o outro alvo.",
  },
  "arena-github5320-alliance-after-evolution": {
    en: "GitHub #5320. Skip breeding, then evolve Hakubamon into Sanzomon for 3. Add your top security to hand, recover 1, and use Sanzomon to play Cho-Hakkaimon for 5; decline DigiXros. Resolve Cho-Hakkaimon before Mococomon, give Sanzomon Alliance, and attack the player. In the attack's effect order, resolve Mococomon before Alliance and evolve the attacker into Erlangmon for 1; accept its Kotenken Token. The pending Alliance must still work: suspend Cho-Hakkaimon for 19000 DP and two security checks. Memory ends at 1. Restart and choose Mococomon before Cho-Hakkaimon to compare, or decline Alliance for one check.",
    ptBR: "GitHub #5320. Pule a criação e evolua Hakubamon em Sanzomon por 3. Adicione o topo da segurança à mão, recupere 1 e use Sanzomon para jogar Cho-Hakkaimon por 5; recuse DigiXros. Resolva Cho-Hakkaimon antes de Mococomon, conceda Alliance a Sanzomon e ataque o jogador. Na ordem dos efeitos do ataque, resolva Mococomon antes de Alliance e evolua o atacante em Erlangmon por 1; aceite a Ficha Kotenken. Alliance pendente deve funcionar: vire Cho-Hakkaimon para atingir 19000 DP e dois testes de segurança. A memória termina em 1. Reinicie e escolha Mococomon antes de Cho-Hakkaimon para comparar, ou recuse Alliance para um teste.",
  },
  "arena-github-5297-omnimon-main-dna": {
    en: "Skip breeding. During Main, select EX13-016 Omnimon and WarGreymon. Choose DNA and select the MetalGarurumon with Gabumon underneath, then confirm. Pay 0: those two stacks merge into an unsuspended Omnimon and the other MetalGarurumon stays in play. Also try with action confirmations disabled. EX13-077 Merciful Mode has no DNA route; evolve it normally after Omnimon instead.",
    ptBR: "Pule a criação. Na Principal, selecione Omnimon EX13-016 e WarGreymon. Escolha DNA e selecione o MetalGarurumon com Gabumon nas fontes; confirme. Custo 0: as duas pilhas viram um Omnimon não suspenso e o outro MetalGarurumon continua em campo. Teste também com as confirmações de ação desativadas. Merciful Mode EX13-077 não tem rota de DNA; digievolua-o normalmente após Omnimon.",
  },
  "arena-github-5297-omnimon-agumon-dna": {
    en: "Skip breeding. Leave EX13-016 Omnimon in hand and end Main. Accept Agumon's inherited End of Your Turn effect and select MetalGarurumon and EX13-016. Both stacks merge into an unsuspended Omnimon for 0 before the opponent's turn. EX13-077 Merciful Mode cannot be chosen for DNA. Restart and perform the same DNA directly during Main to compare.",
    ptBR: "Pule a criação. Deixe Omnimon EX13-016 na mão e encerre a Principal. Aceite o efeito herdado de Agumon no fim do turno; selecione MetalGarurumon e EX13-016. As duas pilhas viram um Omnimon não suspenso por 0 antes do turno adversário. Merciful Mode EX13-077 não pode ser escolhido para DNA. Reinicie e faça o mesmo DNA diretamente na Principal para comparar.",
  },
  "arena-github-5286-lordknightmon-knightmon": {
    en: "End breeding and evolve BT5 Knightmon into LordKnightmon using its alternate cost. Choose Play: EX13-058 Knightmon must be selectable from both hand and trash. Play either copy without paying its cost, then decline the optional Rush/Collision attack. Reset to try the other zone.",
    ptBR: "Encerre a criação e evolua Knightmon BT5 em LordKnightmon pelo custo alternativo. Escolha Jogar: Knightmon EX13-058 deve estar disponível na mão e no lixo. Jogue uma das cópias sem custo e recuse o ataque opcional com Rush/Collision. Reinicie para testar a outra zona.",
  },
  "arena-github-5285-examon-battle-win": {
    en: "End breeding and attack the suspended Muchomon with Examon. Resolve or decline inherited unsuspend, then accept the battle-win effect and choose Wingdramon from hand or Examon’s digivolution cards, or hand Slayerdramon EX13-024 (the production selection). It enters without paying its cost. Reset to try the other zone.",
    ptBR: "Encerre a criação e ataque Muchomon suspenso com Examon. Resolva ou recuse o efeito herdado de desvirar; aceite o efeito de vencer batalha e escolha Wingdramon da mão ou das cartas de digivolução do Examon, ou Slayerdramon EX13-024 da mão (a escolha em produção). Ele entra sem custo. Reinicie para testar a outra zona.",
  },
  "arena-github-5284-regulusmon-shared-opt": {
    en: "End breeding and evolve GulusGammamon into Regulusmon. Accept its effect and trash one BT10-094 for the cost. Attack security with Regulusmon: the shared once-per-turn effect must not offer another discard, and the second BT10-094 remains in hand.",
    ptBR: "Encerre a criação e evolua GulusGammamon em Regulusmon. Aceite o efeito e descarte um BT10-094 como custo. Ataque a segurança com Regulusmon: o efeito compartilhado uma vez por turno não deve oferecer outro descarte, e o segundo BT10-094 fica na mão.",
  },
  "arena-github-5279-millenniummon-self-delete": {
    en: "End breeding and play P-220 Millenniummon without Assembly. Resolve De-Digivolve 2 on the opposing Groundramon, then accept deletion and choose your newly played Millenniummon itself. It goes to trash; its On Deletion replay cannot be paid with this board.",
    ptBR: "Encerre a criação e jogue Millenniummon P-220 sem Assembly. Resolva De-Digivolve 2 no Groundramon adversário; aceite a deleção e escolha o próprio Millenniummon recém-jogado. Ele vai ao lixo; esta mesa não permite pagar a reprodução do On Deletion.",
  },
  "arena-github-5267-omnimon-source-count": {
    en: "End breeding and play AD1 Omnimon without Assembly. The opposing Agumon has zero digivolution cards and returns to the deck bottom. Gallantmon has three sources and must not return; the separate Then clause deletes it to trash. Compare the two destinations.",
    ptBR: "Encerre a criação e jogue Omnimon AD1 sem Assembly. Agumon adversário não tem cartas de digivolução e volta ao fundo do deck. Gallantmon tem três fontes e não deve voltar; a cláusula Then separada o deleta para o lixo. Compare os destinos.",
  },

  "arena-github-5289-ulforce-rina": {
    en: "End breeding and attack security with Ulforce BT11-032 so it is suspended. Then evolve it into one hand Ulforce X for 1, choosing to unsuspend the Digimon. Accept EX13-069 Rina: she suspends and draws one, but the remaining hand Ulforce X must not be offered to evolve onto the field X. The first X remains the top card.",
    ptBR: "Encerre a criação e ataque a segurança com Ulforce BT11-032 para virá-lo. Depois evolua em um Ulforce X da mão por 1, escolhendo desvirar o Digimon. Aceite Rina EX13-069: ela vira e compra uma carta, mas o Ulforce X restante na mão não pode ser oferecido sobre o X do campo. O primeiro X permanece no topo.",
  },
  "arena-github-5289-ulforce-exact-base": {
    en: "End breeding and select hand UlforceVeedramon (X Antibody) BT12-029. The field X Antibody copy must not be an evolution target. Evolve the separate suspended UlforceVeedramon BT11-032 for 1: it unsuspends and memory becomes 9.",
    ptBR: "Encerre a criação e selecione UlforceVeedramon (X Antibody) BT12-029 na mão. A cópia X Antibody do campo não pode ser alvo de digivolução. Evolua o UlforceVeedramon BT11-032 suspenso separado por 1: ele desvira e a memória fica em 9.",
  },
  "arena-github-5274-siriusmon-vb-cost": {
    en: "End breeding and evolve WereGarurumon EX12-032 into Siriusmon EX12-018. The only legal cost is 3, leaving 7 memory. Decline placing cards under it. Planet Punch’s Option Use Req must not create a cost-4 Digimon route.",
    ptBR: "Encerre a criação e evolua WereGarurumon EX12-032 em Siriusmon EX12-018. O único custo legal é 3, deixando 7 memórias. Recuse colocar cartas sob ele. O Use Req da opção Planet Punch não cria uma rota de digivolução por 4.",
  },
  "arena-github-5273-two-ouryumon-dna": {
    en: "End breeding and select Alphamon: Ouryuken BT20-060 from hand. Choose DNA and select both physical BT20-018 Ouryumon stacks, then confirm the cost-0 route. Ordinary DNA accepts their black and red colors; Blast DNA instead requires Alphamon plus Ouryumon.",
    ptBR: "Encerre a criação e selecione Alphamon: Ouryuken BT20-060 na mão. Escolha DNA e selecione os dois Ouryumon BT20-018 no campo, depois confirme a rota de custo 0. A DNA normal aceita as cores preta e vermelha; Blast DNA exige Alphamon mais Ouryumon.",
  },
  "arena-github-5272-kyubimon-moving": {
    en: "Move Kyubimon ST22-03 from breeding to the battle area. Its mandatory search reveals three cards. Add Renamon ST22-02 to hand and return the other two to the deck bottom. No evolution is needed for When Moving.",
    ptBR: "Mova Kyubimon ST22-03 da criação para a área de batalha. Sua busca obrigatória revela três cartas. Adicione Renamon ST22-02 à mão e devolva as outras duas ao fundo do deck. When Moving não exige digivolução.",
  },
  "arena-github-5269-kyubimon-digivolving": {
    en: "End breeding and evolve the field Renamon into Kyubimon ST22-03 for 2. After the bonus draw, reveal three cards, add the revealed Renamon to hand and bottom-deck the other two. Effects do not activate for evolution inside breeding.",
    ptBR: "Encerre a criação e evolua Renamon do campo em Kyubimon ST22-03 por 2. Após comprar pela digivolução, revele três cartas, adicione o Renamon revelado à mão e devolva as outras duas ao fundo do deck. Efeitos não ativam na digivolução dentro da criação.",
  },
  "arena-github-5268-blue-card-chaos-mode": {
    en: "End breeding and use Blue Card. The revealed Lucemon: Chaos Mode EX10-052 cannot evolve onto the field Chaos Mode: its alternate route requires exactly Lucemon. Add the revealed Chaos Mode to hand instead and bottom-deck the four Options. Only the Option cost of 3 is paid.",
    ptBR: "Encerre a criação e use Blue Card. O Lucemon: Chaos Mode EX10-052 revelado não pode evoluir sobre Chaos Mode: a rota alternativa exige exatamente Lucemon. Adicione Chaos Mode revelado à mão e devolva as quatro opções ao fundo do deck. Pague somente o custo 3 da opção.",
  },
  "arena-github-5268-blue-card-lucemon": {
    en: "End breeding and use Blue Card. Accept evolving the field Lucemon EX10-013 into the revealed Chaos Mode for free. Bottom-deck the four Options, take the evolution draw and decline trashing a hand card. Memory remains 7.",
    ptBR: "Encerre a criação e use Blue Card. Aceite evoluir Lucemon EX10-013 do campo em Chaos Mode revelado sem custo. Devolva as quatro opções ao fundo do deck, compre pela evolução e recuse descartar carta da mão. A memória fica em 7.",
  },
  "arena-github-5283-wargreymon-modal-warp": {
    en: "End breeding and activate WarGreymon BT22-013’s hand Main effect with Nokia in play. Decline Nokia’s reduction. Choose the partner-evolution bullet although there is no Gabumon: it legally resolves without deletion (Q2743 analogous wording). Reset and choose the deletion bullet to delete the lowest-DP opposing Digimon.",
    ptBR: "Encerre a criação e ative o efeito Main da mão de WarGreymon BT22-013 com Nokia em campo. Recuse a redução da Nokia. Escolha a digivolução do parceiro mesmo sem Gabumon: o efeito legalmente termina sem deleção (texto equivalente ao Q2743). Reinicie e escolha a deleção para deletar o Digimon adversário de menor DP.",
  },
  "arena-github-5283-metalgarurumon-modal-warp": {
    en: "End breeding and activate MetalGarurumon BT22-026’s hand Main effect with Nokia in play. Decline Nokia’s reduction. Choosing the partner-evolution bullet with no Agumon legally resolves without returning a Digimon (Q2773 analogous wording). Reset and choose the return bullet to return the lowest-level opposing Digimon to hand.",
    ptBR: "Encerre a criação e ative o efeito Main da mão de MetalGarurumon BT22-026 com Nokia em campo. Recuse a redução da Nokia. Escolher a digivolução do parceiro sem Agumon legalmente termina sem devolver Digimon (texto equivalente ao Q2773). Reinicie e escolha a devolução para devolver à mão o Digimon adversário de menor nível.",
  },
  "arena-github-5283-wargreymon-mandatory-delete": {
    en: "End breeding and warp Agumon ST20-10 into WarGreymon ST20-11 for 4; the opposing 10000-DP Digimon enables the warp. Resolve the immunity effect first with no Tamers: it has no targets. The separate lowest-DP deletion must still resolve, deleting the opposing rookie.",
    ptBR: "Encerre a criação e faça warp de Agumon ST20-10 em WarGreymon ST20-11 por 4; o Digimon adversário de 10000 DP permite o warp. Resolva a imunidade primeiro sem Tamers: não há alvos. A deleção separada de menor DP ainda deve resolver, deletando o Digimon rookie adversário.",
  },

  "arena-issue-5266-elecmon-bottom-deck": {
    en: "Production report from KingWows vs RAP SKALYIN: end breeding and evolve Garurumon into AeroVeedramon BT22-023. Elecmon BT25-030 is the only opposing level 4 or lower Digimon, so it must return to the deck bottom automatically. Candlemon under the separate Wisemon must not activate, and all three opposing security cards remain.",
    ptBR: "Relato de produção de KingWows contra RAP SKALYIN: encerre a criação e evolua Garurumon em AeroVeedramon BT22-023. Elecmon BT25-030 é o único Digimon adversário de nível 4 ou menor, então deve voltar automaticamente ao fundo do deck. O Candlemon sob o Wisemon separado não deve ativar, e as três seguranças adversárias permanecem.",
  },
  "arena-issue-5266-candlemon-own-host": {
    en: "End breeding and evolve Garurumon into AeroVeedramon BT22-023. Return the opponent's separate Elecmon BT25-030 to the deck bottom. Candlemon under Wizardmon must not activate or consume security to protect Elecmon. Then use Gaia Force on Wizardmon: Candlemon may trash the top security card to save its own yellow Data/Witchelny host. Alternatively, reset and target Elecmon with Gaia Force to verify deletion is not prevented either.",
    ptBR: "Encerre a criação e evolua Garurumon em AeroVeedramon BT22-023. Devolva o Elecmon BT25-030 separado do oponente ao fundo do deck. O Candlemon sob Wizardmon não deve ativar nem consumir segurança para proteger Elecmon. Depois use Gaia Force em Wizardmon: Candlemon pode descartar a segurança do topo para salvar o próprio Digimon amarelo Data/Witchelny. Alternativamente, reinicie e use Gaia Force em Elecmon para verificar que a deleção também não é impedida.",
  },
  "arena-own-field-effects": {
    en: "End breeding and play Leopardmon. Decline playing another Digimon: your field gains Blocker until the opponent's turn ends. Your corner badge shows its source and duration. Then evolve Flaremon into Apollomon to add a simultaneous DP −8000 effect to the opponent field; resolve the mandatory deletion. End your turn: the DP reduction expires while your Blocker field effect remains.",
    ptBR: "Encerre a criação e jogue Leopardmon. Recuse jogar outro Digimon: seu campo ganha Blocker até o fim do turno adversário. O indicador do seu lado mostra a fonte e a duração. Depois evolua Flaremon em Apollomon para adicionar DP −8000 ao campo adversário ao mesmo tempo; resolva a deleção obrigatória. Encerre seu turno: a redução de DP acaba, mas o Blocker do seu campo permanece.",
  },
  "arena-multiple-field-effects": {
    en: "End breeding. Evolve each Flaremon into a hand Apollomon and decline optional effects. After the mandatory deletions, three opposing Digimon and a Tamer remain. The opponent corner badge must show two separate DP −4000 effects; open it to inspect both sources and deadlines. End the turn to verify both effects expire.",
    ptBR: "Encerre a criação. Evolua cada Flaremon em um Apollomon da mão e recuse efeitos opcionais. Após as deleções obrigatórias, restam três Digimon adversários e um Tamer. O indicador no canto adversário deve mostrar dois efeitos separados de DP −4000; abra para conferir fontes e duração. Encerre o turno para verificar que ambos expiram.",
  },
  "arena-issue-5261-sukamon-field-reduction": {
    en: "End breeding and evolve the separate Flaremon into hand Apollomon. Decline its optional effects. The opponent field must show DP −4000 even while empty. Attack security with GraceNovamon and decline its optional effects. Sukamon activates and enters, then is deleted at 0 DP by the existing field reduction. Open the field badge to inspect Apollomon and its turn-long duration.",
    ptBR: "Encerre a criação e evolua o Flaremon separado no Apollomon da mão. Recuse os efeitos opcionais. O campo adversário deve mostrar DP −4000 mesmo vazio. Ataque a segurança com GraceNovamon e recuse seus efeitos opcionais. Sukamon ativa e entra, mas é deletado por chegar a 0 DP devido à redução já ativa. Abra o indicador de campo para ver Apollomon e a duração até o fim do turno.",
  },
  "arena-tai-matt-double-end-turn": {
    en: "End breeding, then end your turn. Resolve both Tai & Matt effects and accept the first attack on security. Resolve MetalGarurumon's inherited unsuspend. The second Tai & Matt must explain that another attack cannot start during this attack. Both effects resolve, but only one security card is checked.",
    ptBR: "Encerre a criação e depois o turno. Resolva ambos os Tai & Matt e aceite o primeiro ataque à segurança. Resolva a herança do MetalGarurumon para desvirar. O segundo Tai & Matt deve explicar que não pode iniciar outro ataque durante o atual. Ambos os efeitos resolvem, mas só uma segurança é verificada.",
  },
  "arena-issue-5254-examon-dna": {
    en: "End breeding, select Examon BT20-045 from hand and choose Digivolve. Select Groundramon EX13-041 and Wingdramon EX13-021 on the field, then confirm. Both Lv.5 Digimon count as Lv.6 for this DNA, which costs zero memory.",
    ptBR: "Encerre a criação, selecione Examon BT20-045 na mão e escolha Digivoluir. Selecione Groundramon EX13-041 e Wingdramon EX13-021 no campo e confirme. Ambos os Lv.5 contam como Lv.6 para essa DNA, que custa zero memória.",
  },
  "arena-issue-5258-plesiomon-optional-attack": {
    en: "End breeding and play EX8-021. Accept one Plesiomon activation in the effect order and decline the other. DNA Plesiomon and MetalSeadramon into Aegisdramon. The separate attack question must allow declining, leaving security untouched.",
    ptBR: "Encerre a criação e jogue EX8-021. Aceite uma ativação do Plesiomon na ordem dos efeitos e recuse a outra. Faça DNA de Plesiomon e MetalSeadramon em Aegisdramon. A pergunta separada sobre atacar deve permitir recusar, mantendo a segurança intacta.",
  },
  "arena-issue-5259-gammamon-exact-evolution": {
    en: "End breeding and play Canoweissmon BT21-022. Place hand Gammamon under it to delete the opponent's Digimon. Accept Strongest of Brothers Delay, choose BetelGammamon, then Canoweissmon RB1-009. GulusGammamon EX10-042 must not be eligible: its named route requires exactly Gammamon.",
    ptBR: "Encerre a criação e jogue Canoweissmon BT21-022. Coloque Gammamon da mão sob ele para deletar o Digimon adversário. Aceite o Delay de The Strongest of Brothers, escolha BetelGammamon e depois Canoweissmon RB1-009. GulusGammamon EX10-042 não deve ser elegível: sua rota exige exatamente Gammamon.",
  },
  "arena-oct06-king-sukamon-assembly": {
    ptBR: "Encerre a criação e jogue KingSukamon EX13-031. Selecione os três Sukamon do lixo na modal central e confirme Assembly. O custo cai de 7 para 3; as três cartas ficam sob KingSukamon. Recuse o efeito opcional para encerrar o fluxo. Bug 1557077795321024543.",
    en: "End breeding and play EX13-031 KingSukamon. Select the three Sukamon trash cards in the central dialog and confirm Assembly. Play cost falls from 7 to 3; the three cards go under KingSukamon. Decline the optional effect to finish the flow. Bug 1557077795321024543.",
  },
  "arena-oct06-chuumon-trash-revival": {
    ptBR: "Encerre a criação e ataque o MetalGreymon suspenso com Etemon. Etemon é deletado; aceite a herança do Chuumon EX5, selecione Chuumon BT3 no lixo e confirme. Ele entra em campo suspenso sem custo. Bug 1557077795321024543.",
    en: "End breeding and attack suspended MetalGreymon with Etemon. Etemon is deleted; accept EX5 Chuumon’s inherited effect, select BT3 Chuumon from trash and confirm. It enters the field suspended for free. Bug 1557077795321024543.",
  },
  "arena-oct06-dorbickmon-digixros": {
    ptBR: "Encerre a criação e jogue Dorbickmon EX3-014. Selecione os cinco Digimon de nomes diferentes da mão na modal central. Confirme DigiXros: custo 3, memória 7 e cinco cartas sob Dorbickmon. Bug 1557085470129922229.",
    en: "End breeding and play EX3-014 Dorbickmon. Select the five differently named hand Digimon in the central dialog. Confirm DigiXros: cost 3, memory 7 and five cards under Dorbickmon. Bug 1557085470129922229.",
  },
  "arena-oct06-snow-goblimon-reveal": {
    ptBR: "Encerre a criação e jogue SnowGoblimon BT24-021. Nas três reveladas, escolha Aegiochusmon e confirme; depois MetalGreymon e confirme. Ambos entram na mão; o restante vai ao fundo do deck. Selecione Agumon na mão e confirme o descarte obrigatório. Bug 1557076811341500428.",
    en: "End breeding and play BT24-021 SnowGoblimon. From the three revealed cards, choose Aegiochusmon and confirm, then MetalGreymon and confirm. Both enter your hand; the rest returns to the deck bottom. Select hand Agumon and confirm the required discard. Bug 1557076811341500428.",
  },
  "arena-oct06-sukamon-bt11-deletion-search": {
    ptBR: "Encerre a criação e ataque o Agumon suspenso com Sukamon BT11-040. Sukamon perde a batalha e é deletado. Nas três cartas reveladas do deck, escolha Chuumon ou Sukamon e confirme: a escolhida vai à mão e as outras duas vão ao lixo.",
    en: "End breeding and attack suspended Agumon with BT11-040 Sukamon. Sukamon loses the battle and is deleted. From the three revealed deck cards, choose Chuumon or Sukamon and confirm: the selected card enters your hand and the other two go to trash.",
  },
  "arena-oct06-sukamon-bt3-deletion-search": {
    ptBR: "Encerre a criação e ataque o Agumon suspenso com Sukamon BT3-063. Ele é deletado e revela três cartas do deck. Escolha um dos Chuumon e confirme para jogá-lo sem custo. Ordene e confirme as outras duas cartas no fundo do deck. Você também pode recusar a seleção.",
    en: "End breeding and attack suspended Agumon with BT3-063 Sukamon. It is deleted and reveals three deck cards. Select either Chuumon and confirm to play it for free. Order and confirm the other two cards at the deck bottom. You may also decline the selection.",
  },
  "arena-oct06-sukamon-ex13-deletion-search": {
    ptBR: "Encerre a criação e ataque o Agumon suspenso com Sukamon EX13-028. Ele é deletado e revela três cartas do deck. Escolha Chuumon ou Sukamon BT14-034 e confirme para jogá-lo sem custo; as outras duas cartas vão ao lixo. Você também pode recusar a seleção.",
    en: "End breeding and attack suspended Agumon with EX13-028 Sukamon. It is deleted and reveals three deck cards. Select Chuumon or BT14-034 Sukamon and confirm to play it for free; the other two cards go to trash. You may also decline the selection.",
  },
  "arena-oct06-trash-recovery": {
    ptBR: "Encerre a criação e jogue Matt Ishida BT2. Escolha Gabumon ou Night Raid no lixo e confirme. A carta escolhida deve ir à mão; Agumon vermelho não é um alvo legal. A seleção deve continuar marcada após Visualizar mesa e Voltar à decisão. Bug 1557059213266522233.",
    en: "End breeding and play BT2 Matt Ishida. Select Gabumon or Night Raid from trash and confirm. The chosen card must enter your hand; red Agumon is illegal. Your pick must survive View board and Return to decision. Bug 1557059213266522233.",
  },
  "arena-oct06-revealed-search": {
    ptBR: "Encerre a criação e jogue Davis BT3. Nas três cartas reveladas, escolha Armadillomon para a busca azul e confirme; depois escolha Goblimon para a busca verde e confirme. Ambas vão à mão e Agumon volta ao fundo do deck. Bug 1557059213266522233.",
    en: "End breeding and play BT3 Davis. From the three revealed cards, select Armadillomon for the blue search and confirm; then select Goblimon for the green search and confirm. Both enter your hand and Agumon returns to the deck bottom. Bug 1557059213266522233.",
  },
  "arena-oct06-mastemon-owner-security": {
    ptBR: "Ataque com Mastemon e aceite All Turns. Escolha Gabumon do oponente: ele deve ir ao fundo da segurança do oponente. Os dois Tamers são alvos ilegais. Bug 1557044001453113455.",
    en: "Attack with Mastemon and accept All Turns. Choose the opponent's Gabumon: it must go to the bottom of its owner's security. Both Tamers are illegal targets. Bug 1557044001453113455.",
  },
  "arena-oct06-kyo-barrier": {
    ptBR: "Ataque a segurança com Aegiomon e aceite Barrier. Aceite Kyo e selecione Gabumon: ele deve receber Security A. -1. Bug 1557051530291585105.",
    en: "Attack security with Aegiomon and accept Barrier. Accept Kyo and select Gabumon: it must receive Security A. -1. Bug 1557051530291585105.",
  },
  "arena-oct06-millennium-deck-order": {
    ptBR: "Faça DNA de Kimeramon e Machinedramon em Millenniummon. Aceite devolver os três níveis do lixo do oponente. Você deve ordenar as três cartas no topo do deck dele e ganhar 3 memórias. Bug 1557034399055216700.",
    en: "DNA digivolve Kimeramon and Machinedramon into Millenniummon. Accept returning all three levels from the opponent's trash. You must choose their order on top of that deck and gain 3 memory. Bug 1557034399055216700.",
  },
  "arena-oct06-kazemon-blast": {
    ptBR: "Ataque com Aldamon. O oponente pode usar Blast de Zephagamon ACE e devolver Aldamon ao fundo. Aceite Kazemon para jogar Takuya das fontes. O timeout não pode encerrar um Counter que já foi aceito e ainda resolve. Bug 1557040872820842556.",
    en: "Attack with Aldamon. The opponent can Blast into Zephagamon ACE and return Aldamon to the bottom. Accept Kazemon to play Takuya from its sources. The timeout must wait for an accepted Counter to finish resolving. Bug 1557040872820842556.",
  },
  "arena-oct06-asuna-jupiter": {
    ptBR: "Recuse Start of Main da Asuna. Ative seu Main, vire Asuna e descarte a Option. Evolua Aegiochusmon no Jupitermon do lixo usando o custo alternativo: com 1 segurança e redução de 1, o custo é 0. Bug 1557017861220737085.",
    en: "Decline Asuna's Start of Main. Activate her Main, suspend Asuna and trash the Option. Evolve Aegiochusmon into Jupitermon from trash using the alternate cost: with 1 security and a reduction of 1, the cost is 0. Bug 1557017861220737085.",
  },
  "arena-oct06-giromon-assembly": {
    ptBR: "Jogue P-220 por Assembly usando os três Digimon do lixo. Aceite a deleção de Millenniummon nele mesmo. O herdado de Giromon deve descartar a segurança superior do oponente antes da deleção. Bug 1557032910413107332.",
    en: "Play P-220 by Assembly using the three Digimon from trash. Accept Millenniummon's deletion targeting itself. Giromon's inherited effect must trash the opponent's top security before the deletion. Bug 1557032910413107332.",
  },
  "arena-oct06-blue-scramble-decline": {
    ptBR: "No início do turno, ative um Blue Scramble e recuse o outro na ordenação. Devolva Armadillomon BT1-027 ao topo. Na seleção de Monmon BT1-031, escolha Nenhuma seleção: ele deve continuar no lixo mesmo sendo a única opção. Bug 1556998094070095964.",
    en: "At turn start, activate one Blue Scramble and decline the other in the ordering plan. Return BT1-027 Armadillomon to the top. Choose no card in the BT1-031 Monmon selection: it must remain in trash even as the sole candidate. Bug 1556998094070095964.",
  },
  "arena-oct06-rina-decline": {
    ptBR: "Na Fase Ativa, aceite uma Rina e recuse a outra na ordenação. A Rina aceita vira e compra 1. Escolha Nenhuma seleção na escolha de Veemon, ou selecione Veemon e depois recuse o único Veedramon ST8-05. Veemon continua em campo e Veedramon na mão. Bug 1556998094070095964.",
    en: "During Active, accept one Rina and decline the other in the ordering plan. The accepted Rina suspends and draws 1. Choose no Veemon, or select Veemon and then decline the sole ST8-05 Veedramon. Veemon stays in play and Veedramon stays in hand. Bug 1556998094070095964.",
  },
  "arena-oct06-vortex-opt-decline": {
    ptBR: "Encerre a criação. Use Flower Cannon para virar Monodramon BT1-009 e recuse Battle de Vortexdramon, que já está desvirado. Use a segunda Flower Cannon para virar Agumon BT1-010; aceite Battle e escolha Agumon. O efeito por turno continua disponível após a primeira recusa. Não há ataque nem Piercing nessa batalha. Controle do relato 1557002713047502968.",
    en: "End breeding. Use Flower Cannon to suspend BT1-009 Monodramon and decline Vortexdramon's Battle while it is already unsuspended. Use the second Flower Cannon to suspend BT1-010 Agumon; accept Battle and select Agumon. The once-per-turn effect remains available after the first decline. This battle has no attack or Piercing. Control for report 1557002713047502968.",
  },
  "arena-oct06-vortex-piercing-controls": {
    ptBR: "Encerre a criação e passe o turno. Aceite o ataque de Vortex contra Agumon BT1-010. Recuse Suspend, aceite Unsuspend e Battle. Se a batalha por efeito deletar Monodramon BT1-009, o ataque ainda alcança Agumon e Piercing verifica 1 segurança. Se deletar o próprio Agumon antes do combate normal, o ataque fica sem alvo, mas Piercing pendente ainda verifica 1 segurança antes do fim do ataque (CR 16-7-4). Controle da partida 98e7ed61 e do relato 1557002713047502968.",
    en: "End breeding and pass the turn. Accept Vortex's attack against BT1-010 Agumon. Decline Suspend, accept Unsuspend and Battle. If the direct battle deletes BT1-009 Monodramon, the attack still reaches Agumon and Piercing checks 1 security. If it deletes Agumon itself before ordinary combat, the attack is unsuccessful, but pending Piercing still checks 1 security before End of Attack (CR 16-7-4). Control for match 98e7ed61 and report 1557002713047502968.",
  },
  "arena-oct06-zero-dp-partition": {
    ptBR: "Evolua Erlangmon para Sanmyojin. O Examon adversário cai a 0 DP. Aceite Partition: Groundramon e Wingdramon devem ser deletados antes de suspender ou remover fontes.",
    en: "Digivolve Erlangmon into Sanmyojin. The opposing Examon falls to 0 DP. Accept Partition: Groundramon and Wingdramon must be deleted before suspending anything or removing sources.",
  },
  "arena-oct06-takato-blitz": {
    ptBR: "Evolua Growlmon para WarGrowlmon AD1 e jogue Takato EX2 pelo efeito. Aceite a evolução de Gigimon para Megidramon. Takato deve conceder Blitz mesmo com a memória no lado adversário.",
    en: "Digivolve Growlmon into AD1 WarGrowlmon and play EX2 Takato with its effect. Accept Gigimon’s evolution into Megidramon. Takato must grant Blitz even with memory on the opponent’s side.",
  },
  "arena-oct06-partition-dragon-gene": {
    ptBR: "Ataque a segurança com Examon e escolha-o como alvo de Gaia Force. Resolva Partition antes de Dragon Gene. Faça DNA dos dois materiais EX13 para o Examon da mão. Analog Youth pode suspender e ganhar memória porque a Digi-Egg ainda estava sob o Examon deletado.",
    en: "Attack security with Examon and select it for Gaia Force. Resolve Partition before Dragon Gene. DNA digivolve the two EX13 materials into the Examon in hand. Analog Youth can suspend and gain memory because the deleted Examon still held its Digi-Egg.",
  },
  "arena-oct06-inherited-battle": {
    ptBR: "Ataque o Examon suspenso com PlatinumSukamon. Após perder a batalha, use sua deleção para De-Digivolve 1 no Examon. Groundramon vira o topo e seu antigo herdado não pode remover segurança.",
    en: "Attack suspended Examon with PlatinumSukamon. After losing the battle, use its deletion effect to De-Digivolve 1 on Examon. Groundramon becomes the top card and its former inherited effect cannot trash security.",
  },
  "arena-oct06-active-overflow": {
    ptBR: "Jogue Agumon BT1-010 por 3 a partir de 2 de memória. No início do turno adversário, aceite deletar Shoutmon. Overflow do ACE sob ele encerra o turno ainda em Active, sem compra ou criação. Este cenário exercita a mesma fronteira do relato de imunidade.",
    en: "Play BT1-010 Agumon for 3 from 2 memory. At the opponent’s turn start, accept Shoutmon’s self-deletion. The ACE underneath causes Overflow and ends that turn in Active, before drawing or breeding. This exercises the same boundary as the immunity report.",
  },
  "arena-discord-1556882561995644928-mobile-inspection": {
    ptBR: "Encerre a criação e jogue Leopardmon sem Assembly. Selecione Alphamon diretamente na mesa e confirme para suspendê-lo; nenhuma confirmação separada de ativação deve aparecer. Na escolha seguinte, selecione um Dorumon na mesa; nenhuma galeria de alvos deve abrir. Se desejar, use Visualizar mesa para recolher os controles. Segure Alphamon ou toque na lupa para ler a carta e seus herdados; toque na arte para ampliar. Feche e retorne à decisão: o Dorumon selecionado deve continuar marcado. Só Confirmar alvos envia a escolha; o herdado de Grademon pode então proteger Dorumon.",
    en: "End breeding and play Leopardmon without Assembly. Select Alphamon directly on the board and confirm to suspend it; no separate activation confirmation should appear. In the next choice, select a Dorumon on the board; no target gallery should open. Optionally use View board to hide the controls. Hold Alphamon or tap its magnifier to read the card and its inherited effects; tap the art to zoom. Close and return to the decision: the selected Dorumon must remain picked. Only Confirm targets sends the choice; Grademon's inherited effect can then protect Dorumon.",
  },
  "arena-issue-5167-assembly-digimon": {
    ptBR: "Encerre a criação. Jogue Aegiochusmon: Dark com Assembly: Yokomon no lixo não pode ser material, pois é Digi-Egg; Dobermon BT26-069 pode. Pague 6 e recuse o efeito ao jogar. Yokomon deve continuar no lixo.",
    en: "End breeding. Play Aegiochusmon: Dark with Assembly: Yokomon in trash is a Digi-Egg and cannot be a material; BT26-069 Dobermon is eligible. Pay 6 and decline the On Play effect. Yokomon stays in trash.",
  },
  "arena-issue-5171-taomon-famis": {
    ptBR: "Encerre a criação. Digievolua Taomon ACE sobre o Digimon amarelo por 3. Aceite usar Famis gratuitamente e suspenda os dois Digimon adversários; recuse Arts Digivolve. Famis deve ir ao lixo, com memória 7. A Option de Jupitermon tem duas cores e não pode ser escolhida.",
    en: "End breeding. Digivolve Taomon ACE onto the yellow Digimon for 3. Accept using Famis for free and suspend both opposing Digimon; decline Arts Digivolve. Famis goes to trash with memory at 7. Jupitermon's two-color Option face cannot be selected.",
  },
  "arena-issue-5176-king-drasil-ace": {
    en: "Skip breeding. King Drasil places Alphamon: Ouryuken ACE and the revealed egg under itself at the start of Main. Order those cards; the ACE's previous source goes to trash. Overflow must not charge memory. A Royal Knight played during Main stays on the field until your next Main.",
    ptBR: "Pule a criação. King Drasil coloca Alphamon: Ouryuken ACE e o ovo revelado sob si no início da Principal. Ordene essas cartas; a fonte anterior do ACE vai para o lixo. Overflow não deve cobrar memória. Um Royal Knight jogado durante a Principal fica em campo até sua próxima Principal.",
  },
  "arena-issue-5166-dna-material-pairs": {
    en: "Select Mastemon and a DNA material. On the field, select Angewomon and the LadyDevimon with one digivolution card, then confirm. The other LadyDevimon must remain on the field. Also try with action confirmations disabled.",
    ptBR: "Selecione Mastemon e um material de DNA. No campo, selecione Angewomon e a LadyDevimon com uma carta de digievolução e confirme. A outra LadyDevimon deve ficar em campo. Teste também com as confirmações de ação desativadas.",
  },
  "arena-issue-5173-cyber-engage": {
    en: "Activate Cyber Engage's Delay and choose Roleplaymon. Pay 1 memory (1 → 0).",
    ptBR: "Ative o Delay de Cyber Engage e escolha Roleplaymon. Pague 1 memória (1 → 0).",
  },
  "arena-issue-5173-cyber-engage-psychemon": {
    en: "Activate Cyber Engage's Delay and choose Roleplaymon. The opposing Psychemon prevent cost reduction: pay 4 memory (1 → -3), matching the reported game.",
    ptBR: "Ative o Delay de Cyber Engage e escolha Roleplaymon. Os Psychemon adversários impedem a redução: pague 4 memórias (1 → -3), como na partida reportada.",
  },
  "arena-issue-5127-opponent-suspend-cost": {
    ptBR: "Use a metade Option de Zephagamon. Para reduzir o custo, suspenda os dois Digimon adversários. O custo deve cair de 6 para 4; depois trave o Tamer e devolva um dos Digimon ao fundo do deck.",
    en: "Use Zephagamon's Option side. Suspend both opposing Digimon for the reduction. The cost falls from 6 to 4; then lock the Tamer and bottom-deck one Digimon.",
  },
  "arena-issue-5127-opponent-survival": {
    ptBR: "Use Gaia Force em Zephagamon. O jogador adversário pode aceitar sua proteção e suspender seu Agumon para impedir a deleção.",
    en: "Use Gaia Force on Zephagamon. Its controller may accept protection and suspend your Agumon to prevent deletion.",
  },
  "arena-issue-5168-alter-s-simultaneous": {
    ptBR: "Ataque com Alter-S e aceite seu Fim de Ataque. As duas fontes entram juntas; Garurumon pode evoluir para WereGarurumon EX9-019 da mão sem custo. Alter-S vira a segurança do topo.",
    en: "Attack with Alter-S and accept End of Attack. Both sources enter together; Garurumon can evolve into hand WereGarurumon EX9-019 for free. Alter-S becomes top security.",
  },
  "arena-issue-5169-demidevimon-native": {
    ptBR: "Jogue Arukenimon e delete DemiDevimon para reduzir o custo. Resolva o efeito nativo de DemiDevimon: coloque-o sob Arukenimon e evolua para MaloMyotismon. Seu efeito herdado não pode ativar retroativamente; Agumon adversário e sua carta na mão permanecem.",
    en: "Play Arukenimon and delete DemiDevimon to reduce its cost. Resolve DemiDevimon’s native effect: place it under Arukenimon and evolve into MaloMyotismon. Its inherited effect cannot activate retroactively; the opposing Agumon and your hand card remain.",
  },
  "arena-issue-5179-imperialdramon-blitz": {
    ptBR: "Encerre a criação. Evolua Paildramon para Imperialdramon EX3-063 por 4, passando a memória ao oponente. Aceite Blitz e ataque a segurança. Os dois Digimon adversários devem permanecer: a remoção exige DNA, Blitz não.",
    en: "End breeding. Digivolve Paildramon into EX3-063 Imperialdramon for 4, passing memory. Accept Blitz and attack security. Both opposing Digimon remain: deletion requires DNA, Blitz does not.",
  },
  "arena-issue-5190-tapmon-bootmon": {
    ptBR: "Encerre a criação. Use App Fusion de Logimon com Craftmon ligado para Bootmon por zero. Aceite ligar Shutmon por Quando Evoluir. Aceite a redução de Tapmon: custo 3 menos 2 menos 1 é zero. Resolva a suspensão de Bootmon e a restrição de Shutmon.",
    en: "End breeding. App Fuse Logimon with linked Craftmon into Bootmon for zero. Accept linking Shutmon through When Digivolving. Accept Tapmon’s reduction: cost 3 minus 2 minus 1 is zero. Resolve Bootmon’s suspension and Shutmon’s restriction.",
  },
  "arena-issue-5232-icemon-egg": {
    en: "Play Icemon and accept placing Tumblemon from trash. The level 2 Rock DigiEgg becomes a digivolution card.",
    ptBR: "Jogue Icemon e aceite colocar Tumblemon do lixo. O DigiEgg de nível 2 com Rock deve entrar nas fontes.",
  },
  "arena-issue-5246-savior-decline": {
    en: "Digivolve Greymon into SaviorHuckmon. Decline playing a card, then attack and accept playing Sistermon Ciel. Declining must preserve the shared once-per-turn opportunity.",
    ptBR: "Evolua Greymon para SaviorHuckmon. Recuse jogar uma carta e depois ataque aceitando jogar Sistermon Ciel. Recusar deve preservar o uso compartilhado uma vez por turno.",
  },
  "arena-issue-5241-kurata-sleep": {
    en: "Play Belphemon Sleep Mode and accept Kurata's reduction by deleting Gizmon AT. Pay 11 minus 6: memory goes from 10 to 5, and Gizmon goes to trash.",
    ptBR: "Jogue Belphemon Sleep Mode e aceite a redução de Kurata deletando Gizmon AT. Pague 11 menos 6: a memória passa de 10 para 5 e Gizmon vai ao lixo.",
  },
  "arena-issue-5247-crimson-use-cost": {
    en: "Use Crimson Blaze against five opposing Digimon, including Chikurimon. Its use cost is 6 minus 5: memory goes from 3 to 2. A play-cost restriction must not block an Option use-cost reduction.",
    ptBR: "Use Crimson Blaze contra cinco Digimon, incluindo Chikurimon. O custo de uso é 6 menos 5: a memória passa de 3 para 2. A restrição de custo de jogar não pode bloquear a redução de uso de uma Option.",
  },
  "arena-issue-5248-dynasmon-security": {
    en: "Attack security with Agumon. As player 2, give Greymon Security Attack -1, then choose Garurumon for -3000 DP. The two Security choices are independent; you may also choose the same Digimon twice.",
    ptBR: "Ataque a segurança com Agumon. Como jogador 2, dê Security Attack -1 a Greymon e depois escolha Garurumon para -3000 DP. As duas escolhas são independentes; você também pode escolher o mesmo Digimon duas vezes.",
  },
  "arena-issue-5207-dorimon-guard": {
    en: "Attack with PrinceMamemon. As player 2, use Gallantmon's Counter. Accept Thundermon's Guard to protect PrinceMamemon. Dorimon must gain 1 memory for the sacrificed Digimon, which had Blocker from PrinceMamemon.",
    ptBR: "Ataque com PrinceMamemon. Como jogador 2, use o Counter de Gallantmon. Aceite o Guard de Thundermon para proteger PrinceMamemon. Dorimon deve ganhar 1 memória pelo Digimon sacrificado, que tinha Blocker concedido por PrinceMamemon.",
  },
  "arena-issue-5214-habakirimon-security": {
    en: "Digivolve Habakirimon and put Agumon in security. It belongs to the opponent security stack, not yours.",
    ptBR: "Evolua Habakirimon e coloque Agumon na segurança. Ele deve ir à segurança adversária.",
  },
  "arena-issue-5204-dorimon-cost": {
    en: "Attack security, end the turn and decline Dorimon payment. Passing sets memory to -3; it stays there, the Digimon remains suspended. Accepting payment costs 1.",
    ptBR: "Ataque a segurança, encerre o turno e recuse pagar Dorimon. A memória ao passar permanece em -3 e o Digimon suspenso. Aceitar custa 1 memória.",
  },
  "arena-issue-5219-lucemon-breeding": {
    en: "Use Gospel and evolve the Cupimon in breeding into trash EX10-013. Accept its Breeding When Digivolving effect to move it to battle.",
    ptBR: "Use Gospel e evolua Cupimon para EX10-013 do lixo. Aceite Quando Evoluir na criação para movê-lo à batalha.",
  },
  "arena-issue-5217-metalgarurumon-choice": {
    en: "Digivolve MetalGarurumon. Even without Agumon, both bullets remain selectable. Choosing evolution does nothing and leaves the opposing Monodramon alive.",
    ptBR: "Evolua MetalGarurumon. Mesmo sem Agumon, as duas opções devem aparecer. Escolher evolução não remove o Monodramon adversário.",
  },
  "arena-issue-5230-hidden-inherited": {
    en: "MetalMamemon has a face-down Hagurumon source. It must not gain the inherited Blocker keyword.",
    ptBR: "MetalMamemon possui Hagurumon virado para baixo nas fontes. O herdado Blocker não pode estar ativo.",
  },
  "arena-issue-5218-landramon-discard": {
    en: "Digivolve EX10-032, trash Landramon as its cost and select your Digimon for Collision. After that effect resolves, Landramon De-Digivolves the opponent.",
    ptBR: "Evolua EX10-032, pague descartando Landramon e escolha seu Digimon para Collision. Após resolver, Landramon aplica De-Digivolve ao adversário.",
  },
  "arena-issue-5235-merciful-jupiter-order": {
    en: "Play Merciful Mode, decline its attack, and choose Battle three times against Jupiter. Red accepts Barrier each time. Jupiter DP reduction waits for all three battles.",
    ptBR: "Jogue Merciful Mode, recuse o ataque e escolha Battle três vezes contra Jupiter. Vermelho aceita Barrier a cada vez. A redução de DP aguarda os três combates.",
  },
  "arena-issue-5215-venusmon-guard-cost": {
    en: "Blue uses Happy Bullet Showering. Red accepts Venusmon protection and picks Blue Guard Mamemon for the cost. Blue prevents that move with Guard. Venusmon must not activate again for the other deleted Digimon.",
    ptBR: "Azul usa Happy Bullet Showering. Vermelho aceita Venusmon e escolhe Mamemon para pagar. Azul usa Guard para impedir. Venusmon não pode ativar novamente para o outro Digimon.",
  },
  "arena-issue-5199-sistermon-option": {
    ptBR: "Encerre a criação e use EX13-066 como Option. Jogue Sistermon Ciel do lixo; depois selecione um dos dois Digimon adversários para De-Digivolve. Resolva Arts Digivolve: recuse para observar o Ao Jogar de Ciel, ou aceite para evoluir sobre ela sem ativar esse Ao Jogar.",
    en: "End breeding and use EX13-066 as an Option. Play trash Sistermon Ciel, then select one of the two opposing Digimon for De-Digivolve. Resolve Arts Digivolve: decline to observe Ciel's On Play, or accept to evolve over her without resolving that On Play.",
  },
  "arena-issue-5196-kyubimon-search": {
    ptBR: "Encerre a criação e evolua Renamon para Kyubimon por 2. Após comprar pela evolução, revele 3 e escolha Sakuyamon; devolva as demais ao fundo. Ao Jogar não deve buscar. Quando Mover da criação também deve buscar.",
    en: "End breeding and digivolve Renamon into Kyubimon for 2. After the evolution draw, reveal 3 and select Sakuyamon; return the rest to the bottom. On Play must not search. Moving from breeding must also search.",
  },
  "arena-issue-5194-alphamon-entry": {
    ptBR: "Encerre a criação. Jogue Alphamon sem Assembly. Aceite seu efeito: Alphamon não pode atacar no turno em que entrou sem Rush, mas ainda deve oferecer a reativação de Quando Evoluir. Aceite e reduza o DP adversário em 8000. A resolução deve terminar normalmente.",
    en: "End breeding. Play Alphamon without Assembly. Accept its effect: the newly played Alphamon cannot attack without Rush, but must still offer to reactivate When Digivolving. Accept and reduce opposing DP by 8000. Resolution must finish normally.",
  },
  "arena-issue-5185-nokia-warp": {
    ptBR: "Encerre a criação. Selecione WarGreymon na mão e use seu efeito Principal da mão para evoluir Agumon: custo impresso 6, reduzido para 5 por Nokia. Não use a evolução normal. Repita com MetalGarurumon e Gabumon, ou reinicie o cenário.",
    en: "End breeding. Select WarGreymon in hand and use its Hand Main effect to evolve Agumon: printed cost 6, reduced to 5 by Nokia. Use the hand effect action. Repeat with MetalGarurumon and Gabumon, or reset the scenario.",
  },
  "arena-issue-5170-kaguyamon-end-turn": {
    ptBR: "Encerre o turno e aceite Kaguyamon EX9-033. Escolha Sistermon Blanc ou Ciel no lixo; ambas são Puppet de nível 4 ou menor e podem entrar sem custo.",
    en: "End your turn and accept EX9-033 Kaguyamon. Choose trash Sistermon Blanc or Ciel; both are level 4 or lower Puppets and can enter for free.",
  },
  "arena-issue-5170-kaguyamon-on-play": {
    ptBR: "Jogue Kaguyamon EX12-065 e aceite seu Ao Jogar. Escolha Sistermon Blanc ou Ciel no lixo para jogar sem custo. Seu Ao Deletar devolve um Digimon adversário ao fundo do deck; não joga Puppets.",
    en: "Play EX12-065 Kaguyamon and accept On Play. Choose trash Sistermon Blanc or Ciel to play for free. Its On Deletion returns an opposing Digimon to the deck bottom; it does not play Puppets.",
  },
  "arena-issue-5170-arisa-overclock": {
    ptBR: "Encerre o turno, aceite Overclock e delete o Familiar Token. Aceite Arisa e suspenda-a para comprar 1. Escolha Sistermon Blanc ou Ciel na mão para jogar sem custo. Arisa deve estar ativa; ela não joga do lixo.",
    en: "End your turn, accept Overclock and delete the Familiar Token. Accept Arisa and suspend her to draw 1. Choose hand Sistermon Blanc or Ciel to play for free. Arisa must be unsuspended; she does not play from trash.",
  },
  "arena-issue-5159-kudamon-moving": {
    ptBR: "Mova Kudamon da criação. Mesmo sem Tamer em campo, selecione uma carta revelada para a mão e confirme a ordem das restantes no fundo do deck. A movimentação encerra a criação automaticamente; a fase Principal deve continuar normalmente.",
    en: "Move Kudamon out of breeding. With no Tamer on the field, select a revealed card for the hand and confirm the order of the remaining cards at the bottom of the deck. Moving ends breeding automatically; Main must then continue normally.",
  },
  "arena-issue-5158-guilmon-x-reveal": {
    ptBR: "Jogue Guilmon X e selecione Growlmon e X Antibody entre as cartas reveladas. As duas escolhas devem ser visíveis e a resolução deve encerrar.",
    en: "Play Guilmon X and select Growlmon and X Antibody from the reveals. Both choices must be visible and resolution must finish.",
  },
  "arena-issue-5050-counter-immunity": {
    ptBR: "Ataque com Vortexdramon e suspenda seu Agumon para obter imunidade. Recuse a batalha extra. O Counter de Gallantmon deve preservar Vortexdramon e descartar segurança do jogador de Vortexdramon.",
    en: "Attack with Vortexdramon and suspend your Agumon to gain immunity. Decline the extra battle. Gallantmon's Counter must preserve Vortexdramon and trash its controller's security.",
  },
  "arena-issue-5059-angewomon-warp": {
    ptBR: "Jogue Angewomon e escolha Agumon ou Gabumon. Evolua para WarGreymon ou MetalGarurumon sem custo; o oponente tem 10000 DP ou mais.",
    en: "Play Angewomon and choose Agumon or Gabumon. Evolve into WarGreymon or MetalGarurumon for free; the opponent has at least 10000 DP.",
  },
  "arena-issue-5058-davis-large-hand": {
    ptBR: "No início da fase principal, use Davis e Ken. Role a mão grande para selecionar Veemon e jogá-lo de graça.",
    en: "At start of Main, use Davis and Ken. Scroll the large hand to select Veemon and play it for free.",
  },
  "arena-issue-5070-lunamon-breeding": {
    ptBR: "Evolua o ovo para Lunamon e depois Lekismon na criação. Encerre criação, jogue a outra Lunamon e selecione as cartas reveladas.",
    en: "Evolve the egg into Lunamon then Lekismon in breeding. End breeding, play the other Lunamon and select the revealed cards.",
  },
  "arena-issue-5067-treadmill-reveal": {
    ptBR: "Evolua na criação e use Treadmill Training na Principal. Escolha uma carta revelada e confirme.",
    en: "Evolve in breeding and use Treadmill Training in Main. Choose a revealed card and confirm.",
  },
  "arena-issue-5066-shadow-reveal": {
    ptBR: "Use Shadow Training e escolha uma das duas cartas reveladas.",
    en: "Use Shadow Training and choose one of the two revealed cards.",
  },
  "arena-issue-5063-bokomon-base": {
    ptBR: "Evolua BurningGreymon para Aldamon. Bokomon não deve ganhar memória por um Tamer enterrado na pilha.",
    en: "Evolve BurningGreymon into Aldamon. Bokomon must not gain memory for a buried Tamer.",
  },
  "arena-issue-5064-hybrid-protection": {
    ptBR: "Jogue Gaia Force e escolha o Hybrid adversário sem J.P., Koji e Koichi nas fontes. Ele deve ser deletado sem consumir segurança; apenas o outro Hybrid tem proteção.",
    en: "Play Gaia Force and select the opposing Hybrid without J.P., Koji and Koichi in its sources. It must be deleted without consuming security; only the other Hybrid is protected.",
  },
  "arena-issue-5060-exact-lucemon": {
    ptBR: "Ataque a segurança. Paradise Lost pode jogar Lucemon, mas não Chaos Mode.",
    en: "Attack security. Paradise Lost may play Lucemon, but not Chaos Mode.",
  },
  "arena-issue-5047-richard-self": {
    ptBR: "Recuse o efeito no início da Principal. Jogue o segundo Richard e recuse a colocação: nenhum Tamer recebe cartas.",
    en: "Decline the start of Main effect. Play the second Richard and decline placement: neither Tamer receives cards.",
  },
  "arena-issue-5049-decline-dna": {
    ptBR: "Encerre o turno, recuse DNA e aceite atacar com BlitzGreymon.",
    en: "End the turn, decline DNA and accept attacking with BlitzGreymon.",
  },
  "arena-issue-5073-epulse-trash": {
    ptBR: "Encerre a criação e use e-Pulse. Aceite o efeito: a seleção mostra Cougarmon da mão e Liollmon do lixo; Murasamemon (custo 7) fica desabilitado. Escolha Liollmon do lixo: ele entra em jogo, e-Pulse vai para a área de batalha e a memória fica em 2.",
    en: "End breeding and use e-Pulse. Accept the effect: the selection shows Cougarmon from hand and Liollmon from trash; Murasamemon (cost 7) stays disabled. Pick the trash Liollmon: it enters play, e-Pulse goes to the battle area and memory ends at 2.",
  },
  "arena-issue-5099-mervamon-iliad": {
    ptBR: "Encerre a criação e digivolva Aegiochusmon: Holy em Mervamon. Aceite o efeito: a seleção mostra Kamemon e Hyokomon da mão e Cyclonemon e Salamon do lixo. Escolha Kamemon (3) e Cyclonemon (5), total 8: os dois entram em jogo e Omnimon fica com 3000 DP.",
    en: "End breeding and digivolve Aegiochusmon: Holy into Mervamon. Accept the effect: the selection shows Kamemon and Hyokomon from hand and Cyclonemon and Salamon from trash. Pick Kamemon (3) and Cyclonemon (5), 8 in total: both enter play and Omnimon ends at 3000 DP.",
  },
  "arena-issue-5106-king-sukamon-cost": {
    ptBR: "Encerre a criação e digivolva Sukamon em KingSukamon. Aceite o efeito: o custo oferece o Chuumon da mão e as cartas de digivolução Sukamon e Chuumon. Descarte o Chuumon da mão: MetalGreymon vira Sukamon branco com 3000 DP.",
    en: "End breeding and digivolve Sukamon into KingSukamon. Accept the effect: the cost offers the hand Chuumon and the Sukamon and Chuumon digivolution cards. Trash the hand Chuumon: MetalGreymon becomes a white Sukamon with 3000 DP.",
  },
  "arena-issue-5118-candlemon-search": {
    ptBR: "Encerre a criação e jogue Candlemon BT18-030. A janela de revelação mostra Treadmill Training, Dynasmon e Heat Training; só Dynasmon pode ser escolhido. Confirme: Dynasmon vai para a mão e o resto vai para o fundo do deck.",
    en: "End breeding and play BT18-030 Candlemon. The reveal window shows Treadmill Training, Dynasmon and Heat Training; only Dynasmon can be picked. Confirm: Dynasmon goes to hand and the rest goes to the bottom of the deck.",
  },
  "arena-issue-5135-ai-mako-your-turn": {
    ptBR: "Encerre a criação e jogue Ai & Mako. Escolha Beelzemon (X Antibody) entre Impmon, Beelzemon e Impmon (X); Purple Memory Boost! fica desabilitado. Depois digivolva Impmon em Porcupamon, aceite o efeito de Ai & Mako e devolva a carta comprada ao deck: o Tamer fica suspenso e a memória sobe de 3 para 4.",
    en: "End breeding and play Ai & Mako. Pick Beelzemon (X Antibody) among Impmon, Beelzemon and Impmon (X); Purple Memory Boost! stays disabled. Then digivolve Impmon into Porcupamon, accept Ai & Mako's effect and return the drawn card to the deck: the Tamer suspends and memory goes from 3 to 4.",
  },
  "arena-issue-5106-chuumon-self-replay": {
    ptBR: "Encerre a criação e ataque Omnimon com Etemon. Etemon é deletado; aceite a herança do Chuumon EX5: o mesmo Chuumon volta do lixo para o campo suspenso.",
    en: "End breeding and attack Omnimon with Etemon. Etemon is deleted; accept the EX5 Chuumon inherited effect: that same Chuumon returns from trash to the field suspended.",
  },
  "arena-issue-5011-agumon-search": {
    ptBR: "Encerre a criação e jogue Agumon EX9. Na seleção para a mão, escolha a cópia revelada de Agumon, a única Ver.1, mesmo com Gabumon também disponível. Ela deve ir para a mão, sem colocação sob o Digimon; ordene as duas cartas restantes no fundo do deck.",
    en: "End breeding and play EX9 Agumon. Select the revealed Agumon, the only Ver.1, for your hand even though Gabumon is also available. It must enter the hand without placing anything under the Digimon; order the two remaining cards at the bottom of the deck.",
  },
  "arena-issue-5011-gabumon-search": {
    ptBR: "Encerre a criação e jogue Gabumon EX9. Na seleção para a mão, escolha a cópia revelada de Gabumon, a única Ver.2, mesmo com Agumon também disponível. Ela deve ir para a mão, sem colocação sob o Digimon; ordene as duas cartas restantes no fundo do deck.",
    en: "End breeding and play EX9 Gabumon. Select the revealed Gabumon, the only Ver.2, for your hand even though Agumon is also available. It must enter the hand without placing anything under the Digimon; order the two remaining cards at the bottom of the deck.",
  },
  "arena-issue-5014-digital-gate-cool-boy": {
    ptBR: "Encerre a criação e ative Delay de Digital Gate Open. Use o efeito para jogar Cool Boy BT20-091: Mother D-Reaper fornece a cor branca. Com a redução de 4, o custo é 0, a memória continua em 8 e Digital Gate Open vai para o lixo.",
    en: "End breeding and activate Digital Gate Open's Delay. Use its effect to play BT20-091 Cool Boy: Mother D-Reaper supplies white. The reduction of 4 makes the cost 0, memory stays at 8 and Digital Gate Open goes to trash.",
  },
  "arena-issue-4999-mother-option-color": {
    ptBR: "Encerre a criação. Use In-Between Theater por 3. Mother D-Reaper na batalha fornece a cor branca; resolva os efeitos e a memória fica em 5.",
    en: "End breeding. Use In-Between Theater for 3. Mother D-Reaper in battle supplies white; resolve its effects and memory ends at 5.",
  },
  "arena-issue-5000-mother-marsmon-cost": {
    ptBR: "Encerre a criação e jogue Marsmon. Mother D-Reaper tem 15000 DP e habilita a redução de 5: o custo é 7 e a memória fica em 3.",
    en: "End breeding and play Marsmon. Mother D-Reaper has 15000 DP and enables the reduction of 5: pay 7 and finish at 3 memory.",
  },
  "arena-issue-5001-gomamon-vikemon-search": {
    ptBR: "Encerre a criação e jogue Gomamon EX8-018. Na primeira seleção, escolha Gomamon como DS; na segunda, selecione Vikemon LM-040 como Sea Beast. A linha Rule atribui esse tipo e a carta deve ir para a mão.",
    en: "End breeding and play EX8-018 Gomamon. First select Gomamon as DS; then select LM-040 Vikemon as the Sea Beast. Its Rule grants that trait and it must enter the hand.",
  },
  "arena-issue-5003-bacchus-pending-effects": {
    ptBR: "Encerre a criação e passe o turno. Use HeavyMetaldramon para jogar DemiDevimon do lixo. Resolva o efeito de Bacchusmon: você pode recusar suspender, mas a exclusão obrigatória ainda deve acontecer. Nenhuma jogada manual pode interromper a resolução.",
    en: "End breeding and pass the turn. Use HeavyMetaldramon to play DemiDevimon from trash. Resolve Bacchusmon: suspension may be declined, but its mandatory deletion must still happen. Manual plays cannot interrupt resolution.",
  },
  "arena-issue-5004-shine-burst-marcus": {
    ptBR: "Encerre a criação e recuse colocar Marcus sob o Digimon. Evolua ShineGreymon ST24-07 para Burst Mode BT25-104 usando a rota de custo 0. Devolva Marcus Damon & Thomas H. Norstein à mão; a Rule de Marcus habilita a rota. Na seleção opcional de Tamer, escolha Nenhuma seleção para conferir a memória em 8.",
    en: "End breeding and decline placing Marcus under the Digimon. Digivolve ST24-07 ShineGreymon into BT25-104 Burst Mode using the cost-0 route. Return Marcus Damon & Thomas H. Norstein to the hand; its Marcus Rule enables this route. Decline the optional Tamer play and check 8 memory.",
  },
  "arena-issue-5005-mococomon-forced-attack": {
    ptBR: "Encerre a criação. Evolua Hakubamon para Sanzomon e use o efeito de remover sua security. Pelo efeito de Sanzomon, jogue Cho-Hakkaimon, sem DigiXros. Resolva Cho-Hakkaimon antes de Mococomon: dê Alliance a Sanzomon e ataque. Use Mococomon para evoluir para Erlangmon. O mesmo efeito herdado não deve reaparecer após o ataque.",
    en: "End breeding. Digivolve Hakubamon into Sanzomon and use its security removal. Use Sanzomon to play Cho-Hakkaimon without DigiXros. Resolve Cho-Hakkaimon before Mococomon: give Sanzomon Alliance and attack. Use Mococomon to digivolve into Erlangmon. That inherited effect must not reappear after the attack.",
  },
  "arena-issue-5007-armor-shakkoumon-order": {
    ptBR: "Encerre a criação e ataque Omnimon suspenso com Magnamon X. Escolha a ordem entre o herdado de Shakkoumon e Armor Purge. Shakkoumon primeiro pode jogar Reppamon da pilha; Armor Purge primeiro promove Shakkoumon e remove seu efeito herdado.",
    en: "End breeding and attack suspended Omnimon with Magnamon X. Choose the order of Shakkoumon’s inherited effect and Armor Purge. Shakkoumon first can play Reppamon from the stack; Armor Purge first promotes Shakkoumon and removes its inherited effect.",
  },
  "arena-issue-5008-hand-trash-selection": {
    ptBR: "Encerre a criação e evolua WereGarurumon para HeavyMetaldramon. No pedido de descartar duas cartas, selecione duas cartas da mão e confirme. Use Visualizar mesa para testar a seleção diretamente na mão; a resposta deve descartar ambas e liberar a partida.",
    en: "End breeding and digivolve WereGarurumon into HeavyMetaldramon. Select two hand cards for the discard and confirm. Use View table to test selection directly in the hand; both selected cards must be trashed and play must resume.",
  },
  "arena-issue-5009-pipe-fox-no-level": {
    ptBR: "Encerre a criação e jogue AeroVeedramon BT22-023. Pipe Fox não tem nível nem custo de jogo; o efeito de devolver nível 4 ou menor não pode selecioná-lo. O token deve continuar na batalha.",
    en: "End breeding and play BT22-023 AeroVeedramon. Pipe Fox has neither a level nor a play cost, so the level-4-or-lower return effect cannot select it. The token must remain in battle.",
  },
  "arena-issue-5010-kapurimon-security-flip": {
    ptBR: "Promova Espimon EX11-037 da criação. Seu efeito deve virar a security do oponente para cima e o herdado de Kapurimon deve comprar uma carta: virar uma carta também aumenta a quantidade de security revelada.",
    en: "Move EX11-037 Espimon out of breeding. Its effect flips opposing security face up and Kapurimon’s inherited effect must draw one card: flipping also increases the number of face-up security cards.",
  },
  "arena-issue-4998-gammamon-breeding": {
    ptBR: "Encerre a criação sem promover Gammamon LM-016. Use The Strongest of Brothers por 3: deve ser permitido mesmo sem cartas vermelhas, pois Gammamon na criação tem Gammamon em seu texto. Resolva a busca e coloque a Option na batalha; a memória fica em 5.",
    en: "End breeding without promoting LM-016 Gammamon. Use The Strongest of Brothers for 3: it is legal without red cards because Gammamon in breeding mentions Gammamon in its text. Resolve the search and place the Option in battle; memory ends at 5.",
  },
  "arena-issue-4998-paradise-lost-breeding": {
    ptBR: "Encerre a criação sem promover Lucemon. Use Paradise Lost por 2: deve ser permitido apesar de não haver fonte roxa. Como Lucemon está na criação, ele não recebe os bônus da Main. A memória fica em 6 e Paradise Lost vai à lixeira.",
    en: "End breeding without promoting Lucemon. Use Paradise Lost for 2: it is legal despite having no purple source. Lucemon in breeding receives none of the Main bonuses. Memory ends at 6 and Paradise Lost goes to trash.",
  },
  "arena-issue-4993-inferno-divide-immunity": {
    ptBR: "Encerre a criação. Ataque com Raptordramon e evolua-o para Grademon durante o ataque. Conceda a proteção contra efeitos de Digimon ao Alphamon. Recuse evoluções posteriores e passe o turno. O bot tem Inferno Divide na lixeira e deve usá-lo pelo efeito de Cerberusmon ao atacar. Acompanhe De-Digivolve 3 no Alphamon protegido: ele deve ficar como Dorumon. Recuse bloquear para concluir o ataque.",
    en: "End breeding. Attack with Raptordramon and digivolve it into Grademon during the attack. Grant Digimon-effect immunity to Alphamon. Decline later evolutions and pass. The bot has Inferno Divide in trash and can use it through Cerberusmon’s attacking effect. Watch De-Digivolve 3 reduce protected Alphamon to Dorumon. Decline blocking to finish the attack.",
  },
  "arena-issue-4994-fly-bullet-immunity": {
    ptBR: "Encerre a criação. Ataque a segurança com Bacchusmon e Muchomon para suspendê-los; recuse evoluções opcionais. Jogue Ceresmon por 7 e recuse suspender outros Digimon: Bacchusmon recebe proteção contra efeitos de Digimon. Use Heat Viper por 5, deletando seu Ceresmon como custo e o Monodramon adversário como alvo. Passe o turno. Ao atacar, o bot pode usar Fly Bullet das fontes de BeelStarmon: Bacchusmon, o único alvo de nível mais alto, deve ser deletado apesar da proteção.",
    en: "End breeding. Attack security with Bacchusmon and Muchomon to suspend them; decline optional digivolutions. Play Ceresmon for 7 and decline suspending other Digimon: Bacchusmon gains Digimon-effect immunity. Use Heat Viper for 5, deleting your Ceresmon as its cost and the opponent’s Monodramon as its target. Pass. When attacking, the bot can use Fly Bullet from BeelStarmon’s sources: Bacchusmon, the only highest-level target, is deleted despite its protection.",
  },
  "arena-issue-4995-image-training": {
    ptBR: "Encerre a criação e ative Delay de Image Training. Escolha Gazimon para evoluir para BlackGatomon, usando a rota alternativa de custo 2 por TS/Three Musketeers. Com a redução de 2, o custo final deve ser 0 e a memória continuar em 5.",
    en: "End breeding and activate Image Training’s Delay. Choose Gazimon and BlackGatomon, then the alternate cost-2 TS/Three Musketeers route. The reduction makes the final cost 0; memory stays at 5.",
  },
  "arena-issue-4995-breathing-training": {
    ptBR: "Encerre a criação e ative Delay de Breathing Training. Evolua Gazimon para BlackGatomon pela rota alternativa de custo 2 por TS/Three Musketeers. Com a redução de 2, o custo final deve ser 0 e a memória continuar em 5.",
    en: "End breeding and activate Breathing Training’s Delay. Digivolve Gazimon into BlackGatomon using the alternate cost-2 TS/Three Musketeers route. The reduction makes the final cost 0; memory stays at 5.",
  },
  "arena-issue-4995-asuna-evolution": {
    ptBR: "Encerre a criação e recuse o efeito de início da Main de Asuna. Ative seu Main, suspenda Asuna e descarte Cerberusmon: Werewolf Mode como Option. Evolua LadyDevimon para BeelStarmon escolhendo a rota alternativa de custo 3. A redução de 1 deve resultar em custo 2 e memória 6. Recuse usar outras Options.",
    en: "End breeding and decline Asuna’s start-of-main effect. Activate her Main, suspend her and trash Cerberusmon: Werewolf Mode as an Option. Digivolve LadyDevimon into BeelStarmon through the alternate cost-3 route. The reduction makes the final cost 2 and memory 6. Decline other Option uses.",
  },
  "arena-issue-4995-pagumon-evolution": {
    ptBR: "Encerre a criação. Evolua BlackGatomon para LadyDevimon pela rota comum de custo 3. Coloque BeelStarmon da lixeira como fonte e aceite a evolução herdada de Pagumon. Escolha BeelStarmon da mão e sua rota alternativa de custo 3, reduzido em 2. O gasto total deve ser 4 e a memória ficar em 4. Recuse usar Options e outros efeitos opcionais.",
    en: "End breeding. Digivolve BlackGatomon into LadyDevimon through the ordinary cost-3 route. Place BeelStarmon from trash under it and accept Pagumon’s inherited digivolution. Choose BeelStarmon from hand and its alternate cost-3 route, reduced by 2. Total cost is 4; memory ends at 4. Decline Option uses and other optional effects.",
  },
  "arena-issue-4996-heavy-metal-breeding": {
    ptBR: "Encerre a criação e ataque com HeavyMetaldramon. No fim do ataque, escolha Breeding area e DarkLizardmon da lixeira. Ele deve entrar na criação sem pagar custo e sem ativar On Play; HeavyMetaldramon permanece na batalha. A criação ocupada não deve aparecer como destino.",
    en: "End breeding and attack with HeavyMetaldramon. At the end of the attack, choose Breeding area and DarkLizardmon from trash. It enters breeding without paying its cost or activating On Play; HeavyMetaldramon remains in battle. An occupied breeding area must not be offered.",
  },
  "arena-examon-bt23-partition-choice": {
    ptBR: "Encerre a criação e seu turno. O bot evolui para Imperialdramon Fighter Mode AD1-024 e devolve Examon BT23-047 ao fundo do deck. Examon tem as mesmas seis fontes da partida de Sara#AllForWashu, incluindo Wingdramon EX13-021 e Groundramon BT20-042. A janela de Partition deve mostrar ambas e aguardar sua escolha explícita: Usar joga as duas gratuitamente; Não usar descarta as fontes. Este cenário usa a remoção de Imperialdramon para isolar a mesma escolha de Partition que Rosemon Burst gerou na partida.",
    en: "End breeding and your turn. The bot evolves into AD1-024 Imperialdramon Fighter Mode and returns BT23-047 Examon to the bottom of the deck. Examon has the same six sources from Sara#AllForWashu's match, including EX13-021 Wingdramon and BT20-042 Groundramon. Partition must preview both and wait for your explicit choice: Use plays both for free; Don't use trashes the sources. This scenario uses Imperialdramon's removal to isolate the same Partition choice that Rosemon Burst raised in the match.",
  },
  "arena-discord-1556821976922849360-tsunomon-jupitermon": {
    ptBR: "Encerre a criação. Ataque a segurança com Ikkakumon e aceite Elecmon para adicionar sua segurança à mão: restam 4 seguranças. Aceite Tsunomon para evoluir Aegiochusmon P-213 para Jupitermon BT24-101. O custo variável de 4 deve receber a redução de 1 e cobrar apenas 3. A memória vai de 8 para 5. Jupitermon depois descarta outra segurança; isso não recalcula o custo já pago. Recuse Decode se oferecido.",
    en: "End breeding. Attack security with Ikkakumon and accept Elecmon to add your top security to hand: 4 security cards remain. Accept Tsunomon to digivolve P-213 Aegiochusmon into BT24-101 Jupitermon. The variable cost of 4 must receive the 1 reduction and charge only 3. Memory goes from 8 to 5. Jupitermon then trashes another security card; this does not recalculate the cost already paid. Decline Decode if offered.",
  },
  "arena-discord-1556821976922849360-tsunomon-jupitermon-zero": {
    ptBR: "Encerre a criação. Ataque a segurança com Ikkakumon e aceite Elecmon para adicionar sua segurança à mão: resta 1 segurança. Aceite Tsunomon para evoluir Aegiochusmon P-213 para Jupitermon BT24-101. O custo variável de 1 menos a redução de 1 deve cobrar 0. A memória permanece em 8. Depois Jupitermon descarta a última segurança e recupera 2 do deck. Recuse Decode se oferecido.",
    en: "End breeding. Attack security with Ikkakumon and accept Elecmon to add your top security to hand: 1 security card remains. Accept Tsunomon to digivolve P-213 Aegiochusmon into BT24-101 Jupitermon. The variable cost of 1 minus the 1 reduction must charge 0. Memory stays at 8. Jupitermon then trashes the last security and recovers 2 from the deck. Decline Decode if offered.",
  },
  "arena-discord-1556810241952194590-cerberusmon-alphamon": {
    ptBR: "Encerre a criação e ataque a segurança com Raptordramon. Ordene os efeitos do ataque, resolvendo Raptordramon antes de Dorumon. Aceite evoluir para Grademon por 3: durante o ataque ele recebe imunidade a efeitos de Digimon adversários. No fim do ataque, evolua para Alphamon por 4. Encerre o turno. O bot usa Inferno Divide, lado Opção do Cerberusmon BT26-056, por 3 e descarta uma carta. De-Digivolve 3 deve remover Alphamon, Grademon e Raptordramon, deixando Dorumon EX13-049 em campo, apesar da imunidade a Digimon. Recuse a proteção herdada de Grademon se oferecida. A imunidade não bloqueia efeitos de Opção.",
    en: "End breeding and attack security with Raptordramon. Order the attack effects, resolving Raptordramon before Dorumon. Accept digivolving into Grademon for 3: during the attack it gains immunity to opposing Digimon effects. At end of attack, digivolve into Alphamon for 4. End your turn. The bot uses Inferno Divide, BT26-056 Cerberusmon's Option side, for 3 and trashes a hand card. De-Digivolve 3 must remove Alphamon, Grademon and Raptordramon, leaving EX13-049 Dorumon in play despite Digimon immunity. Decline Grademon's inherited protection if offered. The immunity does not block Option effects.",
  },
  "arena-discord-1556831312008974437-jesmon-gankoomon-immunity": {
    ptBR: "Encerre seu primeiro turno. O bot evolui Coredramon em Wingdramon EX13-021 e bloqueia a suspensão de Jesmon. No seu próximo turno, com 3 de memória, jogue Gankoomon BT20-057 (custa 8). Ordene Gankoomon antes do ataque de Jesmon e aceite ambos. Evolua o Gankoomon recém-jogado em Gankoomon X BT20-059 gratuitamente. A imunidade torna o bloqueio de Wingdramon inativo: Jesmon deve oferecer um alvo e atacar antes de passar o turno, mesmo com -5 de memória. Não use o efeito de jogar token nem Alliance para manter o cenário simples.",
    en: "End your first turn. The bot evolves Coredramon into Wingdramon EX13-021 and prevents Jesmon from suspending. On your next turn, at 3 memory, play Gankoomon BT20-057 (cost 8). Order Gankoomon before Jesmon's attack and accept both effects. Evolve the newly played Gankoomon into Gankoomon X BT20-059 for free. Immunity makes Wingdramon's lock inactive: Jesmon must offer an attack target and attack before passing the turn, even at -5 memory. Decline the token play and Alliance to keep the scenario simple.",
  },
  "arena-discord-1556811259867955282-patamon-zero": {
    ptBR: "Encerre a criação. Patamon deve mostrar em particular todas as 3 seguranças em uma única modal, com 0 alvo(s) de evolução selecionável(is). Selecione um Vaccine amarelo para evoluir ou escolha Nenhum para desistir: Patamon permanece em campo e a segurança é embaralhada virada para baixo. Também pode escolher um Vaccine amarelo para evoluir grátis e depois colocar a carta da mão no fundo da segurança.",
    en: "End breeding. Patamon must privately show all 3 security cards in one modal, with 0 selectable evolution target(s). Pick a yellow Vaccine to digivolve or choose None to decline: Patamon must stay in play and all security must be shuffled face down. You may instead choose a yellow Vaccine to digivolve for free, then place the hand card at the bottom of security.",
  },
  "arena-discord-1556811259867955282-patamon-one": {
    ptBR: "Encerre a criação. Patamon deve mostrar em particular todas as 3 seguranças em uma única modal, com 1 alvo(s) de evolução selecionável(is). Selecione um Vaccine amarelo para evoluir ou escolha Nenhum para desistir: Patamon permanece em campo e a segurança é embaralhada virada para baixo. Também pode escolher um Vaccine amarelo para evoluir grátis e depois colocar a carta da mão no fundo da segurança.",
    en: "End breeding. Patamon must privately show all 3 security cards in one modal, with 1 selectable evolution target(s). Pick a yellow Vaccine to digivolve or choose None to decline: Patamon must stay in play and all security must be shuffled face down. You may instead choose a yellow Vaccine to digivolve for free, then place the hand card at the bottom of security.",
  },
  "arena-discord-1556811259867955282-patamon-multiple": {
    ptBR: "Encerre a criação. Patamon deve mostrar em particular todas as 3 seguranças em uma única modal, com 2 alvo(s) de evolução selecionável(is). Selecione um Vaccine amarelo para evoluir ou escolha Nenhum para desistir: Patamon permanece em campo e a segurança é embaralhada virada para baixo. Também pode escolher um Vaccine amarelo para evoluir grátis e depois colocar a carta da mão no fundo da segurança.",
    en: "End breeding. Patamon must privately show all 3 security cards in one modal, with 2 selectable evolution target(s). Pick a yellow Vaccine to digivolve or choose None to decline: Patamon must stay in play and all security must be shuffled face down. You may instead choose a yellow Vaccine to digivolve for free, then place the hand card at the bottom of security.",
  },
  "arena-discord-1556798361435373630-mococomon-once-per-turn": {
    ptBR: "Encerre a criação. Evolua Gokuumon EX12-043 para Sanzomon EX12-045 por 3. Aceite retirar a segurança e jogar Cho-Hakkaimon por 5, sem DigiXros. No grupo simultâneo, resolva Cho-Hakkaimon antes do Mococomon; escolha o Jupitermon sem fontes para De-Digivolve, conceda Alliance ao Sanzomon e ataque a segurança. Durante os efeitos do ataque, resolva Mococomon e evolua para Erlangmon por 1. Aceite o Token e escolha o Jupitermon sem fontes para devolver ao deck. O bot paga a proteção; Aegiochusmon desfaz a evolução. O mesmo Mococomon NÃO pode resolver novamente: Sanzomon permanece em campo, o segundo Erlangmon continua na mão e a memória termina em 1. Recuse Barrier se oferecido.",
    en: "End breeding. Digivolve EX12-043 Gokuumon into EX12-045 Sanzomon for 3. Accept removing security and playing Cho-Hakkaimon for 5, without DigiXros. In the simultaneous group, resolve Cho-Hakkaimon before Mococomon; choose the Jupitermon without sources for De-Digivolve, grant Sanzomon Alliance and attack security. During attack effects, resolve Mococomon and digivolve into Erlangmon for 1. Accept the Token and select the Jupitermon without sources to return to the deck. The bot pays for protection; Aegiochusmon undoes your evolution. The same Mococomon must NOT resolve again: Sanzomon stays in play, the second Erlangmon stays in hand and final memory is 1. Decline Barrier if offered.",
  },
  "arena-discord-1556782829713621082-digilab-breeding": {
    ptBR: "Encerre a criação sem mover Veemon EX13-017. Sem Digimon ou Tamer na área de batalha, use DigiLab P-225 por 2: o Veemon CS na criação deve liberar a exigência de cor. Compre 1 carta, coloque DigiLab na área de batalha e mantenha Veemon na criação. Memória final: 3.",
    en: "End breeding without moving EX13-017 Veemon. With no Digimon or Tamer in the battle area, use P-225 DigiLab for 2: the CS Veemon in breeding must waive its color requirements. Draw 1, place DigiLab in the battle area and keep Veemon in breeding. Final memory: 3.",
  },
  "arena-discord-1556772689731915896-fly-bullet-hand": {
    ptBR: "Encerre a criação. Gallantmon X está imune a efeitos de Digimon adversários. Use Fly Bullet (lado Opção de BeelStarmon BT25-085) da mão por 6: Gallantmon X deve ser deletado e a memória fica em 2. Recuse colocar cartas sob LadyDevimon e a Digievolução Arts.",
    en: "End breeding. Gallantmon X is immune to opposing Digimon effects. Use Fly Bullet (BT25-085 BeelStarmon’s Option side) from hand for 6: Gallantmon X must be deleted and memory ends at 2. Decline placing cards under LadyDevimon and Arts Digivolve.",
  },
  "arena-discord-1556772689731915896-fly-bullet-sources": {
    ptBR: "Encerre a criação e ataque a segurança com BeelStarmon. Aceite usar uma Opção de graça e escolha o Fly Bullet sob ela. Gallantmon X deve ser deletado apesar da imunidade a efeitos de Digimon. Recuse colocar uma carta sob BeelStarmon, desvirá-la e a Digievolução Arts. A memória continua em 8.",
    en: "End breeding and attack security with BeelStarmon. Accept using an Option for free and choose Fly Bullet under her. Gallantmon X must be deleted despite immunity to Digimon effects. Decline placing a card under BeelStarmon, unsuspending her and Arts Digivolve. Memory stays at 8.",
  },
  "arena-discord-1556772182607011971-asuna": {
    ptBR: "Encerre a criação e recuse o efeito de início do Principal de Asuna. Ative o Principal de Asuna, suspenda-a e descarte Iron Slash debaixo de LadyDevimon. Escolha LadyDevimon e BeelStarmon da lixeira. Escolha custo alternativo 3, reduzido em 1: paga 2 e fica com 6 de memória (rota normal: paga 3, fica com 5). Recuse os efeitos seguintes de BeelStarmon.",
    en: "End breeding and decline Asuna’s Start of Your Main Phase effect. Activate Asuna’s Main, suspend her and trash Iron Slash under LadyDevimon. Choose LadyDevimon and BeelStarmon from trash. Choose alternate cost 3, reduced by 1: pay 2 and keep 6 memory (ordinary route: pay 3, keep 5). Decline BeelStarmon’s following effects.",
  },
  "arena-discord-1556772182607011971-image-training": {
    ptBR: "Encerre a criação. Ative o Delay de Image Training e escolha LadyDevimon → BeelStarmon da mão. As duas rotas devem aparecer: normal 4 − 2 = 2 (memória 6), alternativa TS 3 − 2 = 1 (memória 7). Recuse os efeitos seguintes de BeelStarmon.",
    en: "End breeding. Activate Image Training’s Delay and choose LadyDevimon → BeelStarmon from hand. Both routes must appear: ordinary 4 − 2 = 2 (6 memory), alternate TS 3 − 2 = 1 (7 memory). Decline BeelStarmon’s following effects.",
  },
  "arena-discord-1556772182607011971-breathing-training": {
    ptBR: "Encerre a criação. Ative o Delay de Breathing Training e escolha LadyDevimon → BeelStarmon da mão. Escolha a rota alternativa TS: 3 − 2 = 1, memória final 7. A rota normal também está disponível: 4 − 2 = 2, memória final 6. Recuse os efeitos seguintes.",
    en: "End breeding. Activate Breathing Training’s Delay and choose LadyDevimon → BeelStarmon from hand. Choose the alternate TS route: 3 − 2 = 1, ending at 7 memory. The ordinary route is also available: 4 − 2 = 2, ending at 6 memory. Decline the following effects.",
  },
  "arena-discord-1556772182607011971-pagumon": {
    ptBR: "Encerre a criação. Use Fly Bullet (BT25-085) por 6 e coloque Chaos Triangular EX7-066 da lixeira sob LadyDevimon. Aceite a evolução herdada de Pagumon para BeelStarmon. Escolha a rota alternativa TS: 3 − 2 = 1, memória final 1 (rota normal: 4 − 2 = 2, memória final 0). Recuse os efeitos seguintes.",
    en: "End breeding. Use Fly Bullet (BT25-085) for 6 and place EX7-066 Chaos Triangular from trash under LadyDevimon. Accept Pagumon’s inherited evolution into BeelStarmon. Choose the alternate TS route: 3 − 2 = 1, ending at 1 memory (ordinary route: 4 − 2 = 2, ending at 0). Decline the following effects.",
  },
  "arena-discord-1556745762682183811-giant-slayer-execute": {
    ptBR: "Jogue Giant Slayer por 12, passando 5 de memória. Aceite devolver Cherubimon da lixeira ao fundo do deck e conceda Rush e Execute ao Giant Slayer. Aceite Execute e ataque o jogador. No fim do ataque, aceite a proteção de Giant Slayer e evolua sem custo para Chronomon: Destroy Mode da mão. Execute deve resolver a deleção uma única vez: Destroy Mode permanece em campo.",
    en: "Play Giant Slayer for 12, passing 5 memory. Accept returning Cherubimon from trash to the deck bottom and grant Giant Slayer Rush and Execute. Accept Execute and attack the player. At the end of the attack, accept Giant Slayer’s protection and digivolve for free into Chronomon: Destroy Mode from hand. Execute’s deletion resolves once: Destroy Mode stays in play.",
  },
  "arena-discord-1556745762682183811-holy-succession": {
    ptBR: "Jogue Giant Slayer por Assembly usando Yokomon, Biyomon, Kiwimon, Deramon e Chronomon: Holy Mode da lixeira, por 7. Aceite Cherubimon para conceder Execute. Recuse a evolução herdada de Yokomon ao devolver Cherubimon ao deck. Aceite Execute e ataque o jogador. No fim do ataque, evolua pela proteção de Giant Slayer para Destroy Mode da lixeira. Recuse ofertas opcionais herdadas posteriores. Não deve ocorrer uma segunda deleção de Execute nem aparecer a proteção de Holy Mode: suas duas seguranças permanecem.",
    en: "Play Giant Slayer for 7 through Assembly using Yokomon, Biyomon, Kiwimon, Deramon and Chronomon: Holy Mode from trash. Accept Cherubimon to grant Execute. Decline Yokomon’s inherited digivolution when Cherubimon returns to the deck. Accept Execute and attack the player. At the end of the attack, use Giant Slayer’s protection to digivolve into Destroy Mode from trash. Decline subsequent optional inherited offers. There must be no second Execute deletion or Holy Mode protection prompt: both security cards remain.",
  },
  "arena-discord-1556702519952932885-rosemon-burst": {
    ptBR: "Recuse a colocação sob Yoshino no início da Main. Evolua Rosemon para Burst Mode e escolha a rota Burst de custo 0. Devolva Yoshino à mão. A evolução por efeito (incluindo Arts Digivolve) não usa Burst.",
    en: "Decline Yoshino’s start-of-main placement. Digivolve Rosemon into Burst Mode using the zero-cost Burst route. Return Yoshino to hand. Effect digivolution, including Arts Digivolve, does not use Burst.",
  },
  "arena-discord-1556702519952932885-yoshino": {
    ptBR: "Recuse colocar uma carta sob Yoshino no início da Main. Jogue Sunflowmon da mão, suspenda o Monodramon adversário e aceite Yoshino. Suspenda Yoshino e evolua o Sunflowmon já no campo para Lilamon por 2.",
    en: "Decline the start-of-main placement under Yoshino. Play Sunflowmon from hand, suspend the opposing Monodramon, and accept Yoshino. Suspend Yoshino and digivolve the established Sunflowmon into Lilamon for 2.",
  },
  "arena-discord-1556702668754387095-machinedramon": {
    ptBR: "Encerre a criação. No início da Main, coloque o EX12-054 da lixeira sob Chaosdramon X; essa colocação é obrigatória e os dois materiais da mão ficam disponíveis. Ataque o jogador. Resolva Machinedramon: De-Digivolve no Digimon adversário e aceite colocar os EX12-054 e EX12-055 da mão como fontes. A primeira segurança é Gaia Force e tentará deletar Chaosdramon X. Aceite Fragment (2) e descarte duas fontes EX12-054/EX12-055, mantendo Machinedramon EX12-059 na pilha. Chaosdramon X deve sobreviver.",
    en: "End breeding. At the start of Main, place EX12-054 from trash under Chaosdramon X; this is mandatory and leaves both hand materials available. Attack the player. Resolve Machinedramon: De-Digivolve the opposing Digimon and accept placing EX12-054 and EX12-055 from hand as sources. The first security card is Gaia Force and attempts to delete Chaosdramon X. Accept Fragment (2) and trash two EX12-054/EX12-055 sources, keeping Machinedramon EX12-059 in the stack. Chaosdramon X survives.",
  },
  "arena-discord-1556703230166175754-engage": {
    ptBR: "Passe o turno com Chaosdramon ativo e aceite Engage. Escolha atacar o jogador. O ataque e suas verificações de segurança terminam antes de passar o turno. Chaosdramon suspenso ou recém-jogado sem Rush não pode atacar.",
    en: "Pass with an unsuspended Chaosdramon and accept Engage. Attack the player. The attack and security checks finish before the turn passes. A suspended or newly played Chaosdramon without Rush cannot attack.",
  },
  "arena-discord-1556688029731528804-jesmon": {
    ptBR: "Jogue Monodramon e aceite o ataque de Jesmon por Your Turn. Escolha When Attacking antes de Alliance, crie o token e use-o como aliado. Alliance e o efeito impresso devem estar na mesma escolha de ordem.",
    en: "Play Monodramon and accept Jesmon’s Your Turn attack. Order When Attacking before Alliance, create the token, and use it as the ally. Alliance and the printed effect share the ordering prompt.",
  },
  "arena-discord-1556715328610762844-alphamon": {
    ptBR: "Jogue Alphamon e coloque GrandisKuwagamon do trash como fonte. No próximo turno, Gallantmon X pode atacar Digimon, mas não o jogador, independentemente da memória. A proteção expira ao fim desse turno adversário.",
    en: "Play Alphamon and place GrandisKuwagamon from trash under it. On the next turn, Gallantmon X may attack Digimon but cannot attack the player, regardless of memory. The restriction expires at the end of that opponent turn.",
  },
  "arena-discord-1556716432111304824-dantemon": {
    ptBR: "Jogue Dantemon com Assembly usando os sete Seven Code do trash. Ligue todos os sete, aceite o ataque e resolva a segurança. Passe o turno: os sete links devem permanecer.",
    en: "Play Dantemon with Assembly using the seven Seven Code cards in trash. Link all seven, accept the attack, and resolve security. Pass the turn: all seven links remain.",
  },
  "arena-discord-1556715929973424128-block-timing": {
    ptBR: "Passe o turno e aceite Execute de Susanoomon atacando o jogador. Coloque o Monodramon adversário na segurança e recuse Raid para manter Ciel disponível para bloquear. Quando Ciel bloquear e remover Susanoomon, Genshi & Ashino não pode evoluir MarineBullmon para Amaterasumon nesse momento.",
    en: "Pass and accept Susanoomon’s Execute attack against the player. Place the opposing Monodramon in security and decline Raid so Ciel can block. When Ciel blocks and removes Susanoomon, Genshi & Ashino cannot digivolve MarineBullmon into Amaterasumon at that timing.",
  },
  "arena-discord-1556732255148179569-drasil-turn": {
    ptBR: "Jogue Dynasmon e recuse a redução de King Drasil. Depois jogue Etemon e escolha Phoenixmon: ele recebe -3000 DP e um ataque obrigatório no início da Main adversária. Quando atacar, bloqueie com Omekamon (Blocker herdado de Hagurumon). Aceite jogar Omnimon X por On Deletion: King Drasil não deve oferecer sua redução durante o turno adversário. Escolha manter Omnimon X no efeito On Play.",
    en: "Play Dynasmon and decline King Drasil’s reduction. Then play Etemon and choose Phoenixmon: it gets -3000 DP and a mandatory attack at the start of the opponent’s Main phase. When it attacks, block with Omekamon (Blocker inherited from Hagurumon). Accept its On Deletion free play of Omnimon X: King Drasil must not offer its reduction during the opponent’s turn. Keep Omnimon X when resolving its On Play effect.",
  },
  "arena-bt20-invisimon-security-count": {
    ptBR: "Relato 1556677140253249656: sua segurança começa como na partida c77fc6f3 de 05/10/2026 às 14:35 UTC: Jesmon BT20-017 para cima e 3 cartas para baixo. O contador deve mostrar 4, inclusive em telas horizontais baixas. Abra a segurança para conferir 1 carta para cima de 4. Encerre a criação e evolua MetalGreymon em Invisimon BT20-055 por 3 e escolha “2 cartas”: a primeira segurança adversária vira para cima, mas ambos os contadores continuam em 4. Confira também a inspeção adversária.",
    en: "Report 1556677140253249656: your security starts as in match c77fc6f3 on 2026-10-05 at 14:35 UTC: face-up BT20-017 Jesmon and 3 face-down cards. The count must read 4, including short landscape screens. Open security to confirm 1 face-up card out of 4. End breeding and digivolve MetalGreymon into BT20-055 Invisimon for 3 and choose “2 cards”: the opponent's first security turns face up while both counts stay at 4. Check the opponent's inspection too.",
  },
  "arena-issue-5065-lethal-attack-order": {
    ptBR: "Encerre a criação e ataque o oponente com GrapLeomon: ele não tem segurança. Os três [Ao Atacar] (GrapLeomon, Panjyamon e MetalGarurumon herdados) disparam juntos; escolha a ordem. Cada efeito deve brilhar e ganhar 1 memória, um após o outro. A tela de vitória só aparece depois do último efeito e da sua leitura, nunca por cima das animações.",
    en: "End breeding and attack the opponent with GrapLeomon: they have no security. The three [When Attacking] effects (GrapLeomon, inherited Panjyamon and MetalGarurumon) trigger together; choose their order. Each effect must glow and gain 1 memory, one after the other. The victory screen appears only after the last effect has played and been readable, never over the animations.",
  },
  "arena-issue-5065-opponent-turn-end": {
    ptBR: "Encerre a criação e o seu turno. No fim do turno do bot, Leopardmon e o MetalMamemon herdado disparam: Leopardmon descarta a carta do topo e desvira os Digimon do bot. O banner “Seu turno” e a sua compra só devem aparecer depois que esses efeitos terminarem; a carta comprada chega à mão uma vez, sem voltar ao deck.",
    en: "End breeding and your turn. At the end of the bot's turn, Leopardmon and its inherited MetalMamemon trigger: Leopardmon trashes its top card and unsuspends the bot's Digimon. The “Your turn” banner and your draw must appear only after those effects finish; the drawn card reaches your hand once, without returning to the deck.",
  },
  "arena-issue-4965-optional-raid": {
    ptBR: "Ataque a segurança com ShineGreymon. Recuse jogar um Tamer e, na seleção de Raid, escolha nenhuma carta. O ataque deve continuar contra a segurança.",
    en: "Attack security with ShineGreymon. Decline the Tamer play and choose no Raid target. The attack continues against security.",
  },
  "arena-issue-4967-assembly-with-dna": {
    ptBR: "Use Jogar em Omnimon e selecione as quatro cartas da lixeira para Assembly. WarGreymon e MetalGarurumon do campo devem permanecer. Para DNA, selecione Omnimon e toque em um dos materiais do campo.",
    en: "Use Play on Omnimon and select all four trash materials for Assembly. The field WarGreymon and MetalGarurumon remain. For DNA, select Omnimon and tap a field material.",
  },
  "arena-issue-4968-hand-trash-draw": {
    ptBR: "Evolua em Titamon BT11-057. Descarte Ogremon e Dobermon juntos: a mão fica com quatro cartas antes dos dois Draw 1. Resolva os efeitos e confira as compras.",
    en: "Digivolve into BT11-057 Titamon. Trash Ogremon and Dobermon together: four cards remain before both Draw 1 effects. Resolve the effects and verify the draws.",
  },
  "arena-issue-4969-grandgalemon-dp": {
    ptBR: "Jogue GrandGalemon e recuse suspender um Digimon. Ele deve ter 10000 DP mesmo com a recusa; o Digimon adversário permanece ativo.",
    en: "Play GrandGalemon and decline suspending a Digimon. It still has 10000 DP; the opposing Digimon remains unsuspended.",
  },
  "arena-issue-4971-imperial-effect-evolution": {
    ptBR: "Evolua Dracomon em Dracomon X e aceite evoluir em Coredramon pelo efeito. Depois, pelo adversário, aceite Imperialdramon e o retorno ao fundo do deck. A reação à evolução por efeito tem prioridade sobre a reação pendente à evolução normal, compartilhando Once Per Turn.",
    en: "Digivolve Dracomon into Dracomon X and accept its effect evolution into Coredramon. Then, on the opposing side, accept Imperialdramon and the bottom-deck return. The effect-evolution reaction resolves before the older normal-evolution reaction; both share Once Per Turn.",
  },
  "arena-issue-4972-burst-marcus-rule": {
    ptBR: "Evolua ShineGreymon em Burst Mode por 0, devolvendo Marcus Damon & Thomas H. Norstein. A Rule também o trata como Marcus Damon. Recuse jogar o Tamer novamente para conferir o retorno à mão.",
    en: "Burst Digivolve ShineGreymon for 0, returning Marcus Damon & Thomas H. Norstein. Its Rule also treats it as Marcus Damon. Decline replaying the Tamer to inspect the returned hand card.",
  },
  "arena-issue-4973-dual-option-immunity": {
    ptBR: "Passe o turno. Pelo adversário, evolua em Atratusmon para obter imunidade a Digimon. No seu próximo turno, use ShineGreymon como Opção: -6000 DP e a deleção por até 7000 DP afetam Atratusmon.",
    en: "Pass the turn. On the opposing side, digivolve into Atratusmon to gain Digimon-effect immunity. On your next turn, use ShineGreymon as an Option: -6000 DP and the 7000-DP deletion affect Atratusmon.",
  },
  "arena-issue-4974-gaiomon-reboot": {
    ptBR: "Ataque com Gaiomon e encerre o turno. Ao Reboot no turno adversário, sua Rule Greymon satisfaz a herança de MetalGreymon X: descarte uma segurança adversária.",
    en: "Attack with Gaiomon and end the turn. Its Reboot on the opposing turn and Greymon Rule name satisfy MetalGreymon X’s inheritance: trash one opposing security card.",
  },
  "arena-issue-4977-kingetemon-continuous": {
    ptBR: "Evolua KingSukamon em KingEtemon por 4. Jogue Chuumon da lixeira. A partida deve continuar; Titamon recebe -3000 DP, mas Slayerdramon ativo mantém a imunidade e seu DP.",
    en: "Digivolve KingSukamon into KingEtemon for 4 and play Chuumon from trash. The match continues; Titamon gets -3000 DP while unsuspended Slayerdramon keeps its immunity and DP.",
  },
  "arena-issue-4978-rosemon-tamer-reaction": {
    ptBR: "Ataque com Lilamon, suspenda um alvo e aceite descartar duas cartas viradas para baixo sob Yoshino & Keenan para evoluir em Rosemon. Resolva a suspensão de Rosemon e a reação do Tamer. Confira a reação Once Per Turn de Rosemon para jogar Falcomon.",
    en: "Attack with Lilamon, suspend a target, and accept trashing two face-down cards under Yoshino & Keenan to evolve into Rosemon. Resolve Rosemon’s suspension and the Tamer reaction. Verify Rosemon’s Once Per Turn reaction can play Falcomon.",
  },
  "arena-issue-4979-weather-detach": {
    ptBR: "Passe o turno. Pelo adversário, jogue MetalMamemon e pague o custo com Agumon da lixeira. Escolha Weatherdramon para retornar ao fundo. Pelo seu lado, aceite Detach e descarte Tellermon: Weatherdramon permanece.",
    en: "Pass the turn. On the opposing side, play MetalMamemon and pay its cost with Agumon from trash. Target Weatherdramon for bottom-deck return. Accept Detach and trash Tellermon on your side: Weatherdramon remains.",
  },
  "arena-issue-5015-dantemon-attack-links": {
    ptBR: "Use Seven Code PAD sobre Tellermon com as seis cartas da lixeira e evolua em Dantemon. Linke as sete cartas e aceite o ataque ao jogador. Resolva Dantemon primeiro: delete Leviamon e retorne BT21-072 do topo da segurança ao fundo do deck. Resolva os demais efeitos e a checagem de BT1-090. Os sete links devem permanecer após o ataque e a passagem de turno, sem pedido para descartar seis links.",
    en: "Use Seven Code PAD on Tellermon with the six trash cards and evolve into Dantemon. Link all seven cards and accept the attack on the player. Resolve Dantemon first: delete Leviamon and return top security BT21-072 to the deck bottom. Resolve the remaining effects and the BT1-090 security check. All seven links must remain after the attack and turn change, without a prompt to trash six links.",
  },
  "arena-issue-4981-dantemon-seven-code": {
    ptBR: "Use Seven Code PAD sobre Weathermon, pagando com seis cartas da lixeira, e evolua em Dantemon. Linke seis cartas; resolva Copipemon primeiro para linkar Tellermon como sétima. A nova reação de Dantemon participa da janela derivada; recusar a deleção não cancela o retorno de segurança com sete links. Recuse o ataque e a batalha opcional para conferir que os sete links permanecem no turno adversário.",
    en: "Use Seven Code PAD on Weathermon with six trash cards, then evolve into Dantemon. Link six cards and resolve Copipemon first to link Tellermon seventh. Dantemon’s new reaction joins the derived window; declining deletion does not cancel the security return with seven links. Decline attacking and the optional battle to verify seven links remain on the opposing turn.",
  },
  "arena-issue-4983-feedback-form": {
    ptBR: "Abra Reportar bug/Feedback no menu da partida. Confira que o formulário abre e valida o texto. Não é necessário enviar outro relato; a issue #4983 já comprova que esse envio chegou ao GitHub.",
    en: "Open Report bug/Feedback from the match menu and verify the form opens and validates its text. No duplicate report is needed; issue #4983 already confirms that submission reached GitHub.",
  },
  "arena-issue-4984-super-hacking-security": {
    ptBR: "Passe o turno. Pelo adversário, ataque a segurança com Agumon (3000 DP), que perde para Copipemon (4000 DP). Aceite Delay do Super Hacking: Copipemon recém-descartado deve aparecer para linkar em Weathermon. O Agumon reduz a batalha do Coredramon de 3000 DP registrada em produção.",
    en: "Pass the turn. On the opposing side, attack security with Agumon (3000 DP), which loses to Copipemon (4000 DP). Accept Super Hacking’s Delay: the just-trashed Copipemon is available to link to Weathermon. Agumon reduces the production battle involving a 3000-DP Coredramon.",
  },
  "arena-issue-4985-double-alliance": {
    ptBR: "Evolua em Jesmon e jogue Sistermon. Ataque a segurança e resolva os dois Alliance, suspendendo primeiro Sistermon Blanc ST12-12 e depois Sistermon Blanc BT6-082. O ataque deve continuar após a segunda escolha.",
    en: "Evolve into Jesmon and play Sistermon. Attack security and resolve both Alliance instances, suspending Sistermon Blanc ST12-12 then Sistermon Blanc BT6-082. The attack continues after the second choice.",
  },
  "arena-issue-4988-examon-tamers": {
    ptBR: "Faça DNA Digivolve em Examon usando os dois Digimon do campo. Os dois Tamers adversários devem ser suspensos mesmo sem cinco alvos. Recuse o ataque opcional para inspecionar. Ao iniciar o turno adversário, Tamers podem desvirar: o bloqueio da fase de desvirar se aplica somente aos Digimon.",
    en: "DNA Digivolve into Examon using both field Digimon. Both opposing Tamers suspend even with fewer than five targets. Decline attacking to inspect. Tamers may unsuspend when their turn starts: the next-unsuspend restriction applies only to Digimon.",
  },
  "arena-issue-4989-linked-card-labels": {
    ptBR: "Use Seven Code PAD. Na seleção de seis materiais, Mailmon aparece no grupo Cartas de Link, separado da área de batalha e da lixeira. Também linke Copipemon da mão em Medicmon e confira a descrição no log.",
    en: "Use Seven Code PAD. In the six-material selection, the Mailmon link card appears under Link cards, separately from Battle area and Trash. Also link Copipemon from hand to Medicmon and inspect the log label.",
  },
  "arena-issue-4990-end-of-turn-label": {
    ptBR: "A lista mostra somente quatro fases. Jogue um Monodramon: a memória passa de +1 para -1. No fim do turno, recuse Engage de WarGrowlmon e aceite Alphamon: devolva as duas fontes X Antibody para ganhar 2 memórias. A principal continua em +1, no mesmo turno. Jogue o segundo Monodramon e recuse Engage novamente: há outro fim de turno, e só então o turno passa ao adversário, sem uma quinta fase ou banner de End Phase.",
    en: "The phase list contains only four phases. Play one Monodramon: memory moves from +1 to -1. At end of turn, decline WarGrowlmon’s Engage and accept Alphamon: return both X Antibody sources for 2 memory. Main continues at +1 in the same turn. Play the second Monodramon and decline Engage again: end-of-turn timing occurs again, and only then does the turn pass, without a fifth phase or End Phase banner.",
  },
  "arena-issue-4964-burst-own-tamer": {
    ptBR: "Encerre a criação e evolua ShineGreymon em Burst Mode por 5. Sem Marcus no campo, a UI não deve oferecer Burst Digivolve por 0. Aceite ativar o efeito: a seleção deve mostrar o [Main] da Opção, com -15000 DP e jogo gratuito de um Tamer da sua mão. A mão adversária não deve aparecer.",
    en: "End breeding and evolve ShineGreymon into Burst Mode for 5. Without Marcus in play, the UI must not offer Burst Digivolve for 0. Activate the effect: selection must show the Option [Main], with -15000 DP and free play of a Tamer from your hand. The opponent's hand must not appear.",
  },
  "arena-issue-4962-seiten-ex12-assembly": {
    ptBR: "Encerre a criação e jogue SeitenGokuumon com Assembly usando EX12-015, EX12-029 e EX12-056 da lixeira. Pague 7 e confira as três fontes. Alternativamente, ative Hakubamon para jogar com Assembly por 5.",
    en: "End breeding and play SeitenGokuumon with Assembly using EX12-015, EX12-029 and EX12-056 from trash. Pay 7 and keep all three sources. Alternatively, activate Hakubamon to play with Assembly for 5.",
  },
  "arena-issue-4961-takato-raid-attack": {
    ptBR: "Encerre a criação e evolua WarGrowlmon em Gallantmon. Aceite suspender Takato e depois atacar: Gallantmon ganha Raid e declara o ataque. O Digimon já estava em campo no turno anterior.",
    en: "End breeding and evolve WarGrowlmon into Gallantmon. Accept suspending Takato, then accept the attack. Gallantmon gains Raid and attacks; this host was already on the field last turn.",
  },
  "arena-issue-4955-minervamon-dedigivolve": {
    ptBR: "Encerre a criação e evolua Minervamon BT24-041. Recuse o jogo opcional: De-Digivolve ainda remove a carta do topo adversário, revelando Greymon.",
    en: "End breeding and evolve into BT24-041 Minervamon. Decline the optional play: De-Digivolve still removes the opponent's top card, revealing Greymon.",
  },
  "arena-issue-4953-nokia-warp-reduction": {
    ptBR: "Encerre a criação e ative o efeito da mão de BT22-013 ou BT22-026 sobre Agumon ou Gabumon. Aceite suspender Nokia: pague 5 em vez de 6. Recuse a evolução adicional para conferir a memória.",
    en: "End breeding and activate BT22-013 or BT22-026 from hand over Agumon or Gabumon. Suspend Nokia: pay 5 instead of 6. Decline further evolution to inspect memory.",
  },
  "arena-issue-4952-kotemon-piercing": {
    ptBR: "Mova Kotemon da criação e escolha Jupitermon para receber Piercing e +3000 DP. Ataque o Digimon adversário suspenso: após vencer a batalha, Piercing permite checar segurança.",
    en: "Move Kotemon from breeding and select Jupitermon for Piercing and +3000 DP. Attack the suspended opposing Digimon: winning the battle allows a security check via Piercing.",
  },
  "arena-issue-4951-okuwamon-inherited": {
    ptBR: "Encerre a criação. Grandiskuwagamon deve ter Piercing por Okuwamon P-075. Jogue Monodramon, depois ataque MetalTyrannomon suspenso: vença a batalha e faça uma checagem de segurança por Piercing. Encerre o turno: as ações concluem sem repetir efeitos de Okuwamon ou travar a partida.",
    en: "End breeding. Grandiskuwagamon has Piercing from P-075 Okuwamon. Play Monodramon, then attack suspended MetalTyrannomon: win the battle and perform one security check through Piercing. End the turn: actions complete without repeated Okuwamon effects or a freeze.",
  },
  "arena-issue-4950-davis-ken-dna-sources": {
    ptBR: "Encerre a criação e faça DNA de ExVeemon e Stingmon em Paildramon. Aceite suspender Davis & Ken para remover as três fontes adversárias.",
    en: "End breeding and DNA digivolve ExVeemon and Stingmon into Paildramon. Suspend Davis & Ken to trash the opposing Digimon's three sources.",
  },
  "arena-issue-4949-paladin-battle-comparison": {
    ptBR: "Encerre a criação e jogue Paladin Mode usando os seis materiais da lixeira. Recuse devolver fontes e escolha Medicmon para a batalha. O vencedor usa a quantidade de fontes; Paladin não ganha Ice Clad. Medicmon ainda pode usar Barrier.",
    en: "End breeding and play Paladin Mode with the six trash materials. Decline returning sources and choose Medicmon for the battle. Sources decide the winner; Paladin gains no Ice Clad. Medicmon can still use Barrier.",
  },
  "arena-issue-4946-slayerdramon-assembly-order": {
    ptBR: "Encerre a criação e jogue Slayerdramon com Assembly. Selecione os materiais em ordem inversa: Dracomon, Coredramon, Wingdramon. A pilha deve ficar Dracomon na base, Coredramon no meio e Wingdramon logo abaixo de Slayerdramon.",
    en: "End breeding and play Slayerdramon with Assembly. Select in reverse order: Dracomon, Coredramon, Wingdramon. Dracomon is bottommost, Coredramon above it, Wingdramon directly below Slayerdramon.",
  },
  "arena-issue-4942-jesmon-double-alliance": {
    ptBR: "Encerre a criação e evolua SaviorHuckmon em Jesmon. Resolva o jogo da evolução e ataque. Ative as duas instâncias de Alliance, suspendendo uma Sistermon em cada uma. O efeito When Attacking também pode jogar Sistermon Ciel da mão.",
    en: "End breeding and evolve SaviorHuckmon into Jesmon. Resolve the evolution play and attack. Use each Alliance instance with a different Sistermon. When Attacking can also play Sistermon Ciel from hand.",
  },
  "arena-issue-4941-candlemon-top-inheritance": {
    ptBR: "Encerre a criação e passe o turno. Candlemon está no topo: ao ser removido por efeito adversário, não pode ativar seu efeito herdado nem gastar segurança.",
    en: "End breeding and pass the turn. Candlemon is the top card: removal by an opposing effect must not activate its inherited prevention or spend security.",
  },
  "arena-issue-4940-lilithmon-delete-cost": {
    ptBR: "Encerre a criação e faça Link de Tellermon em Medicmon. Use a deleção de Tellermon em Lilithmon; na prevenção dela, escolha Medicmon e aceite Detach. Medicmon sobrevive, o custo de Lilithmon falha e Lilithmon é deletada.",
    en: "End breeding and link Tellermon to Medicmon. Use Tellermon to delete Lilithmon; for her prevention choose Medicmon and accept Detach. Medicmon survives, so Lilithmon's deletion cost fails and Lilithmon is deleted.",
  },
  "arena-issue-4948-sukamon-blast-legality": {
    ptBR: "Encerre a criação e jogue KingSukamon. Descarte Chuumon e transforme Dragon Mode em Sukamon. Ataque com Monodramon: Paladin Mode não pode fazer Blast Digivolve no Sukamon branco; a outra rota ACE continua disponível.",
    en: "End breeding and play KingSukamon. Trash Chuumon and turn Dragon Mode into Sukamon. Attack with Monodramon: Paladin Mode cannot Blast Digivolve onto white Sukamon; the other legal ACE route remains available.",
  },
  "arena-issue-4947-physical-training-reaction": {
    ptBR: "Encerre a criação e ative Delay do Physical Training para evoluir Reppamon em MagnaAngemon. O Dragon Mode adversário com Tamer pode reagir e evoluir gratuitamente em Fighter Mode.",
    en: "End breeding and use Physical Training's Delay to evolve Reppamon into MagnaAngemon. Opposing Dragon Mode with a Tamer may react and evolve into Fighter Mode for free.",
  },
  "arena-issue-4957-gankoomon-dual-sources": {
    ptBR: "Encerre a criação e ataque com Gankoomon. Ao suspender, escolha Blanc ou Noir das fontes para usar como Opção. Recuse Arts Digivolve: Blanc reduz DP; Noir remove cartas do topo adversário. Reinicie para testar a outra carta.",
    en: "End breeding and attack with Gankoomon. When it suspends, choose Blanc or Noir from its sources to use as an Option. Decline Arts Digivolve: Blanc reduces DP; Noir removes opposing top cards. Reset to test the other card.",
  },
  "arena-issue-4910-diarbbitmon-dual-option": {
    ptBR: "Encerre a criação e evolua em Diarbbitmon, aplicando a imunidade nele. Jogue Rosemon para passar o turno. A Opção Blanc adversária ainda reduz seu DP: imunidade a efeitos de Digimon não impede Opções DUAL.",
    en: "End breeding and evolve into Diarbbitmon, granting its immunity to itself. Play Rosemon to pass the turn. Opposing Blanc used as an Option still reduces its DP; immunity to Digimon effects does not prevent DUAL Options.",
  },
  "arena-issue-4914-blanc-dual-option": {
    ptBR: "#4914: Encerre a criação, evolua em Diarbbitmon e escolha ele para receber imunidade a efeitos de Digimon. Aceite +3000 DP e a batalha contra Sistermon Blanc BT6-082: delete ela, deixando exatamente um Digimon adversário e Takumi como fonte de cor branca. Jogue Rosemon para passar o turno. No turno adversário, use Blanc EX13-065 como Opção, escolha Diarbbitmon como alvo e recuse Arts Digivolve. Ele perde 3000 DP apesar da imunidade a Digimon, pois o efeito é de Opção. A redução é de 3000 por Digimon do controlador de Blanc. Reinicie para testar que Blanc não pode ser jogada como Digimon.",
    en: "#4914: End breeding, evolve into Diarbbitmon and grant it immunity to Digimon effects. Accept +3000 DP and the battle against BT6-082 Sistermon Blanc: delete it, leaving exactly one opposing Digimon and Takumi as a white color source. Play Rosemon to pass the turn. On the opposing turn, use EX13-065 Blanc as an Option, target Diarbbitmon and decline Arts Digivolve. It loses 3000 DP despite Digimon immunity because this is an Option effect. The reduction is 3000 per Digimon controlled by Blanc's user. Reset to check that Blanc cannot be played as a Digimon.",
  },
  "arena-issue-4905-magnamon-merciful-colors": {
    ptBR: "#4905: Encerre a criação e jogue Veemon P-117. Evolua nele Magnamon ST17-13 pela condição alternativa de Veemon e escolha Merciful Mode. As fontes concedem seis cores distintas: remova as seis fontes de uma vez e devolva Merciful sem fontes à mão.",
    en: "#4905: End breeding and play P-117 Veemon. Evolve ST17-13 Magnamon over it using the alternate Veemon requirement and choose Merciful Mode. Its sources grant six distinct colors: trash all six sources together and return the source-free Merciful to hand.",
  },
  "arena-issue-4939-demon-lord-free-reduction": {
    ptBR: "A fase principal começa automaticamente: Gate deleta seus Digimon. Aceite Delay para jogar Barbamon das fontes. A carta sob Gate é jogada sem custo de memória. Recuse qualquer custo opcional de redução para preservar recursos. As regras permitem ativar efeitos de custo mesmo num jogo gratuito (Q4784).",
    en: "Main begins automatically: Gate deletes your Digimon. Accept Delay to play Barbamon from its sources. Play the card under Gate without memory cost. Decline optional reducer costs to preserve resources. Rules allow would-be-played effects even for a free play (Q4784).",
  },
  "arena-issue-4954-lordknightmon-inspector": {
    ptBR: "Abra LordKnightmon AD1-018 da mão e confira a descrição com a imagem: redução de 5 com Knightmon/Lucemon no nome; a reação All Turns usa Knightmon/Lucemon no texto. O cenário também permite jogar por 6.",
    en: "Inspect AD1-018 LordKnightmon in hand against its image: reduce by 5 with Knightmon/Lucemon in a Digimon's name; All Turns checks Knightmon/Lucemon in text. The board also permits playing it for 6.",
  },
  "arena-issue-4958-card-images": {
    ptBR: "Confira as imagens do campo e da mão. Para simular a falha, bloqueie /assets/card-images/* no navegador e recarregue. As cartas usam a imagem oficial alternativa; a identidade oculta da mão adversária continua oculta.",
    en: "Inspect field and hand images. To reproduce the outage, block /assets/card-images/* in the browser and reload. Cards load from the independent official image fallback; hidden opponent hand identities remain hidden.",
  },
  "arena-issue-4943-browser-translation": {
    ptBR: "Ative a tradução automática do navegador para espanhol. Encerre a criação, evolua Agumon em Greymon e reinicie o combate. Textos e controles devem continuar atualizando, sem tela branca.",
    en: "Enable browser automatic Spanish translation. End breeding, evolve Agumon into Greymon and reset combat. Text and controls continue updating without a blank page.",
  },
  "arena-ex12-thetismon-mistymon-deletion": {
    ptBR: "Encerre a criação e ataque a segurança com Thetismon EX12-030. Resolva a compra de Jellymon LM-002, depois TeslaJellymon EX12-027 (compre e descarte 1 carta); recuse o custo de Puyoyomon RB1-002, se oferecido. Ao revelar Mistymon, o efeito da Mistymon em campo dá -6000 DP à Thetismon (7000 → 1000) e a deleta, pois restam 2 seguranças. Isso ocorre antes da batalha: Jamming protege contra batalha de segurança, não contra deleção por efeito. Reprodução da partida bf500886, 04/10/2026 às 17:08 UTC, relato 1556410279602946198.",
    en: "End breeding and attack security with EX12-030 Thetismon. Resolve LM-002 Jellymon's draw, then EX12-027 TeslaJellymon (draw and trash 1 card); decline RB1-002 Puyoyomon's cost if offered. When Mistymon is revealed, the field Mistymon's effect gives Thetismon -6000 DP (7000 → 1000) and deletes it because 2 security cards remain. This happens before battle: Jamming protects against security battle deletion, not effect deletion. Reproduces match bf500886 on 2026-10-04 at 17:08 UTC, report 1556410279602946198.",
  },
  "arena-ex12-thetismon-jamming-control": {
    ptBR: "Encerre a criação e ataque a segurança com Thetismon EX12-030. Resolva a compra de Jellymon LM-002, depois TeslaJellymon EX12-027 (compre e descarte 1 carta); recuse o custo de Puyoyomon RB1-002, se oferecido. Mistymon é revelada da segurança, mas não há Mistymon em campo para ativar o efeito de remoção da segurança. Thetismon sobrevive à batalha de 7000 contra 7000 graças a Jamming, com suas 3 fontes; o Digimon de segurança vai para a lixeira. Compare com o cenário de deleção por Mistymon.",
    en: "End breeding and attack security with EX12-030 Thetismon. Resolve LM-002 Jellymon's draw, then EX12-027 TeslaJellymon (draw and trash 1 card); decline RB1-002 Puyoyomon's cost if offered. Mistymon is revealed from security, but there is no field Mistymon to trigger the security-removal effect. Thetismon survives the 7000 vs 7000 battle thanks to Jamming, keeping all 3 sources; the security Digimon goes to trash. Compare with the Mistymon deletion scenario.",
  },
  "arena-issue-4938-ruli-optional-reduction": {
    en: "#4938: Digivolve SymbareAngoramon into Lamortmon. Decline Ruli: pay 3 and leave her unsuspended. Accept instead: suspend her and pay 2.",
    ptBR: "#4938: Evolua SymbareAngoramon em Lamortmon. Recuse Ruli: pague 3 e deixe-a ativa. Ao aceitar, suspenda-a e pague 2.",
  },
  "arena-issue-4937-grademon-dual-immunity": {
    en: "#4937: Attack with Raptordramon and evolve into EX13 Grademon during the attack. Play Rosemon to pass 6 memory. On the opponent's turn, decline the Sistermon play and Arts Digivolve when using Blanc or Noir as an Option: Blanc reduces Grademon's DP by 3000; Noir removes its top card. Its Digimon-effect immunity remains active and does not stop either Option.",
    ptBR: "#4937: Ataque com Raptordramon e evolua em Grademon EX13 durante o ataque. Jogue Rosemon para passar 6 de memória. No turno adversário, recuse jogar Sistermon e Arts Digivolve ao usar Blanc ou Noir como Opção: Blanc reduz 3000 DP de Grademon; Noir remove sua carta do topo. A imunidade a efeitos de Digimon continua ativa e permite ambas as Opções.",
  },
  "arena-issue-4937-bt20-grademon-dual-immunity": {
    en: "#4937: Attack with Raptordramon and evolve into BT20 Grademon during the attack; decline its breeding-area play. Play Rosemon to pass 6 memory. The opponent can use Blanc's DP reduction or Noir's De-Digivolve as an Option despite Grademon's active Digimon-effect immunity. Decline the Sistermon play and Arts Digivolve.",
    ptBR: "#4937: Ataque com Raptordramon e evolua em Grademon BT20 durante o ataque; recuse jogar na criação. Jogue Rosemon para passar 6 de memória. O adversário pode usar a redução de DP de Blanc ou De-Digivolve de Noir como Opção, mesmo com a imunidade de Grademon ativa. Recuse jogar Sistermon e Arts Digivolve.",
  },
  "arena-issue-4936-examon-repeat-barrier": {
    en: "#4936: DNA digivolve Titamon and Plesiomon into Examon. Target the suspended Alphamon for both the attack and the immediate battle. Decline the free Dragon play/use. Accept inherited Barrier for the first battle: the ordinary attack battle must offer Barrier again. You may accept it again or decline and lose Alphamon.",
    ptBR: "#4936: Faça DNA de Titamon e Plesiomon em Examon. Escolha Alphamon suspenso como alvo do ataque e da batalha imediata. Recuse jogar/usar Dragão sem custo. Aceite Barrier herdado na primeira batalha: a batalha normal do ataque deve oferecer Barrier novamente. Você pode aceitar outra vez ou recusar e perder Alphamon.",
  },
  "arena-issue-4935-blanc-arts-guard": {
    en: "#4935: Use Blanc as an Option, decline the Sistermon play, then Arts Digivolve the existing Blanc. Pass the turn. Use Gaia Force on Titamon: Guard may delete awakened Blanc to protect Titamon. Gaia Force targeting awakened Blanc itself cannot be stopped by its own Guard; battle deletion also does not offer Guard.",
    ptBR: "#4935: Use Blanc como Opção, recuse jogar Sistermon e faça Arts Digivolve da Blanc em campo. Passe o turno. Use Gaia Force em Titamon: Guard pode deletar Blanc desperta para proteger Titamon. Gaia Force na própria Blanc desperta não pode ser impedido pelo Guard dela; deleção por batalha também não oferece Guard.",
  },
  "arena-issue-4933-lilamon-host": {
    en: "#4933: Use Crimson Blaze. Lilamon protects only its Rosemon host; the other TS Digimon is deleted and no protection cost is paid for it.",
    ptBR: "#4933: Use Crimson Blaze. Lilamon protege apenas seu Rosemon; o outro Digimon TS é deletado, sem pagar custo de proteção por ele.",
  },
  "arena-issue-4932-kentaurosmon-security": {
    en: "#4932: Digivolve Lilamon into Kentaurosmon. Pay the security cost, decline security placement: both opposing Digimon lose 7000 DP with six or fewer total security cards.",
    ptBR: "#4932: Evolua Lilamon em Kentaurosmon. Pague o custo de segurança e recuse colocar Digimon na segurança: ambos os adversários perdem 7000 DP com até seis seguranças no total.",
  },
  "arena-issue-4931-lordknightmon-reduction": {
    en: "#4931: Play AD1-018 while Knightmon is in your battle area: the cost is reduced by 5. Cards in trash do not satisfy this condition.",
    ptBR: "#4931: Jogue AD1-018 com Knightmon em seu campo: o custo diminui em 5. Cartas na lixeira não satisfazem essa condição.",
  },
  "arena-issue-4930-venusmon-opponent-cost": {
    en: "#4930: Use Crimson Blaze. Venusmon may place your source-free Digimon at the bottom of YOUR security to protect its other TS Digimon.",
    ptBR: "#4930: Use Crimson Blaze. Venusmon pode colocar seu Digimon sem fontes no fundo da SUA segurança para proteger o outro Digimon TS dela.",
  },
  "arena-issue-4929-noir-single-target": {
    en: "#4929: Use Noir as an Option and decline the Sistermon play. Choose one opponent once: all three De-Digivolve 1 applications stay on that same Digimon.",
    ptBR: "#4929: Use Noir como Opção e recuse jogar Sistermon. Escolha um adversário uma única vez: as três aplicações de De-Digivolve 1 atingem esse mesmo Digimon.",
  },
  "arena-issue-4926-battle-priority": {
    en: "#4926: Attack the suspended Knightmon with Examon. Groundramon trashes security; Examon deletes suspended Rie before she can activate her deletion watcher.",
    ptBR: "#4926: Ataque Knightmon suspenso com Examon. Groundramon descarta segurança; Examon deleta Rie suspensa antes que ela ative seu efeito de deleção.",
  },
  "arena-bt15-092-kari-security": {
    en: "Use Revelation of Light (BT15-092) with Kari Kamiya BT15-084 and BT8-090 in play. Select Gatomon from security or select no cards. After either choice, Revelation of Light must become your top security card, never go to trash. Reset to test the other choice.",
    ptBR: "Use Revelation of Light (BT15-092) com Kari Kamiya BT15-084 e BT8-090 em campo. Escolha Gatomon na segurança ou não selecione nenhuma carta. Nos dois casos, Revelation of Light deve virar a carta do topo da sua segurança, sem ir para o trash. Reinicie para testar a outra escolha.",
  },
  "arena-issue-4924-revelation-security-faces": {
    en: "#4924: Use Revelation of Light. You see the fronts of all three security cards privately; only the two yellow Digimon are selectable.",
    ptBR: "#4924: Use Revelation of Light. Você vê as frentes das três seguranças de forma privada; apenas os dois Digimon amarelos podem ser escolhidos.",
  },
  "arena-issue-4923-seiten-assembly": {
    en: "#4923: Play SeitenGokuumon using Gokuumon, Sagomon and Cho-Hakkaimon from trash for Assembly: pay 7 and place all three beneath it.",
    ptBR: "#4923: Jogue SeitenGokuumon usando Gokuumon, Sagomon e Cho-Hakkaimon da lixeira em Assembly: pague 7 e coloque os três sob ele.",
  },
  "arena-issue-4921-homeros-late-arrival": {
    en: "#4921: End your turn. Accept Kanan using Jupitermon as an Option, then Arts Digivolve and play Homeros. Homeros enters after the end-turn boundary and does not trigger retroactively.",
    ptBR: "#4921: Encerre o turno. Aceite Kanan usando Jupitermon como Opção, faça Arts Digivolve e jogue Homeros. Ele entra depois do início do fim de turno e não ativa retroativamente.",
  },
  "arena-issue-4919-seventh-lightning-cost": {
    en: "#4919: Digivolve into Leviamon X. Accept Seventh Lightning: it returns to deck bottom before deleting the level 6, even though there is no level 4.",
    ptBR: "#4919: Evolua para Leviamon X. Aceite Seventh Lightning: ela volta ao fundo do deck antes de deletar o nível 6, mesmo sem um nível 4 no campo.",
  },
  "arena-issue-4918-lordknightmon-player-attack": {
    en: "#4918: Use Rie to digivolve into LordKnightmon. Its evolution attack offers only the opponent player, even with a suspended opposing Digimon.",
    ptBR: "#4918: Use Rie para evoluir em LordKnightmon. O ataque de evolução permite apenas o jogador adversário, mesmo havendo um Digimon adversário suspenso.",
  },
  "arena-issue-4917-biting-crush-placement": {
    en: "#4917: Use Biting Crush and discard Leviamon. With no opposing deletion target, the cost can still be paid and Biting Crush stays in the battle area.",
    ptBR: "#4917: Use Biting Crush e descarte Leviamon. Mesmo sem alvo adversário para deletar, o custo pode ser pago e Biting Crush permanece no campo.",
  },
  "arena-issue-4916-raid-target-block": {
    en: "#4916: End your turn and let the opponent play Craniamon. On your next turn attack with Gallantmon and accept Raid: the Craniamon already targeted cannot block itself.",
    ptBR: "#4916: Encerre o turno e deixe o oponente jogar Craniamon. No próximo turno ataque com Gallantmon e aceite Raid: Craniamon já é o alvo e não pode bloquear a si mesmo.",
  },
  "arena-issue-4915-junomon-homeros": {
    en: "#4915: Attack the opponent security. Junomon may play Homeros from hand. The printed limit is one card with play cost 8 or less.",
    ptBR: "#4915: Ataque a segurança adversária. Junomon pode jogar Homeros da mão. O limite impresso é uma carta com custo de jogo até 8.",
  },
  "arena-issue-4913-cool-boy-proto-form": {
    en: "#4913: Use Proto Form to digivolve MetalSeadramon into GigaSeadramon. Cool Boy may suspend, gain 1 memory and draw: both Digimon are level 6.",
    ptBR: "#4913: Use Proto Form para evoluir MetalSeadramon em GigaSeadramon. Cool Boy pode suspender, ganhar 1 memória e comprar: ambos são nível 6.",
  },
  "arena-issue-4912-deep-savers-battle": {
    en: "#4912: Digivolve into Examon, paying 5 from 4 memory, then accept battling MetalSeadramon. Its owner now has 1 memory, so face-up Deep Savers prevents battle deletion. Decline Examon playing a card afterwards to isolate the battle.",
    ptBR: "#4912: Evolua em Examon pagando 5 a partir de 4 memórias e aceite batalhar MetalSeadramon. Seu dono agora tem 1 memória, então Deep Savers aberta impede a deleção em batalha. Recuse jogar uma carta depois com Examon para isolar a batalha.",
  },
  "arena-issue-4911-mervamon-multiple-checks": {
    en: "#4911: Attack with each Mervamon. For each attack, use the other Iliad allies for both Alliance choices: three security checks finish. Alliance prompts require your own response, not the bot.",
    ptBR: "#4911: Ataque com cada Mervamon. Em cada ataque, use os outros aliados Iliad nas duas escolhas de Alliance: três checagens terminam. As escolhas de Alliance exigem sua resposta, não a do bot.",
  },
  "arena-issue-4907-takato-end-turn": {
    en: "#4907: End your turn and resolve Kurata deleting Gallantmon. Decode can play Guilmon; decline Guilmon's hand-discard effect. Takato may decline the whole placement cost; if paid, the warp itself remains optional.",
    ptBR: "#4907: Encerre o turno e resolva Kurata deletando Gallantmon. Decode pode jogar Guilmon; recuse o descarte de mão do Guilmon. Takato pode recusar todo o custo de colocação; se pago, a evolução continua opcional.",
  },
  "arena-bt11-hades-force-target-selection": {
    ptBR: "Entre na Principal e use Hades Force (custo 5 com X Antibody nas fontes). WarGreymon tem custo 12. A seleção deve oferecer Thomas (3), Gaomon (3) e Hexeblaumon (12) juntos. Escolha apenas Hexeblaumon e confirme: os dois alvos baratos permanecem. Também é possível escolher os dois baratos ou nenhuma carta. Depois, recuse o ataque opcional para inspecionar o resultado. Baseado na partida c8383f3a, 15:02 UTC, bug 1556322403456520223.",
    en: "Enter Main and use Hades Force (cost 5 with X Antibody in the sources). WarGreymon's play cost is 12. The target selection must offer Thomas (3), Gaomon (3), and Hexeblaumon (12) together. Select only Hexeblaumon and confirm: both cheap targets remain. You can also select both cheap targets or no cards. Then decline the optional attack to inspect the result. Based on match c8383f3a at 15:02 UTC, bug 1556322403456520223.",
  },
  "arena-5292-hawkmon-craniamon-priority": {
    ptBR: "Encerre a criação e passe o turno sem jogar cartas. A DNA herdada de P-119 Hawkmon deve ser oferecida antes do efeito do Craniamon adversário. Aceite e una Flamedramon e Kuwagamon em BT12-028 Paildramon por custo 0. Depois Craniamon pode escolher o Paildramon recém-formado para atacar. Escolha atacar o jogador: ele faz 1 checagem de segurança. Craniamon começa suspenso para não bloquear. Recusar a DNA também deve oferecer Hawkmon primeiro, seguido por Craniamon, mantendo os dois materiais em campo.",
    en: "End breeding and pass your turn without playing cards. P-119 Hawkmon's inherited DNA must be offered before the opposing Craniamon effect. Accept and merge Flamedramon and Kuwagamon into BT12-028 Paildramon for cost 0. Craniamon can then choose the newly formed Paildramon to attack. Choose the player as the attack target: it performs 1 security check. Craniamon starts suspended so it cannot block. Declining DNA must also offer Hawkmon first, followed by Craniamon, leaving both materials in play.",
  },
  "arena-bt22-gabumon-eot-dna": {
    ptBR: "Entre na Principal e ative o efeito [Mão] [Principal] de MetalGarurumon BT22-026 (custo 6). Resolva Nokia EX13-067 primeiro: suspenda-a, jogue Agumon BT22-008 da lixeira e recupere Omnimon AD1-025. Depois escolha evoluir Agumon em WarGreymon pelo efeito de MetalGarurumon. No fim automático do turno, aceite a DNA herdada de Gabumon (ou Agumon) e escolha AD1-025: os dois níveis 6 devem formar Omnimon por custo 0, preservando as quatro fontes. Reprodução da partida 8ca7da4d, bug 1556299408700735548.",
    en: "Enter Main and activate BT22-026 MetalGarurumon's [Hand] [Main] effect (cost 6). Resolve EX13-067 Nokia first: suspend her, play BT22-008 Agumon from trash and recover AD1-025 Omnimon. Then choose to digivolve Agumon into WarGreymon with MetalGarurumon's effect. At the automatic end of turn, accept Gabumon's (or Agumon's) inherited DNA and choose AD1-025: the two level 6 Digimon must form Omnimon for cost 0, keeping all four sources. Reproduces match 8ca7da4d, bug 1556299408700735548.",
  },
  "arena-bt23-examon-partition-return": {
    ptBR: "Entre na Principal e evolua AD1-011 Paildramon para AD1-024 Imperialdramon: Fighter Mode da mão (custo 5). O efeito obrigatório devolve o Examon BT23-047 do bot ao fundo do deck. Aceite Partition se estiver controlando esse lado: Wingdramon EX13-021 e Groundramon EX13-041 entram juntos sem pagar custo; Dracomon e Coredramon vão para a lixeira. Recuse os efeitos opcionais [Todos os Turnos] de Imperialdramon para não remover os Digimon recém-jogados. Reprodução da partida 232fad0a, às 20:21 UTC, bug 1556039867106983976.",
    en: "Enter Main and digivolve AD1-011 Paildramon into AD1-024 Imperialdramon: Fighter Mode from hand (cost 5). Its mandatory effect returns the bot's BT23-047 Examon to deck bottom. Accept Partition if controlling that side: EX13-021 Wingdramon and EX13-041 Groundramon enter together for free; Dracomon and Coredramon go to trash. Decline Imperialdramon's optional [All Turns] effects to avoid removing the newly played Digimon. Reproduces match 232fad0a at 20:21 UTC, bug 1556039867106983976.",
  },
  "arena-bt23-examon-piercing-end-turn": {
    ptBR: "Entre na Principal e encerre o turno. Aceite a DNA herdada de Dracomon e escolha Examon BT23-047 para juntar Groundramon e Wingdramon. Aceite o ataque de [Quando Evolui] e escolha o Agumon do bot. Aceite desuspender por Wingdramon. Agumon é deletado em batalha; Groundramon descarta 1 segurança e Piercing com Segurança +1 faz 2 checagens. A segurança do bot cai de 5 para 2. No log original, Wormmon voltou à mão antes da batalha, então aquele ataque não podia ativar Piercing.",
    en: "Enter Main and end your turn. Accept Dracomon's inherited DNA and choose BT23-047 Examon to combine Groundramon and Wingdramon. Accept its [When Digivolving] attack and target the bot's Agumon. Accept Wingdramon's unsuspend. Agumon is deleted in battle; Groundramon trashes 1 security and Piercing with Security A. +1 performs 2 checks. The bot's security falls from 5 to 2. In the original log, Wormmon returned to hand before battle, so that attack could not trigger Piercing.",
  },
  "arena-bt24-sonic-shot-decline-link": {
    ptBR: "Encerre a fase de criação e depois o turno sem usar Sonic Shot da mão. No [Fim do Seu Turno] de Dan Yuki & Kanan Yuki, aceite suspender o Tamer e escolha BT24-095 Sonic Shot para usar sem pagar o custo. O bot não tem Digimon nem Tamer em campo. Na escolha do destinatário do Link, clique em Nenhuma seleção. Sonic Shot deve ir para o lixo, nenhum dos seus dois Digimon recebe o Link e o efeito de Dan & Kanan continua para a escolha do atacante.",
    en: "End the breeding phase, then end your turn without using Sonic Shot from hand. On Dan Yuki & Kanan Yuki's [End of Your Turn], accept suspending the Tamer and choose BT24-095 Sonic Shot to use without paying its cost. The bot has no Digimon or Tamers in play. At the Link recipient selection, choose No Selection. Sonic Shot must go to the trash, neither of your two Digimon receives the Link, and Dan & Kanan's effect continues to the attacker selection.",
  },
  "arena-field-grouping-dense": {
    ptBR: "Mesa de fim de partida: 21 permanentes por lado, 12 fontes no Vulcanusmon, 2 links e 8 cartas salvas no Watchmaker. Cada lado conserva as 50 cartas do deck principal. Role as duas fileiras, inspecione as fontes e gire a tela.",
    en: "Late-game board: 21 permanents per side, 12 Vulcanusmon sources, 2 links and 8 saved Watchmaker cards. Each side conserves its 50-card main deck. Scroll both lanes, inspect sources and rotate the screen.",
  },
  "arena-match-timer": {
    ptBR: "Timer real: 300 s iniciais por jogador, +60 s no seu turno e +30 s no turno do oponente, até 300 s. Encerre a criação e jogue contra o bot. Só conta o tempo de quem precisa responder; efeitos e animações pausam a contagem. Fique sem agir para testar a derrota por timeout. Reiniciar combate restaura os relógios.",
    en: "Live timer: 300 sec initially per player, +60 sec on your turn and +30 sec on the opponent's, capped at 300 sec. End breeding and play against the bot. Only the required responder's time counts; effects and animations pause it. Stop acting to test defeat by timeout. Reset combat restores the clocks.",
  },
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
  "arena-p240-arcturusmon-ordered-placement": {
    ptBR: "Evolua sua EX12-014 Canoweissmon (sobre Gammamon) para a P-240 Arcturusmon da mão pela evolução alternativa: custo 4. No [Quando Evolui], o Digimon do bot perde suas fontes pelo ＜De-Digivolve 3＞. Aceite o efeito e escolha os dois cards da lixeira: Gammamon e BetelGammamon. O jogo deve pedir a ordem deles, com o título em português. A carta 1 vira a fonte do fundo, e as duas ficam abaixo de Gammamon e Canoweissmon.",
    en: "Digivolve your EX12-014 Canoweissmon (over Gammamon) into P-240 Arcturusmon from hand with the alternate route: cost 4. On [When Digivolving], ＜De-Digivolve 3＞ strips the bot Digimon's sources. Accept the effect and choose both trash cards: Gammamon and BetelGammamon. The game must ask for their order. Card 1 becomes the bottom source, and both sit below Gammamon and Canoweissmon.",
  },
  "arena-ex12-proximamon-dual-siriusmon": {
    ptBR: "Você tem dois Digimon com a linha do Gammamon nas fontes: Siriusmon (sobre Gammamon, BetelGammamon e Canoweissmon) e Canoweissmon (sobre Gammamon e BetelGammamon). Evolua a EX12-018 Siriusmon para EX12-077 Proximamon pela rota alternativa (custo 5). No efeito de Quando Evolui que joga ou usa um card das fontes, a lista deve mostrar os cards das fontes dos dois Digimon, incluindo Siriusmon. Escolha Siriusmon: ela é usada como Option (Planet Punch) e deleta o Groundramon do bot (maior DP). Depois você pode recusar ou aceitar a Arts Digivolve da Canoweissmon para Siriusmon; recusando, Siriusmon vai para a lixeira.",
    en: "You have two Digimon with the Gammamon line in their sources: Siriusmon (over Gammamon, BetelGammamon, and Canoweissmon) and Canoweissmon (over Gammamon and BetelGammamon). Digivolve EX12-018 Siriusmon into EX12-077 Proximamon with the alternate route (cost 5). In the When Digivolving play-or-use effect, the list must show the source cards of both Digimon, including Siriusmon. Choose Siriusmon: it is used as an Option (Planet Punch) and deletes the bot's Groundramon (highest DP). Then you may decline or accept Arts Digivolve from Canoweissmon into Siriusmon; if you decline, Siriusmon goes to trash.",
  },
  "arena-ex12-siriusmon-group-placement": {
    ptBR: "Evolua sua EX12-014 Canoweissmon (sobre Gammamon) para a EX12-018 Siriusmon da mão. Aceite o [Quando Evolui] e escolha os dois cards: BetelGammamon da mão e WezenGammamon da lixeira. O jogo deve perguntar topo ou fundo uma única vez para os dois cards e depois pedir a ordem deles. Os dois entram juntos na mesma ponta das fontes, na ordem escolhida. Siriusmon fica com 4 cards de evolução e a Siriusmon do bot cai de 12000 para 4000 DP.",
    en: "Digivolve your EX12-014 Canoweissmon (over Gammamon) into EX12-018 Siriusmon from hand. Accept its [When Digivolving] and choose both cards: BetelGammamon from hand and WezenGammamon from trash. The game must ask top or bottom only once for both cards, then ask for their order. Both cards enter the same end of the sources together, in the chosen order. Siriusmon ends with 4 digivolution cards, and the bot's Siriusmon drops from 12000 to 4000 DP.",
  },
  "arena-ex12-virus-busters-effect-attack": {
    ptBR: "Encerre seu turno. A fonte EX12-001 Nyaromon oferece a DNA: aceite e junte BetelGammamon com Garurumon em EX12-032 WereGarurumon, depois aceite atacar. A escolha de ordem deve listar juntos o Virus Busters EX12-069 da segurança, o [Quando Evolui] e o [Ao Atacar] de WereGarurumon e o [Ao Atacar] herdado de Garurumon. Resolva o Virus Busters por último: ele ainda deve oferecer jogar um Digimon [VB] do mesmo nível.",
    en: "End your turn. The EX12-001 Nyaromon source offers its DNA: accept, combine BetelGammamon and Garurumon into EX12-032 WereGarurumon, then accept the attack. The order prompt must list together EX12-069 Virus Busters from security, WereGarurumon's [When Digivolving] and [When Attacking], and Garurumon's inherited [When Attacking]. Resolve Virus Busters last: it must still offer to play a same-level [VB] Digimon.",
  },
  "arena-github-5316-shoutmon-rush": {
    ptBR: "Entre na Principal. Jogue BT15-012 Shoutmon X2 com DigiXros usando BT21-021 OmniShoutmon e BT19-051 AtlurBallistamon da mão. Suspenda o Digimon do bot. O custo é 3 (DigiXros −1 por material), deixando 7 de memória. X2 não pode atacar neste turno: seu tipo é Enhancement, sem Xros Heart, exigido pelo Rush herdado de OmniShoutmon. Reprodução #5316; resultado esperado pelas regras.",
    en: "Enter Main. Play BT15-012 Shoutmon X2 by DigiXros using BT21-021 OmniShoutmon and BT19-051 AtlurBallistamon from hand. Suspend the bot's Digimon. Pay 3 (DigiXros −1 per material), leaving 7 memory. X2 cannot attack this turn: it is Enhancement and lacks Xros Heart, which OmniShoutmon's inherited Rush requires. Report #5316; this result follows the printed rules.",
  },
  "arena-github-5316-shoutmon-rush-control": {
    ptBR: "Entre na Principal. Jogue BT21-027 Shoutmon DX por DigiXros com BT21-021 OmniShoutmon e AD1-013 ZeigGreymon. Resolva os efeitos de entrada e ataque a segurança. DX tem Xros Heart, portanto recebe Rush herdado e pode atacar no turno em que foi jogado. Controle positivo de #5316.",
    en: "Enter Main. Play BT21-027 Shoutmon DX by DigiXros using BT21-021 OmniShoutmon and AD1-013 ZeigGreymon. Resolve its entry effects and attack security. DX has Xros Heart, so it inherits Rush and can attack the turn it was played. Positive control for #5316.",
  },
  "arena-github-5317-shoutmon-material-save-evolved": {
    ptBR: "No início do turno, aceite eliminar BT15-012 Shoutmon X2 para ganhar 1 de memória (3 → 4). OmniShoutmon e AtlurBallistamon vão à lixeira junto com X2: não haverá Material Save. Seus nomes Shoutmon/Ballistamon valem somente para DigiXros, não para Material Save (Q3105). Os efeitos principais [Ao Ser Eliminado] das fontes não ativam. Entre na Principal para inspecionar a lixeira e Taiki sem fontes. Reprodução #5317; resultado esperado pelas regras.",
    en: "At turn start, accept deleting BT15-012 Shoutmon X2 to gain 1 memory (3 → 4). OmniShoutmon and AtlurBallistamon go to trash with X2; Material Save is not offered. Their Shoutmon/Ballistamon names apply only to DigiXros, not Material Save (Q3105). The sources' main [On Deletion] effects do not activate. Enter Main to inspect trash and Taiki's empty sources. Report #5317; this result follows the printed rules.",
  },
  "arena-github-5317-shoutmon-material-save-printed": {
    ptBR: "No início do turno, aceite eliminar BT15-012 Shoutmon X2. Aceite Material Save 2 e escolha BT10-008 Shoutmon e BT10-049 Ballistamon para colocar sob Taiki. X2 vai à lixeira, os dois materiais ficam sob Taiki e a memória passa de 3 para 4. Entre na Principal e confira as fontes. Controle positivo de #5317: os nomes impressos qualificam os materiais.",
    en: "At turn start, accept deleting BT15-012 Shoutmon X2. Accept Material Save 2 and choose BT10-008 Shoutmon and BT10-049 Ballistamon to place under Taiki. X2 goes to trash, both materials remain under Taiki, and memory rises from 3 to 4. Enter Main and inspect the sources. Positive control for #5317: the printed names qualify these materials.",
  },
  "arena-bt10-taiki-x7-xros-heart": {
    ptBR: "Entre na Fase Principal e jogue BT10-087 Taiki Kudo da mão. Na revelação de BT21-083, P-224, AD1-006 e BT8-097, escolha P-224 Kotone Amano para a mão. AD1-006 Shoutmon X7 deve ser colocado sob o Taiki jogado, mesmo sendo o único Digimon Xros Heart revelado. Ordene BT21-083 e BT8-097 para o fundo. A memória termina em 2. Reprodução da partida 802ba658, bug 1555932180322975924.",
    en: "Enter Main and play BT10-087 Taiki Kudo from hand. From the revealed BT21-083, P-224, AD1-006 and BT8-097, choose P-224 Kotone Amano for your hand. AD1-006 Shoutmon X7 must go under the played Taiki, even though it is the only revealed Xros Heart Digimon. Order BT21-083 and BT8-097 to the bottom. Memory ends at 2. Reproduces match 802ba658, bug 1555932180322975924.",
  },
  "arena-bt10-taiki-reveal-under-self": {
    ptBR: "Entre na Fase Principal com Kotone e dois Taikis já em campo. Jogue o BT10-087 Taiki Kudo da mão. Dos quatro cards revelados (BT21-021, BT21-083, AD1-006 e AD1-013), adicione AD1-006 Shoutmon X7 à mão e escolha AD1-013 ShootingStarmon para colocar sob o Taiki. ShootingStarmon deve entrar automaticamente sob o Taiki recém-jogado, sem escolha de Tamer. Os três Tamers antigos ficam sem novas fontes. Ordene BT21-021 e BT21-083 para o fundo; a memória termina em 1. Reprodução da partida 9b9ea6cc, bug 1556107827456774256.",
    en: "Enter Main with Kotone and two Taikis already in play. Play BT10-087 Taiki Kudo from hand. From the four revealed cards (BT21-021, BT21-083, AD1-006 and AD1-013), add AD1-006 Shoutmon X7 to hand and choose AD1-013 ShootingStarmon to place under Taiki. ShootingStarmon must automatically go under the newly played Taiki, with no Tamer destination choice. The three older Tamers receive no new cards. Order BT21-021 and BT21-083 to the bottom; memory ends at 1. Reproduces match 9b9ea6cc, bug 1556107827456774256.",
  },
  "arena-ad1-adventure-tamers-security": {
    ptBR: "Encerre a fase de criação. Ataque a segurança do bot com o primeiro Shoutmon BT19-008: AD1-019 Matt Ishida & T.K. Takaishi deve ser jogado no campo do bot pelo [Segurança], sem pagar custo. Espere o ataque terminar. Ataque a segurança com o segundo Shoutmon: AD1-022 Izzy Izumi & Tai Kamiya também deve entrar no campo do bot. A segurança fica vazia, os dois Tamers ficam desuspensos no campo, nenhum vai para a lixeira e a memória continua em 3. Não faça um terceiro ataque.",
    en: "End breeding. Attack the bot's security with the first BT19-008 Shoutmon: AD1-019 Matt Ishida & T.K. Takaishi must be played onto the bot's field by [Security], without paying its cost. Wait for the attack to end. Attack security with the second Shoutmon: AD1-022 Izzy Izumi & Tai Kamiya must also enter the bot's field. Security is empty, both Tamers remain unsuspended in play, neither goes to trash, and memory stays at 3. Do not make a third attack.",
  },
  "arena-lm067-gundramon-free-option": {
    ptBR: "Entre na Fase Principal com 5 de memória. Evolua BT10-064 Gogmamon para LM-067 Gundramon da mão (custo 4). Na revelação, escolha P-180 Bind Red Trigger: seu uso deve manter a memória em 1. P-180 descarta o topo da segurança do bot; escolha Gundramon para colocá-la como fonte do fundo. Ordene as outras 5 cartas para o fundo do deck. A memória deve continuar em 1, sem passar o turno.",
    en: "Enter Main with 5 memory. Digivolve BT10-064 Gogmamon into LM-067 Gundramon from hand (cost 4). Choose P-180 Bind Red Trigger from the reveal: using it must keep memory at 1. P-180 trashes the bot's top security; choose Gundramon to place it as the bottom source. Order the other 5 cards to the deck bottom. Memory must remain at 1 without passing the turn.",
  },
  "arena-diarbbitmon-dual-option-immunity": {
    ptBR: "Evolua EX12-051 para EX12-052 Diarbbitmon da mão. Escolha o próprio Diarbbitmon para a imunidade e +3000 DP; batalhe o primeiro BT26-061 do bot. Encerre o turno e aceite Vortex contra o segundo BT26-061: Diarbbitmon deve ficar suspenso. Os dois ST23-13 dão ao bot 5 de memória na Principal. Ele usa ST23-09 Atratusmon como Option (Eclipse Impact), escolhendo Diarbbitmon. Apesar da imunidade a efeitos de Digimon, ele deve ir ao fundo do deck: Eclipse Impact é efeito de Option. Recuse Arts Digivolve, se oferecido.",
    en: "Digivolve EX12-051 into EX12-052 Diarbbitmon from hand. Choose Diarbbitmon for immunity and +3000 DP; battle the bot's first BT26-061. End the turn and accept Vortex against the second BT26-061: Diarbbitmon should be suspended. The two ST23-13 Tamers give the bot 5 memory in Main. It uses ST23-09 Atratusmon as an Option (Eclipse Impact), choosing Diarbbitmon. Despite Digimon-effect immunity, it must go to the deck bottom: Eclipse Impact is an Option effect. Decline Arts Digivolve if offered.",
  },
  "arena-taiki-digixros-any-tamer-hand": {
    ptBR: "Recuse a colocação da Kotone no início da fase principal. Jogue AD1-006 Shoutmon X7 da mão com DigiXros. Suspenda BT10-087 Taiki e selecione os 5 materiais sob Taiki e Kotone. A jogada deve ser aceita: Taiki suspende, X7 fica com os 5 materiais e a memória cai de 10 para 7. Kotone continua ativa.",
    en: "Decline Kotone's placement at the start of the main phase. Play AD1-006 Shoutmon X7 from hand with DigiXros. Suspend BT10-087 Taiki and select all 5 materials under Taiki and Kotone. The play succeeds: Taiki suspends, X7 has all 5 materials, and memory falls from 10 to 7. Kotone stays unsuspended.",
  },
  "arena-kotone-digixros-any-tamer-effect": {
    ptBR: "Recuse a colocação da Kotone no início da fase principal. Ative o [Principal] da P-224 Kotone, aceite suspendê-la e escolha BT19-014 Shoutmon EX6 sob Taiki. Na seleção de DigiXros, suspenda Taiki e escolha OmniShoutmon sob Kotone e ZeigGreymon sob Taiki. Não deve haver escolha de um único Tamer. EX6 entra com os 2 materiais, ambos os Tamers suspendem e a memória cai de 10 para 4.",
    en: "Decline Kotone's placement at the start of the main phase. Activate P-224 Kotone's [Main], accept suspending her, and choose BT19-014 Shoutmon EX6 under Taiki. For DigiXros, suspend Taiki and select OmniShoutmon under Kotone and ZeigGreymon under Taiki. There must be no single-Tamer choice. EX6 enters with both materials, both Tamers suspend, and memory falls from 10 to 4.",
  },
  "arena-mervamon-trash-digixros": {
    ptBR: "Encerre a fase de criação e jogue BT11-086 Mervamon da mão. A seleção de DigiXros deve oferecer Mervamon e BT11-076 Ignitemon da lixeira sem exigir um Tamer. Escolha apenas 1 deles; Agumon não é material válido. Confirme o DigiXros e recuse o [Ao Jogar] da Mervamon, se oferecido. Ela entra com 1 material e a memória cai de 10 para 2. Reinicie para testar a outra opção.",
    en: "End breeding and play BT11-086 Mervamon from hand. DigiXros must offer Mervamon and BT11-076 Ignitemon from trash without requiring a Tamer. Choose just 1; Agumon is not a valid material. Confirm DigiXros and decline Mervamon's [On Play], if offered. She enters with 1 material and memory falls from 10 to 2. Reset to test the other option.",
  },
  "arena-bt5-koromon-attack-draw": {
    ptBR: "Encerre a fase de criação e ataque a segurança com Greymon BT12-062. Koromon BT5-001 está na base da pilha: seu efeito herdado deve brilhar e comprar 1 carta antes do escudo quebrar e Gaogamon EX4-017 ser revelado. A compra da fase de compra ocorre antes desse ataque e é separada da compra do Koromon.",
    en: "End breeding and attack security with BT12-062 Greymon. BT5-001 Koromon is at the bottom of its stack: its inherited effect must glow and draw 1 card before the shield breaks and EX4-017 Gaogamon is revealed. The draw-phase card arrives before this attack and is separate from Koromon's draw.",
  },
  "arena-bt21-metalgreymon-one-target-two-colors": {
    ptBR: "Encerre a criação. Com duas cores distintas de Tamers, jogue MetalGreymon BT21-061 e escolha um dos dois Digimon do bot: somente ele perde uma carta do topo. Depois evolua o Greymon BT21-057 para o segundo MetalGreymon e escolha o outro alvo: uma nova ativação pode escolher outro Digimon. Recuse o ataque opcional. Cada ativação oferece um único alvo.",
    en: "End breeding. With two distinct Tamer colors, play BT21-061 MetalGreymon and choose either opposing Digimon: only that Digimon loses one top card. Then digivolve BT21-057 Greymon into the second MetalGreymon and choose the other opponent: a separate activation may choose a different Digimon. Decline the optional attack. Each activation offers one target choice.",
  },
  "arena-bt21-metalgreymon-one-target-four-colors": {
    ptBR: "Encerre a criação. Os Tamers têm quatro cores distintas. Jogue MetalGreymon BT21-061 e escolha um Digimon do bot: ele sofre De-Digivolve 1 duas vezes e fica em GeoGreymon de nível 4; o outro permanece intacto. Não deve aparecer uma segunda seleção de alvo. Recuse os efeitos opcionais dos Tamers. Depois evolua Greymon para o segundo MetalGreymon e escolha o outro Digimon: esta nova ativação também aplica as duas etapas ao único alvo escolhido. Recuse o ataque opcional.",
    en: "End breeding. Your Tamers have four distinct colors. Play BT21-061 MetalGreymon and choose one opposing Digimon: De-Digivolve 1 applies twice to it, leaving level 4 GeoGreymon; the other Digimon stays intact. No second target picker should appear. Decline optional Tamer effects. Then digivolve Greymon into the second MetalGreymon and choose the other opponent: this new activation also applies both processes to its one chosen target. Decline the optional attack.",
  },
  "arena-ex7-seventh-fascination-turn": {
    ptBR: "Jogue EX7-072 Seventh Fascination e encerre seu turno. O Digimon do bot deve permanecer em campo, sem pedido de deleção nesse momento. O efeito concedido só deve ativar no fim do turno do bot.",
    en: "Play EX7-072 Seventh Fascination and end your turn. The bot's Digimon should stay in play, with no deletion prompt yet. The granted effect should activate only at the end of the bot's turn.",
  },
  "arena-ex11-vortex-effect-attack-block": {
    ptBR: 'Encerre a criação. 1) Jogue ST15-16 (o Tamer BT3-095 libera a cor preta) e dê ao Digimon do bot "[Start of Your Main Phase] This Digimon attacks.". 2) Encerre o turno. No início da fase principal do bot, o ataque forçado suspende o atacante e o Vortexdramon EX11-074 pergunta "Battle": recuse. 3) Bloqueie com o Vortexdramon. O efeito [All Turns] deve disparar de novo: aceite desvirar e aceite a batalha; o Digimon do bot é deletado.',
    en: 'End breeding. 1) Play ST15-16 (the BT3-095 Tamer meets the black requirement) and give the bot\'s Digimon "[Start of Your Main Phase] This Digimon attacks.". 2) End your turn. At the bot\'s Main start, the forced attack suspends the attacker and EX11-074 Vortexdramon asks "Battle": decline. 3) Block with Vortexdramon. Its [All Turns] effect must trigger again: accept the unsuspend and the battle; the bot\'s Digimon is deleted.',
  },
  "arena-st15-trident-arm-forced-attack-text": {
    ptBR: 'Encerre a criação. Com seu Digimon preto BT12-061 em campo, jogue ST15-16 Trident Arm: aplique De-Digivolve 3 e conceda o ataque forçado ao Digimon do bot. Encerre seu turno. No início da Fase Principal do bot, o aviso do efeito deve mostrar "[Start of Your Main Phase] This Digimon attacks.", não um texto genérico nem o texto do próprio Digimon, e o Digimon do bot deve atacar.',
    en: "End breeding. With your black BT12-061 Digimon in play, play ST15-16 Trident Arm: apply De-Digivolve 3 and grant the forced attack to the bot's Digimon. End your turn. At the start of the bot's Main phase, the effect notice must read \"[Start of Your Main Phase] This Digimon attacks.\", not generic text or the Digimon's own text, and the bot's Digimon must attack.",
  },
  "arena-bt17-dexdoru-exact-name": {
    ptBR: "Encerre a criação. 1) Jogue BT5-106 Demonic Disaster e delete o DexDoruGreymon BT17-067 do campo. O DexDoruGreymon da lixeira não deve oferecer seu efeito [Trash]: o nome exigido é exatamente [DoruGreymon]. 2) Jogue o segundo Demonic Disaster e delete o DoruGreymon BT16-061. Agora o efeito [Trash] deve ser oferecido; aceite: o DoruGreymon evolui para DexDoruGreymon da lixeira sem pagar o custo e não é deletado.",
    en: "End breeding. 1) Play BT5-106 Demonic Disaster and delete the BT17-067 DexDoruGreymon on the field. The DexDoruGreymon in trash must not offer its [Trash] effect: the required name is exactly [DoruGreymon]. 2) Play the second Demonic Disaster and delete the BT16-061 DoruGreymon. Now the [Trash] effect must be offered; accept: DoruGreymon digivolves into the DexDoruGreymon from trash without paying the cost and is not deleted.",
  },
  "arena-open-bugs-veemon-decline": {
    ptBR: "Na entrada da fase principal, ordene Davis e Veemon e recuse Veemon. A carta Free deve ficar na mão; não há custo de descarte, compra nem memória de Veemon.",
    en: "At Main entry, order Davis and Veemon and decline Veemon. Keep the Free card in hand; Veemon must not trash, draw or gain memory.",
  },
  "arena-open-bugs-lavorvomon-search": {
    ptBR: "Jogue Lavorvomon. Adicione Volcanicdramon e Hina Kurihara à mão e ordene as duas cartas restantes no fundo do deck.",
    en: "Play Lavorvomon. Add Volcanicdramon and Hina Kurihara to hand and order the two remaining cards at the bottom of the deck.",
  },
  "arena-open-bugs-giromon-leave": {
    ptBR: "Jogue Millenniumon P-220 e escolha excluir seu host. O herdado de Giromon deve remover uma segurança do oponente antes da exclusão.",
    en: "Play P-220 Millenniumon and choose to delete your host. Giromon must trash one opposing security before the deletion.",
  },
  "arena-open-bugs-koromon-evolution": {
    ptBR: "Evolua Greymon para Agumon BT12-034 por 0. Koromon sob Greymon concede o nome exigido; a evolução deve manter as fontes e comprar uma carta.",
    en: "Digivolve Greymon into BT12-034 Agumon for zero. Koromon beneath Greymon grants the required name; preserve the sources and draw one card.",
  },
  "arena-open-bugs-mega-knight-materials": {
    ptBR: "Jogue Millenniumon P-220 e exclua seu MetalGarurumon. Use um Delay; escolha um WarGreymon da mão e depois Omnimon. Omnimon e o Rookie não podem ser materiais. O segundo Delay deve permanecer.",
    en: "Play P-220 Millenniumon and delete your MetalGarurumon. Use one Delay, choose a WarGreymon from hand, then Omnimon. Omnimon and the Rookie must not be material candidates. The other Delay remains.",
  },
  "arena-open-bugs-marcus-attack": {
    ptBR: "Clique ou arraste Marcus para atacar a segurança. Burst Mode o trata como Digimon com 12000 DP e Rush; recuse efeitos opcionais que evoluem ou jogam cartas.",
    en: "Click or drag Marcus to attack security. Burst Mode treats him as a 12000-DP Digimon with Rush; decline optional effects that evolve or play cards.",
  },
  "arena-open-bugs-larva-immunity": {
    ptBR: "Jogue LordKnightmon e dê imunidade a Larva. Passe o turno; pelo jogador 2, jogue Ebonwumon e resolva seu efeito. Larva deve sobreviver com Lucemon presente, inclusive após a imunidade expirar.",
    en: "Play LordKnightmon and grant immunity to Larva. Pass the turn; as player 2, play Ebonwumon and resolve its effect. Larva must survive with Lucemon present, including after immunity expires.",
  },
  "arena-ex2-takato-blitz-order": {
    ptBR: "Encerre a criação e evolua WarGrowlmon EX2-010 para Gallantmon EX13-015. A memória passa de 1 para -2. Escolha o efeito concedido [When Digivolving] Blitz antes do efeito impresso de Gallantmon, resolva e aceite Blitz. Declare o ataque à segurança. O efeito impresso deve resolver depois da declaração e antes da checagem: descarte 1 segurança e cheque outra. Gallantmon permanece suspenso, com WarGrowlmon na pilha. Reinicie para testar recusar Blitz ou resolver o efeito impresso primeiro.",
    en: "End breeding and digivolve EX2-010 WarGrowlmon into EX13-015 Gallantmon. Memory moves from 1 to -2. Choose the granted [When Digivolving] Blitz before Gallantmon's printed effect, resolve it and accept Blitz. Declare an attack on security. The printed effect must resolve after declaration and before the check: trash 1 security and check another. Gallantmon stays suspended with WarGrowlmon in its stack. Reset to test declining Blitz or resolving the printed effect first.",
  },
  "arena-ex9-metal-mamemon-face-down-deletion": {
    ptBR: "Encerre a fase de criação. Jogue EX12-076 Susanoomon com Assembly, escolhendo os 8 materiais diferentes da lixeira. O [Ao Jogar] dá -9000 DP ao MetalMamemon EX9-018 do bot e ele morre. Seu Kokuwamon EX13-046 estava virado para baixo: o herdado [Ao Ser Deletado] não deve ativar nem oferecer De-Digivolve. Susanoomon permanece no campo com os 8 materiais; as duas cartas vão viradas para cima para a lixeira do bot, visíveis para ambos os jogadores.",
    en: "End breeding. Play EX12-076 Susanoomon with Assembly, selecting all 8 different materials from trash. Its [On Play] gives the bot's EX9-018 MetalMamemon -9000 DP and deletes it. Its EX13-046 Kokuwamon was face down: the inherited [On Deletion] must not trigger or offer De-Digivolve. Susanoomon stays on the field with all 8 materials; both cards enter the bot's trash face up, visible to both players.",
  },
  "arena-ex13-sampson-face-down-sources": {
    ptBR: "Você e o bot controlam EX13-071 Richard Sampson com 1 carta virada para baixo embaixo. No início da sua Fase Principal, aceite colocar a carta do topo do deck virada para baixo embaixo do seu Sampson. Abra a pilha do seu Sampson: as 2 cartas embaixo mostram o nome e a marca “Virada para baixo”, e tocar nelas amplia a carta. Abra a pilha do Sampson do bot: a carta embaixo continua como “Carta virada para baixo”, sem nome e sem ampliar.",
    en: "You and the bot each control EX13-071 Richard Sampson with 1 face-down card under it. At the start of your Main phase, accept placing your deck's top card face down under your Sampson. Open your Sampson's stack: both cards under it show their name with a “Face down” mark, and tapping one enlarges it. Open the bot's Sampson stack: its card stays “Face-down card”, with no name and no enlarge.",
  },
  "arena-preset-order-no-clicks": {
    ptBR: "Encerre a criação e ataque a segurança com Examon EX13-045. Na ordem dos efeitos [Ao Atacar], marque Sim para ＜Raid＞ e EX2-040, e Não para BT6-071 e BT9-006. Sem clicar em cada efeito, toque em Resolver: tudo resolve sem outro clique. O ataque muda para o Agumon BT1-013, as 2 cartas do topo do deck vão para a lixeira e sua mão não muda.",
    en: "End breeding and attack security with EX13-045 Examon. In the [When Attacking] order, set Yes for ＜Raid＞ and EX2-040, and No for BT6-071 and BT9-006. Without clicking each effect, press Resolve: everything resolves with no further click. The attack switches to the BT1-013 Agumon, the top 2 deck cards go to trash, and your hand is unchanged.",
  },
  "arena-raid-after-dedigivolve": {
    ptBR: "Encerre a criação e ataque o jogador com Omnimon AD1-025. Resolva primeiro a exclusão herdada de WarGreymon AD1-004, escolhendo BT22-052. O oponente usa Guard de Gladimon EX13-052 e escolhe Omnimon para De-Digivolve 1. WarGreymon fica no topo com 14000 DP e Raid, mas o Raid pendente de Omnimon não pode ativar: o ataque continua no jogador e BT22-052 sobrevive. Controle: reinicie e resolva Raid primeiro; a mudança de alvo já realizada permanece após De-Digivolve.",
    en: "End breeding and attack the player with AD1-025 Omnimon. Resolve AD1-004 WarGreymon's inherited deletion first, choosing BT22-052. The opponent uses EX13-052 Gladimon's Guard and chooses Omnimon for De-Digivolve 1. WarGreymon becomes the top card with 14000 DP and Raid, but Omnimon's pending Raid cannot activate: the attack continues at the player and BT22-052 survives. Control: restart and resolve Raid first; the completed target switch remains after De-Digivolve.",
  },
  "arena-raid-optional-preset": {
    ptBR: "Encerre a criação e ataque a segurança com Examon EX13-045. Na ordem dos efeitos [Ao Atacar], ＜Raid＞ deve mostrar Sim/Não/Perguntar, não Obrigatório. Marque Não: o ataque continua na segurança, sem pedido de Raid, e o Agumon BT1-013 do bot sobrevive. Reinicie e marque Sim: o alvo muda para o Agumon sem pedido extra, e ele é deletado na batalha.",
    en: "End breeding and attack security with EX13-045 Examon. In the [When Attacking] order, ＜Raid＞ must show Yes/No/Ask, not Mandatory. Set No: the attack stays on security with no Raid prompt, and the bot's BT1-013 Agumon survives. Reset and set Yes: the target switches to the Agumon with no extra prompt, and it is deleted in battle.",
  },
  "arena-bt22-vademon-return-tamer": {
    ptBR: "Encerre a criação e ataque a segurança com Vademon BT22-061. Aceite pagar seu BlitzGreymon ACE EX9-013 virado para baixo e escolha o Tai Kamiya BT1-085 do bot (custo 4). Tai volta à mão do bot e a fonte vai para sua lixeira. A memória continua 3: a fonte virada para baixo não tem Overflow.",
    en: "End breeding and attack security with BT22-061 Vademon. Accept trashing your face-down EX9-013 BlitzGreymon ACE and choose the bot’s cost-4 BT1-085 Tai Kamiya. Tai returns to the bot’s hand and the source goes to your trash. Memory stays at 3: the face-down source has no Overflow.",
  },
  "arena-bt22-vademon-return-ace": {
    ptBR: "Encerre a criação e ataque o MetalGreymon ACE BT14-014 suspenso do bot com Vademon BT22-061. Aceite pagar sua fonte EX9-013 virada para baixo e devolver o alvo. O ataque termina sem checar a segurança, a memória sobe de 3 para 6 pelo Overflow -3 do ACE do bot, e sua fonte não cobra Overflow.",
    en: "End breeding and attack the bot’s suspended BT14-014 MetalGreymon ACE with BT22-061 Vademon. Accept trashing your face-down EX9-013 source and returning the target. The attack ends without security checks, memory rises from 3 to 6 from the bot’s ACE Overflow -3, and your source charges no Overflow.",
  },
  "arena-bt22-shinmonzaemon-own-security": {
    ptBR: "Encerre a criação e evolua Monzaemon BT22-038 para ShinMonzaemon BT22-076 (custo 3 após a redução Ver.1). Aceite descartar a fonte EX9-013 virada para baixo e escolha seu Muchomon BT1-013. Muchomon fica no topo da sua segurança virado para baixo, sua fonte Monodramon vai para sua lixeira e a segurança do bot não muda. Memória final: 5.",
    en: "End breeding and digivolve BT22-038 Monzaemon into BT22-076 ShinMonzaemon (cost 3 after the Ver.1 reduction). Accept trashing the face-down EX9-013 source and choose your BT1-013 Muchomon. Muchomon goes face down to the top of your security, its Monodramon source goes to your trash, and the bot’s security stays unchanged. Final memory: 5.",
  },
  "arena-bt22-shinmonzaemon-opponent-security": {
    ptBR: "Encerre a criação e evolua Monzaemon BT22-038 para ShinMonzaemon BT22-076 (custo 3 após a redução Ver.1). Aceite descartar a fonte EX9-013 virada para baixo e escolha o Muchomon BT1-013 do bot. Muchomon fica no topo da segurança do bot virado para baixo, sua fonte Monodramon vai para a lixeira do bot e sua segurança não muda. Memória final: 5.",
    en: "End breeding and digivolve BT22-038 Monzaemon into BT22-076 ShinMonzaemon (cost 3 after the Ver.1 reduction). Accept trashing the face-down EX9-013 source and choose the bot’s BT1-013 Muchomon. Muchomon goes face down to the top of the bot’s security, its Monodramon source goes to the bot’s trash, and your security stays unchanged. Final memory: 5.",
  },
  "arena-face-down-ace-no-overflow": {
    ptBR: "Encerre a fase de criação. Seu MetalTyrannomon EX9-043 tem BlitzGreymon EX9-013 (ACE, Overflow -4) virado para baixo embaixo. Ataque o Digimon suspenso de 13000 DP do bot. MetalTyrannomon perde a batalha e as duas cartas vão para a lixeira. A memória não deve mudar: uma carta virada para baixo não tem informação, então não há Overflow.",
    en: "End breeding. Your EX9-043 MetalTyrannomon has EX9-013 BlitzGreymon (ACE, Overflow -4) face down under it. Attack the bot's suspended 13000-DP Digimon. MetalTyrannomon loses the battle and both cards go to the trash. Memory must not change: a face-down card has no card information, so there is no Overflow.",
  },
  "arena-ex7-seventh-fascination-trash-turn": {
    ptBR: "Evolua BT11-083 para EX7-061 Lilithmon (X Antibody) e aceite devolver EX7-072 da lixeira ao fundo do deck. O Digimon do bot deve sobreviver ao fim do seu turno e só ser deletado no fim do turno dele.",
    en: "Digivolve BT11-083 into EX7-061 Lilithmon (X Antibody) and accept returning EX7-072 from trash to the deck bottom. The bot's Digimon should survive your turn end and be deleted only at the end of its own turn.",
  },
  "arena-ex13-leopardmon-suspended-target": {
    ptBR: 'Jogue EX13-043 Leopardmon da mão (custo 12) e aceite o [Ao Jogar]. A escolha de "suspender 1 Digimon" deve oferecer o Muchomon do bot, que já está suspenso, além do seu GrapLeomon e do Biyomon do bot. Escolha o Muchomon: ele continua suspenso e o seu GrapLeomon continua ativo. Depois aceite devolver o Digimon de menor DP do bot: o Biyomon vai para o fundo do deck.',
    en: "Play EX13-043 Leopardmon from hand (cost 12) and accept its [On Play]. The \"suspend 1 Digimon\" choice must offer the bot's already suspended Muchomon, plus your GrapLeomon and the bot's Biyomon. Choose Muchomon: it stays suspended and your GrapLeomon stays unsuspended. Then accept returning the bot's lowest DP Digimon: Biyomon goes to the bottom of the deck.",
  },
  "arena-bt24-ogremon-ulforce-unsuspend": {
    ptBR: "Ataque a segurança com Ulforce BT11-032. No efeito de BT24-098, o oponente joga Ogremon e descarta Agumon para escolher Ulforce, mesmo já suspenso. Depois jogue o Tamer azul: Ulforce deve desvirar. Como alternativa, jogue Ulforce EX13-023 e escolha desvirar o BT11-032. Ogremon só impede desvirar na próxima fase de desvirar do alvo; efeitos podem desvirá-lo antes dela.",
    en: "Attack security with BT11-032 Ulforce. BT24-098 plays the opponent's Ogremon; discard Agumon and choose Ulforce even though it is already suspended. Then play the blue Tamer: Ulforce must unsuspend. Alternatively, play EX13-023 Ulforce and choose to unsuspend BT11-032. Ogremon blocks only the target's next unsuspend phase; effects may unsuspend it before that phase.",
  },
  "arena-bt23-king-drasil-unsuspended-cost": {
    ptBR: "Ataque a segurança com o BT23-072 King Drasil_7D6: ele fica suspenso. Depois jogue o EX13-023 UlforceVeedramon da mão (custo 12). Os dois efeitos disparam juntos. Resolva primeiro o [Ao Jogar] do Ulforce que muda a orientação, escolha desvirar 1 Digimon suspenso e escolha o King Drasil. Em seguida o [Todos os Turnos] do King Drasil pode ser ativado: aceite suspender o King Drasil. O Ulforce ganha ＜Rush＞, ＜Raid＞, ＜Reboot＞ e ＜Blocker＞ até o fim do turno do oponente e já pode atacar.",
    en: "Attack security with BT23-072 King Drasil_7D6: it stays suspended. Then play EX13-023 UlforceVeedramon from hand (cost 12). Both effects trigger together. Resolve Ulforce's orientation [On Play] first, choose to unsuspend 1 suspended Digimon, and choose King Drasil. King Drasil's [All Turns] effect can then activate: accept suspending King Drasil. Ulforce gains ＜Rush＞, ＜Raid＞, ＜Reboot＞ and ＜Blocker＞ until the opponent's turn ends and can attack right away.",
  },
  "arena-ex5-reppamon-optional-cost": {
    ptBR: "Encerre a criação e ataque a segurança do bot com EX5-029 Reppamon (com outro EX5-029 herdado). Na ordem dos efeitos, resolva os dois e escolha Sim ou Não na linha de lixar o topo da sua segurança; Perguntar abre a confirmação separada. Sim paga exatamente 1 segurança (2→1); Não mantém 2. Nos dois casos, escolha DarkTyrannomon para o herdado: 6000→4000 DP. Depois, digievolua cada Liollmon BT1-050 em um Reppamon BT1-051 da mão: Sim custa 0 e depois 2 (memória 6→6→4); Não custa 2 e depois 2 (6→4→2). Não há novo pagamento de segurança. Reinicie o combate para testar a outra resposta.",
    en: "End breeding and attack the bot's security with EX5-029 Reppamon (with another EX5-029 inherited). In effect order, resolve both effects and choose Yes or No on the trash-top-security row; Ask opens a separate confirmation. Yes pays exactly 1 security (2→1); No keeps 2. In either case, choose DarkTyrannomon for the inherited effect: 6000→4000 DP. Then evolve each Liollmon BT1-050 into a Reppamon BT1-051 from hand: Yes costs 0 then 2 (memory 6→6→4); No costs 2 then 2 (6→4→2). No further security payment occurs. Reset combat to test the other answer.",
  },
  "arena-ex13-dorimon-optional-cost": {
    ptBR: 'Encerre a criação e ataque o bot com o BT10-086 Omnimon (X Antibody), que tem a EX13-006 Dorimon nas cartas de digivolução. Depois encerre o turno. No [Fim do Seu Turno] da Dorimon, recuse "pagando 1 de custo". A memória não muda (só a passagem de turno a altera) e o Omnimon continua suspenso.',
    en: 'End breeding and attack the bot with BT10-086 Omnimon (X Antibody), which has EX13-006 Dorimon in its digivolution cards. Then end your turn. At Dorimon\'s [End of Your Turn], decline "by paying 1 cost". Memory does not change (only passing the turn moves it) and Omnimon stays suspended.',
  },
  "arena-ex13-giromon-zero-dp-play": {
    ptBR: "O bot tem dois EX13-035 KingEtemon e um Etemon: seus Digimon recebem -6000 DP. Encerre a criação e passe o turno. Quando o KingEtemon atacar, bloqueie com o EX13-056 Giromon. O Giromon suspende, revela as 3 cartas do topo e joga o EX13-047 Gotsumon (3000 DP). O efeito do Giromon termina, a verificação de regras deleta o Gotsumon com 0 DP, e o [Ao Jogar] dele não é ativado.",
    en: "The bot has two EX13-035 KingEtemon and an Etemon: your Digimon get -6000 DP. End breeding and pass the turn. When KingEtemon attacks, block with EX13-056 Giromon. Giromon suspends, reveals the top 3 cards and plays EX13-047 Gotsumon (3000 DP). Giromon's effect finishes, the rule check deletes the 0 DP Gotsumon, and its [On Play] does not activate.",
  },
  "arena-bt13-kurata-belphemon-play-cost": {
    ptBR: "Você tem 5 de memória, o BT13-103 Akihiro Kurata e o BT13-083 Gizmon: AT (custo de jogo 6). Encerre a criação e jogue o BT13-088 Belphemon: Sleep Mode da mão (custo 11). Aceite o efeito do Kurata e delete o Gizmon: AT. O custo cai para 5: a memória fica em 0 e o turno continua.",
    en: "You have 5 memory, BT13-103 Akihiro Kurata and BT13-083 Gizmon: AT (play cost 6). End breeding and play BT13-088 Belphemon: Sleep Mode from hand (cost 11). Accept Kurata's effect and delete Gizmon: AT. The cost drops to 5: memory ends at 0 and your turn continues.",
  },
  "arena-ex10-close-sunarizamon-without-close": {
    ptBR: "Você tem só o EX10-063 Close em jogo, nenhum Digimon, nenhum Close na mão e o EX10-025 Sunarizamon na lixeira. Encerre a criação. No [Início da Sua Fase Principal], aceite devolver o Close ao fundo do deck. Sem Close na mão, nada é jogado da mão, mas como você não tem Digimon, jogue o Sunarizamon da lixeira sem pagar o custo.",
    en: "You have only EX10-063 Close in play, no Digimon, no Close in hand and EX10-025 Sunarizamon in the trash. End breeding. At [Start of Your Main Phase], accept returning Close to the bottom of the deck. With no Close in hand nothing is played from hand, but since you have no Digimon, play Sunarizamon from the trash without paying the cost.",
  },
  "arena-ex11-pyramidimon-fragment-recovery": {
    ptBR: "Seu EX11-044 Pyramidimon (12000 DP) tem 4 Golemon [Mineral] como fontes e há 3 Golemon na lixeira. Encerre a criação e ataque o BT8-017 UltimateBrachiomon suspenso do bot (13000 DP). Recuse o [Ao Atacar] do Pyramidimon. Ele perde a batalha: use o ＜Fragmento (3)＞ e lixe 3 fontes. O [Todos os Turnos] dispara e coloca os 3 Golemon da lixeira embaixo dele. O Pyramidimon sobrevive com 4 fontes.",
    en: "Your EX11-044 Pyramidimon (12000 DP) has 4 [Mineral] Golemon sources, and 3 Golemon are in the trash. End breeding and attack the bot's suspended BT8-017 UltimateBrachiomon (13000 DP). Decline Pyramidimon's [When Attacking]. It loses the battle: use ＜Fragment (3)＞ and trash 3 sources. Its [All Turns] triggers and places the 3 trash Golemon under it. Pyramidimon survives with 4 sources.",
  },
  "arena-ex13-leopardmon-unsuspend-lock": {
    ptBR: "Jogue EX13-040 Mikemon da mão (custo 4). O [Ao Jogar] escolhe o EX13-043 Leopardmon suspenso do bot: ele não pode desuspender até o fim do turno dele. Depois ataque o Leopardmon com o seu BT10-055 Gryphonmon (13000 contra 12000). O Leopardmon não pode pagar a prevenção, porque nenhum Digimon do bot pode desuspender: ele é deletado e vai para a lixeira.",
    en: "Play EX13-040 Mikemon from hand (cost 4). Its [On Play] picks the bot's suspended EX13-043 Leopardmon: it can't unsuspend until the end of the bot's turn. Then attack Leopardmon with your BT10-055 Gryphonmon (13000 vs 12000). Leopardmon can't pay its leave prevention, because no bot Digimon can unsuspend: it is deleted and goes to the trash.",
  },
  "arena-ex13-rina-suspend-lock": {
    ptBR: 'Jogue o BT20-084 Sistermon Ciel (Awakened) da mão (custo 5). O [Ao Jogar] pede 1 Digimon ou Tamer do bot: escolha a EX13-069 Rina Shinomiya. Ela não pode suspender até o fim do turno do bot. Encerre seu turno. Na fase de desuspender do bot, o BT3-021 Veemon dele desuspende. A Rina não pode pagar "suspendendo este Tamer": o efeito dela não é oferecido nem ativado, o log não mostra "efeito da Rina Shinomiya resolvido", a Rina continua desvirada e o bot só compra a carta normal do turno.',
    en: "Play BT20-084 Sistermon Ciel (Awakened) from hand (cost 5). Its [On Play] asks for 1 of the bot's Digimon or Tamers: choose EX13-069 Rina Shinomiya. She can't suspend until the end of the bot's turn. End your turn. In the bot's unsuspend phase, its BT3-021 Veemon unsuspends. Rina can't pay \"by suspending this Tamer\": her effect is neither offered nor activated, the log shows no \"Rina Shinomiya's effect resolved\", Rina stays unsuspended, and the bot draws only its normal turn card.",
  },
  "arena-ex13-rina-modal-title": {
    ptBR: "Encerre a criação. Ataque a segurança com Veemon BT3-021 (Jamming). Use Victory Sword ST8-11 (custo 3) para desvirar o único Veemon. No modal de Rina, o título deve ser a pergunta localizada normal e o corpo deve mostrar apenas o trecho de virar a Tamer/comprar 1. Aceite: Rina vira e compra 1. No segundo modal, o corpo deve mostrar apenas o trecho de evolução. Aceite: o único Veemon evolui para Veedramon BT1-115 na mão e o custo 3 cai para 1. Recarregue para recusar Rina (sem virar/comprar) ou recusar a evolução após a compra (Veedramon fica na mão).",
    en: "End breeding. Attack security with BT3-021 Veemon (Jamming). Use ST8-11 Victory Sword (cost 3) to unsuspend the sole Veemon. Rina's modal must keep the normal localized question as its title and show only the suspend-Tamer/draw-1 passage in the body. Accept: Rina suspends and draws 1. The second modal must show only the evolution passage in its body. Accept: the sole Veemon evolves into BT1-115 Veedramon in hand and its cost 3 becomes 1. Reload to decline Rina (no suspend/draw) or decline evolution after drawing (Veedramon stays in hand).",
  },
  "arena-ex11-vortex-effect-attack": {
    ptBR: "Digivolva o ST20-10 Agumon no ST21-08 Togemon da mão (custo 2). O [Seu Turno] do ST21-09 Lillymon dispara: dê ＜Aliança＞ ao Togemon e ataque o jogador com ele. Na ＜Aliança＞, escolha a Lillymon. O Togemon e a Lillymon suspendem, e o [Todos os Turnos] do seu EX11-074 Vortexdramon (desvirado) pergunta Battle duas vezes. Recuse a primeira. Aceite a segunda e escolha o BT1-009 Monodramon do bot: ele é deletado. Recusar não gasta o [Uma Vez Por Turno], mesmo com o ataque ordenado por um efeito.",
    en: "Digivolve ST20-10 Agumon into ST21-08 Togemon from hand (cost 2). ST21-09 Lillymon's [Your Turn] effect triggers: give Togemon ＜Alliance＞ and attack the player with it. For ＜Alliance＞, choose Lillymon. Togemon and Lillymon suspend, and the [All Turns] effect of your unsuspended EX11-074 Vortexdramon asks Battle twice. Decline the first. Accept the second and choose the bot's BT1-009 Monodramon: it is deleted. Declining does not spend the [Once Per Turn], even when an effect ordered the attack.",
  },
  "arena-crimson-blaze-jesmon-token": {
    ptBR: "Use o BT8-097 Crimson Blaze da mão: o bot tem 6 Digimon, então o custo é 0. O token Atho, René & Por pode usar Decoy para salvar um Digimon vermelho e é deletado. O Jesmon (12000 DP) sobrevive. Encerre seu turno. No turno do bot, o ataque do BT23-013 Jesmon não pode jogar outro token nem uma Sistermon por efeito: o bloqueio continua até o fim desse turno. Jogadas normais da mão continuam permitidas.",
    en: "Use BT8-097 Crimson Blaze from hand: the bot has 6 Digimon, so the cost is 0. The Atho, René & Por token can use Decoy to save a red Digimon and is deleted. Jesmon (12000 DP) survives. End your turn. During the bot's turn, BT23-013 Jesmon's attack cannot play another token or a Sistermon by effect: the restriction lasts until the end of that turn. Normal hand plays remain legal.",
  },
  "arena-decoy-protect-choice": {
    ptBR: "A carta do topo da segurança do bot é BT8-097 Crimson Blaze. Ataque a segurança com o BT1-080 Titamon (12000 DP). O [Segurança] do Crimson Blaze tenta deletar todos os seus Digimon com 6000 DP ou menos: Gotsumon (preto), Monodramon (vermelho), Agumon (vermelho) e o token Atho, René & Por. O jogo pergunta se o token usa ＜Decoy (Vermelho/Preto)＞: aceite. Depois ele pede para escolher 1 Digimon para proteger entre Gotsumon, Monodramon e Agumon. Escolha o Monodramon: o token é deletado, o Monodramon fica em campo e o Gotsumon e o Agumon vão para a lixeira.",
    en: "The top card of the bot's security is BT8-097 Crimson Blaze. Attack security with BT1-080 Titamon (12000 DP). Crimson Blaze's [Security] tries to delete all your Digimon with 6000 DP or less: Gotsumon (Black), Monodramon (Red), Agumon (Red), and the Atho, René & Por token. The game asks whether the token uses ＜Decoy (Red/Black)＞: accept. It then asks you to choose 1 Digimon to protect among Gotsumon, Monodramon, and Agumon. Choose Monodramon: the token is deleted, Monodramon stays in play, and Gotsumon and Agumon go to the trash.",
  },
  "arena-ex13-breakdramon-zero-security-check": {
    ptBR: "A segurança do bot tem 2 cartas, e a do topo é BT13-106 Odin's Breath. Ataque a segurança primeiro com o BT1-024 MetalTyrannomon. Se o Breakdramon oferecer uma batalha, recuse: o bot não tem Digimon. O MetalTyrannomon checa o Odin's Breath, e o [Segurança] dele dá ＜Ataque à Segurança -1＞ a todos os seus Digimon até o fim deste turno. Depois ataque a segurança com o EX13-044 Breakdramon e aceite o efeito herdado do EX13-021 Wingdramon para desuspender. O Breakdramon checa 0 cartas (Q644): o bot continua com 1 carta de segurança. A seta de ataque some quando o ataque termina, e o tabuleiro não fica preso apontando para a segurança.",
    en: "The bot's security has 2 cards, and the top one is BT13-106 Odin's Breath. Attack security first with BT1-024 MetalTyrannomon. If Breakdramon offers a battle, decline it: the bot has no Digimon. MetalTyrannomon checks Odin's Breath, and its [Security] effect gives all your Digimon ＜Security Attack -1＞ until the end of this turn. Then attack security with EX13-044 Breakdramon and accept the inherited EX13-021 Wingdramon effect to unsuspend. Breakdramon checks 0 cards (Q644): the bot still has 1 security card. The attack arrow goes away when the attack ends, and the board does not stay stuck pointing at security.",
  },
  "arena-ex12-nezhamon-kakkinmon-engage": {
    ptBR: "Encerre a criação e passe o turno sem jogar cartas. Escolha Engage de Nezhamon antes do efeito herdado de Kakkinmon e ataque o jogador. Nezhamon suspende para atacar, deixando Kakkinmon sem um alvo para pagar o custo. Após a verificação, aceite desuspender Nezhamon: Kakkinmon não pode voltar a resolver nem comprar uma carta neste fim de turno. Alternativa: escolha Kakkinmon primeiro e suspenda Nezhamon; você compra 1 carta, e Engage não pode atacar com Nezhamon suspenso.",
    en: "End breeding and pass without playing cards. Choose Nezhamon's Engage before Kakkinmon's inherited effect and attack the player. Nezhamon suspends to attack, leaving Kakkinmon without a payable target. After the check, accept unsuspending Nezhamon: Kakkinmon must not resolve again or draw a card in this end-of-turn window. Alternative: choose Kakkinmon first and suspend Nezhamon; draw 1 card, and Engage cannot attack with suspended Nezhamon.",
  },
  "arena-ex12-nezhamon-kakkinmon-engage-spare-blocker": {
    ptBR: "Você tem Nezhamon com P-245 Kakkinmon embaixo e um ST5-08 DarkTyrannomon desvirado. Encerre a criação, anote o tamanho da mão H e passe sem jogar cartas. Escolha Engage de Nezhamon primeiro, aceite e ataque o jogador. Antes de revelar a segurança, aceite Kakkinmon e suspenda o ST5-08: a mão passa a H+1. Só então a segurança do bot cai de 5 para 4. Aceite desuspender Nezhamon: ele termina desvirado, o ST5-08 fica suspenso, e Kakkinmon não compra novamente neste fim de turno. Controle: reinicie e recuse Kakkinmon; o ataque termina, o ST5-08 fica desvirado e a mão continua H. Compare o registro apenas neste fim de turno humano: Kakkinmon também dispara no fim do turno do bot.",
    en: "You have Nezhamon with P-245 Kakkinmon underneath and an upright ST5-08 DarkTyrannomon. End breeding, record hand size H, and pass without playing cards. Choose Nezhamon's Engage first, accept, and attack the player. Before security is revealed, accept Kakkinmon and suspend ST5-08: hand becomes H+1. Only then does bot security fall from 5 to 4. Accept unsuspending Nezhamon: it ends upright, ST5-08 stays suspended, and Kakkinmon does not draw again in this end-of-turn window. Control: reset and decline Kakkinmon; the attack completes, ST5-08 stays upright, and hand stays H. Compare the log only within this human end-turn window: Kakkinmon also triggers at the bot's end of turn.",
  },
  "arena-p245-kakkinmon-craniamon-no-target": {
    ptBR: 'Seu EX13-062 Craniamon tem o P-245 Kakkinmon nas cartas de digivolução, e o bot não tem Digimon. Não jogue nada: encerre o turno. No [Fim de Todos os Turnos] do Kakkinmon, aceite suspender o Craniamon. O Craniamon gira de lado e você compra 1 carta. O [Todos os Turnos] do Craniamon ativa sem alvo. No registro da partida, leia de baixo para cima: o efeito do Kakkinmon ativou, o Craniamon suspendeu, a compra, o efeito do Kakkinmon resolveu, e depois a linha "O efeito de Craniamon não teve efeito". O ＜Reboot＞ desuspende o Craniamon na fase de desuspender do bot.',
    en: "Your EX13-062 Craniamon has P-245 Kakkinmon in its digivolution cards, and the bot has no Digimon. Don't play anything: end your turn. On Kakkinmon's [End of All Turns], accept suspending Craniamon. Craniamon turns sideways and you draw 1 card. Craniamon's [All Turns] activates with no target. In the match log, read bottom-up: Kakkinmon's effect activated, Craniamon suspended, the draw, Kakkinmon's effect resolved, then \"Craniamon's effect had no effect\". ＜Reboot＞ unsuspends Craniamon in the bot's unsuspend phase.",
  },
  "arena-p245-kakkinmon-full-hand-suspend": {
    ptBR: "Seu EX13-062 Craniamon tem o P-245 Kakkinmon nas cartas de digivolução, e a compra do turno deixa sua mão com 8 cartas. Não jogue nada: encerre o turno. No [Fim de Todos os Turnos] do Kakkinmon, aceite suspender o Craniamon. Sua mão tem mais de 7 cartas, então você não compra, mas o Craniamon suspende mesmo assim. Aceite o [Todos os Turnos] do Craniamon: o BT1-009 Monodramon do bot (custo 2) é deletado, e o BT1-013 Muchomon (custo 3) continua em jogo. Sua mão fica com 8 cartas. O ＜Reboot＞ desuspende o Craniamon na fase de desuspender do bot.",
    en: "Your EX13-062 Craniamon has P-245 Kakkinmon in its digivolution cards, and the turn draw brings your hand to 8 cards. Don't play anything: end your turn. On Kakkinmon's [End of All Turns], accept suspending Craniamon. Your hand has more than 7 cards, so you don't draw, but Craniamon still suspends. Accept Craniamon's [All Turns]: the bot's BT1-009 Monodramon (cost 2) is deleted, and BT1-013 Muchomon (cost 3) stays in play. Your hand stays at 8 cards. ＜Reboot＞ unsuspends Craniamon in the bot's unsuspend phase.",
  },
  "arena-ex13-craniamon-dual-play-cost": {
    ptBR: "Encerre a criação. Seu EX13-062 Craniamon tem P-245 Kakkinmon nas fontes e sua mão fica com 8 cartas. Não jogue nada: encerre o turno e aceite suspender Craniamon pelo Kakkinmon. Aceite a deleção do Craniamon: somente EX12-013 BetelGammamon (custo de jogo 5) deve ser deletado. EX12-018 Siriusmon é DUAL e não tem custo de jogo; o custo 5 da Option Planet Punch não entra na comparação. Siriusmon deve manter todas as fontes, sem oferecer Decode nem a proteção herdada de Canoweissmon. P-240 Arcturusmon (custo 13) também permanece. Você não compra pelo Kakkinmon, e Reboot desuspende Craniamon no turno do bot.",
    en: "End breeding. Your EX13-062 Craniamon has P-245 Kakkinmon underneath, and your hand reaches 8 cards. Don't play anything: end your turn and accept suspending Craniamon for Kakkinmon. Accept Craniamon's deletion: only EX12-013 BetelGammamon (play cost 5) should be deleted. EX12-018 Siriusmon is DUAL and has no play cost; its Planet Punch Option use cost of 5 is excluded from the comparison. Siriusmon keeps every digivolution card without offering Decode or Canoweissmon's inherited protection. P-240 Arcturusmon (cost 13) also stays. Kakkinmon doesn't draw, and Reboot unsuspends Craniamon on the bot's turn.",
  },
  "arena-ex13-alphamon-end-turn-attack": {
    ptBR: "Você começa com 10 de memória. Jogue o EX13-060 Alphamon da mão (custo 13): a memória passa para 3 do lado do bot. O [Seu Turno] dele dispara com a própria jogada; recuse o ataque e a reativação do [Ao Digivolver], como na partida reportada, para guardar o [Uma Vez Por Turno]. No [Fim do Seu Turno] do Alphamon, aceite jogar o EX13-057 Grademon da mão (custo 7 - 6 = 1). Ele ganha ＜Investida＞. Na ordem dos efeitos, marque Sim no [Seu Turno] do Alphamon e resolva-o primeiro, como na partida reportada; escolha o Grademon como atacante. O único Digimon do bot está ativo, então o alvo do ataque é só a pilha de segurança: o painel diz “Grademon ataca. O único alvo é a segurança do oponente.”, a segurança já vem selecionada com a seta saindo do Grademon destacado, e nenhuma carta da sua mão brilha como jogável. Clique em Ataque à segurança: o Grademon ataca, o [Ao Jogar] dele resolve e o bot perde 1 carta de segurança.",
    en: "You start with 10 memory. Play EX13-060 Alphamon from hand (cost 13): memory moves to 3 on the bot's side. Its own play triggers its [Your Turn]; decline both the attack and the [When Digivolving] reactivation, as in the reported match, to keep its [Once Per Turn]. On Alphamon's [End of Your Turn], accept playing EX13-057 Grademon from hand (cost 7 - 6 = 1). It gains ＜Rush＞. In the effect order, set Alphamon's [Your Turn] to Yes and resolve it first, as in the reported match; pick Grademon as the attacker. The bot's only Digimon is unsuspended, so the only attack target is the security stack: the panel says “Grademon attacks. The only target is your opponent's security.”, security starts selected with the arrow leaving the highlighted Grademon, and no card in your hand glows as playable. Press Security Attack: Grademon attacks, its [On Play] resolves, and the bot loses 1 security card.",
  },
  "arena-bt20-dragon-gene-skip-play": {
    ptBR: "Use BT20-093 Unleash the Dragon Gene da mão e aceite o [Principal]. A seleção da mão deve oferecer BT20-023 Coredramon e EX3-074 Examon e também o botão Nenhuma seleção. Escolha Nenhuma seleção: nenhum Digimon é jogado, os dois continuam na mão, a Option vai para a área de batalha e a memória cai só 2.",
    en: "Use BT20-093 Unleash the Dragon Gene from hand and accept its [Main]. The hand selection must offer BT20-023 Coredramon and EX3-074 Examon and also the No Selection button. Choose No Selection: no Digimon is played, both stay in hand, the Option goes to the battle area, and memory drops by only 2.",
  },
  "arena-discord-1557575147119054889-shakkoumon-sukamon": {
    ptBR: "Encerre a criação. Você tem 0 de memória e as três cartas anexadas ao relato: EX13-028 Sukamon (amarelo), BT11-040 Sukamon e EX5-046 Targetmon (ambos amarelo/preto), todos Nv.4. Selecione BT23-032 Shakkoumon na mão, escolha DNA e use EX13-028 + BT11-040. Deve custar 0, consumir só os dois escolhidos e criar Shakkoumon ativo; Targetmon permanece. Reinicie para testar EX13-028 + Targetmon e BT11-040 + Targetmon. Cada par deve funcionar, inclusive na ordem inversa. O requisito [CS] vale para a digivolução normal alternativa de custo 3; o DNA não exige [CS] nem nomes específicos.",
    en: "End breeding. You have 0 memory and the three cards attached to the report: EX13-028 Sukamon (yellow), BT11-040 Sukamon and EX5-046 Targetmon (both yellow/black), all Lv.4. Select BT23-032 Shakkoumon in hand, choose DNA, and use EX13-028 + BT11-040. It should cost 0, consume only the selected two, and create unsuspended Shakkoumon; Targetmon stays. Reset to test EX13-028 + Targetmon and BT11-040 + Targetmon. Every pair should work, including reversed selection. The [CS] requirement belongs to the alternate normal digivolution costing 3; DNA requires neither [CS] nor specific names.",
  },
  "arena-discord-1557575147119054889-shakkoumon-yellow-only": {
    ptBR: "Encerre a criação. Seus dois EX13-028 Sukamon são amarelos Nv.4. Selecione BT23-032 Shakkoumon: nenhuma combinação de DNA deve aparecer, pois falta um material preto ou azul Nv.4. Uma única carta multicolorida também não ocupa os dois lugares do DNA. A mão, os dois Sukamon e a memória devem permanecer sem alterações. Use o cenário Shakkoumon DNA · materiais do relato para comparar com pares válidos.",
    en: "End breeding. Both of your EX13-028 Sukamon are yellow Lv.4. Select BT23-032 Shakkoumon: no DNA combination should appear because a black or blue Lv.4 material is missing. A single multicolor card also cannot fill both DNA slots. Your hand, both Sukamon, and memory should remain unchanged. Use Shakkoumon DNA · reported materials to compare with legal pairs.",
  },
  "arena-discord-1557631388650315826-sukamon-dna-materials": {
    en: "Let the opponent play KingSukamon and turn Wingdramon into a white 3000 DP Sukamon. On your turn, Examon must offer no DNA route with Breakdramon: Wingdramon still counts as Lv.6 for Examon, but is no longer blue. End the turn; the inherited DNA effect must leave both materials in play. The rewrite expires afterward.",
    ptBR: "Deixe o oponente jogar KingSukamon e transformar Wingdramon em Sukamon branco de 3000 DP. No seu turno, Examon não deve oferecer DNA com Breakdramon: Wingdramon ainda conta como Nv.6 para Examon, mas não é azul. Encerre o turno; o efeito herdado de DNA deve manter os dois materiais em campo. A transformação termina depois disso.",
  },
  "arena-discord-1557631388650315826-sukamon-dna-control": {
    en: "Healthy control: Wingdramon is blue/red and Breakdramon is green/red. DNA digivolve into Examon for 0, or end the turn and accept Dracomon's inherited DNA. Both materials must merge; Examon's mandatory attack resolves. White Sukamon can still DNA when a printed recipe admits it, such as Kimeramon's color-free Lv.4 + Lv.4 recipe.",
    ptBR: "Controle: Wingdramon é azul/vermelho e Breakdramon é verde/vermelho. Faça DNA para Examon por 0, ou encerre o turno e aceite o DNA herdado de Dracomon. Os materiais devem se unir; o ataque obrigatório de Examon resolve. Sukamon branco ainda pode fazer DNA quando o requisito permite, como Nv.4 + Nv.4 sem cor de Kimeramon.",
  },
  "arena-discord-1557790296379625482-loweemon-hosts": {
    ptBR: "Estado parcial observado: 2 de memória, Ai & Mako, Ignitemon sobre DemiMeramon e Loweemon sobre Koichi. Ataque com Loweemon; resolva Loweemon antes do efeito herdado de Koichi. Aceite e selecione um dos três alvos no campo. Loweemon evolui no KaiserLeomon do lixo por 1; os outros alvos oferecem Velgrmon ou KaiserLeomon por 4. Recuse os efeitos de Ai & Mako e Koichi para isolar o custo. Use Selecionar no campo para escolher o Digimon ou Tamer antes de escolher o card do lixo.",
    en: "Observed partial state: 2 memory, Ai & Mako, Ignitemon over DemiMeramon, and Loweemon over Koichi. Attack with Loweemon; resolve Loweemon before Koichi’s inherited effect. Accept and select one of the three board hosts. Loweemon evolves into KaiserLeomon from trash for 1; the other hosts offer Velgrmon or KaiserLeomon for 4. Decline Ai & Mako and Koichi effects to isolate the cost. Use Select on board to choose the Digimon or Tamer before choosing the trash card.",
  },
  "arena-discord-1557790296379625482-trash-hybrids": {
    ptBR: "Com 2 de memória, ataque com Duskmon e selecione o próprio Duskmon no campo: Velgrmon do lixo evolui por 0. Recuse o efeito de fim de ataque do Velgrmon. Depois ataque com Loweemon e selecione o próprio Loweemon: KaiserLeomon evolui por 1. Ukkomon não é um alvo válido. Reinicie e selecione DemiDevimon como alvo para abrir a escolha entre os dois cards do lixo; o custo normal é 4, reduzido a 3 pelo Duskmon. O primeiro seletor escolhe o Digimon no campo, não o card do lixo.",
    en: "At 2 memory, attack with Duskmon and select Duskmon itself on the board: Velgrmon from trash evolves for 0. Decline Velgrmon’s end-of-attack effect. Then attack with Loweemon and select Loweemon itself: KaiserLeomon evolves for 1. Ukkomon is not a legal host. Restart and select DemiDevimon as the host to open the choice between both trash cards; the normal cost is 4, reduced to 3 by Duskmon. The first picker selects the board Digimon, not the trash card.",
  },
  "arena-discord-1557565628439724032-duskmon-dna-colors": {
    ptBR: "Espere o bot jogar Duskmon BT18-078 e mudar Wingdramon EX13-021 para vermelho. Encerre a criação: Examon BT13-059 não deve oferecer DNA com Wingdramon + HerculesKabuterimon, pois falta azul. Evolua Wingdramon em Slayerdramon EX3-024 pela condição de nome (3 memória): ele continua vermelho e a DNA continua indisponível. Encerre o turno: o Dracomon herdado não deve oferecer DNA ilegal. Para comparar, abra o cenário Duskmon DNA · controle: sem mudança de cor, a mesma dupla pode fazer DNA por 0.",
    en: "Wait for the bot to play BT18-078 Duskmon and change EX13-021 Wingdramon to red. End breeding: BT13-059 Examon must not offer DNA with Wingdramon + HerculesKabuterimon because blue is missing. Digivolve Wingdramon into EX3-024 Slayerdramon using its named requirement (3 memory): it stays red and DNA remains unavailable. End your turn: inherited Dracomon must not offer illegal DNA. Compare with Duskmon DNA · control: without the color change, the same pair can DNA digivolve for 0.",
  },
  "arena-discord-1557565628439724032-duskmon-dna-control": {
    ptBR: "O bot passa sem jogar Duskmon. Encerre a criação e selecione Examon BT13-059: a DNA com Wingdramon EX13-021 + HerculesKabuterimon BT1-081 deve estar disponível por 0. Faça a DNA; os dois materiais são consumidos e Examon entra não suspenso. Reinicie e evolua Wingdramon em Slayerdramon EX3-024 (3 memória): a DNA continua legal, inclusive pelo Dracomon herdado ao encerrar o turno.",
    en: "The bot passes without playing Duskmon. End breeding and select BT13-059 Examon: DNA with EX13-021 Wingdramon + BT1-081 HerculesKabuterimon must be available for 0. DNA digivolve; both materials are consumed and Examon enters unsuspended. Reset and digivolve Wingdramon into EX3-024 Slayerdramon (3 memory): DNA stays legal, including inherited Dracomon when ending the turn.",
  },
  "arena-bt23-examon-opponent-turn-dna": {
    ptBR: "O bot começa o turno com ST2-16 Cocytus Breath na mão e 7 de memória. Você tem BT20-093 Unleash the Dragon Gene no campo, BT20-027 Slayerdramon (suspenso) e BT20-044 Breakdramon, e BT23-047 Examon na mão. Espere o bot usar Cocytus Breath em um dos seus Digimon. Aceite o ＜Delay＞ da Gene e faça a DNA dos dois em Examon. O [Quando Evolui] de Examon suspende o Digimon do bot, mas não deve oferecer o ataque, porque só o jogador do turno pode atacar. A segurança do bot continua igual.",
    en: "The bot starts its turn with ST2-16 Cocytus Breath in hand and 7 memory. You have BT20-093 Unleash the Dragon Gene in play, BT20-027 Slayerdramon (suspended) and BT20-044 Breakdramon, and BT23-047 Examon in hand. Wait for the bot to use Cocytus Breath on one of your Digimon. Accept Gene's ＜Delay＞ and DNA digivolve both into Examon. Examon's [When Digivolving] suspends the bot's Digimon but must not offer the attack, because only the turn player can attack. The bot's security stays the same.",
  },
  "arena-bt14-chuumon-security-reveal": {
    ptBR: 'O oponente começa o turno com BT14-032 Chuumon na mão, 3 de memória e BT14-034 Sukamon no topo da segurança. Espere o bot jogar o Chuumon. O [Ao Jogar] adiciona o Sukamon à mão dele sem revelá-lo e depois o coloca de volta no topo da segurança. O seu log deve mostrar "O oponente revelou Sukamon com Chuumon" uma única vez, antes de o card ir virado para baixo para a segurança.',
    en: 'The opponent starts its turn with BT14-032 Chuumon in hand, 3 memory, and BT14-034 Sukamon on top of security. Wait for the bot to play Chuumon. Its [On Play] adds Sukamon to its hand without revealing it, then places it back on top of security. Your log must show "Opponent revealed Sukamon with Chuumon" exactly once, before the card goes face down into security.',
  },
  "arena-bt26-rosemon-option-digivolve-lock": {
    ptBR: "Discord 1555363063300096090. Encerre a criação. Use BT26-050 como Option (Aguichant Lèvres, 6 de memória) e suspenda Monodramon e Biyomon, não o Hyogamon. Encerre o turno. Monodramon e Biyomon não desuspendem. Hyogamon (com Shamanmon nas fontes) ataca e fica suspenso. Se o bot descartar um card da mão no Ao Atacar, o herdado de Shamanmon não pode evoluir Hyogamon para SkullBaluchimon da lixeira: nenhum Digimon suspenso do bot pode evoluir até o fim do turno dele.",
    en: "Discord 1555363063300096090. End breeding. Use BT26-050 as an Option (Aguichant Lèvres, 6 memory) and suspend Monodramon and Biyomon, not Hyogamon. End your turn. Monodramon and Biyomon don't unsuspend. Hyogamon (with Shamanmon in its sources) attacks and becomes suspended. If the bot trashes a card from hand for its When Attacking, Shamanmon's inherited effect must not digivolve Hyogamon into SkullBaluchimon from the trash: none of the bot's suspended Digimon can digivolve until its turn ends.",
  },
  "arena-bt26-ravemon-recycled-trigger": {
    ptBR: "Discord 1555674174369042583. Encerre a criação. Evolua Myotismon (com Pinamon nas fontes) para Ravemon, custo 4. Aceite deletar o próprio Ravemon, mesmo sem Digimon adversário. Na ordem dos [Ao Deletar], resolva Pinamon primeiro: descarte o card de baixo do Tai Kamiya e jogue Falcomon da lixeira. Depois aceite a reação do Crowmon e evolua para o mesmo Ravemon da lixeira pela rota alternativa, custo 2. Esse Ravemon deve oferecer novamente seu [Quando Evolui], antes de voltar aos efeitos antigos. Aceite deletá-lo outra vez. A nova deleção deve oferecer colocá-lo na segurança: recuse para deixá-lo na lixeira, ou aceite para colocá-lo virado para cima no fundo. Não é preciso fazer outra ação para resolver a cadeia.",
    en: "Discord 1555674174369042583. End breeding. Digivolve Myotismon (with Pinamon underneath) into Ravemon for 4. Accept deleting Ravemon itself even with no opposing Digimon. Order the On Deletion effects with Pinamon first: trash the bottom card under Tai Kamiya and play Falcomon from trash. Then accept Crowmon’s reaction and digivolve into the same Ravemon from trash using its alternate route for 2. Ravemon must offer its When Digivolving again before returning to older effects. Accept deleting it again. Its new deletion must ask whether to place it in security: decline to keep it in trash, or accept to place it face up at the bottom. No further action is needed to finish the chain.",
  },
  "arena-github-5299-ravemon-bottom-security": {
    ptBR: 'GitHub #5299. Você tem 6 de memória, Crowmon em campo e Ravemon na mão. Sua segurança começa com Monodramon virado para cima no topo e um card oculto no fundo; o bot também tem um topo público e um card oculto. Encerre a criação. Evolua Crowmon para Ravemon pela rota alternativa (custo 3), escolha "Delete this Digimon" e aceite colocar Ravemon na segurança após o bot descartar 1 dos 8 cards da mão. Ravemon deve ficar virado para cima no fundo, atrás do topo e do card oculto. O bot perde Omnimon e mantém seu atacante. Ao encerrar seu turno, o primeiro ataque do bot deve checar Monodramon, deixando o card oculto acima de Ravemon. No fim do turno do bot, Ravemon sai do fundo da segurança e é jogado de graça. Controle: recuse a colocação opcional para mantê-lo na lixeira. Nenhum card oculto deve mostrar sua identidade.',
    en: 'GitHub #5299. You have 6 memory, Crowmon in play, and Ravemon in hand. Your security starts with face-up Monodramon on top and a hidden card beneath; the bot also has a public top and hidden bottom. End breeding. Digivolve Crowmon into Ravemon using the alternate route (cost 3), choose "Delete this Digimon", and accept placing Ravemon in security after the bot trashes 1 of its 8 hand cards. Ravemon must be face up at the bottom, behind the top and hidden card. The bot loses Omnimon and retains its attacker. After you end your turn, the bot’s first attack must check Monodramon, leaving the hidden card above Ravemon. At the end of the bot’s turn, Ravemon leaves bottom security and is played for free. Control: decline the optional placement to leave it in trash. Hidden cards must never show their identities.',
  },
  "arena-bt26-ravemon-nested-on-deletion": {
    ptBR: 'Discord 1555674174369042583. Você tem 6 de memória, dois BT26-072 Peckmon, BT26-091 Yoshino Fujieda com 1 card embaixo, BT25-087 Thomas H. Norstein com 2 cards embaixo, BT26-076 Crowmon na mão e BT26-082 Ravemon na lixeira. O bot tem Monodramon (nível 3), Omnimon e 4 cards na mão. Encerre a criação e recuse o [Início da Sua Fase Principal] da Yoshino. 1) Evolua o Peckmon da esquerda para o Crowmon. 2) Aceite o Thomas e descarte o card de baixo da Yoshino. O Crowmon deve ir para o Peckmon que você escolheu; a Yoshino não pode resolver no meio da evolução nem usar esse Crowmon. 3) A janela de ordem mostra o [Ao Evoluir] do Crowmon junto com a Yoshino: resolva o Crowmon primeiro. Ele deleta o Monodramon; aceite descartar o card de baixo do Thomas e o bot descarta 1 card. 4) O Crowmon reage e evolui para o Ravemon da lixeira. 5) No [Ao Evoluir] do Ravemon, escolha "Delete this Digimon": o Omnimon é deletado. 6) Os [Ao Deletar] do Peckmon, do Crowmon e do Ravemon devem abrir na hora, sem precisar de outra ação. O Ravemon pergunta se você quer colocá-lo no fundo da segurança. O Thomas não é oferecido uma segunda vez.',
    en: "Discord 1555674174369042583. You have 6 memory, two BT26-072 Peckmon, BT26-091 Yoshino Fujieda with 1 card under it, BT25-087 Thomas H. Norstein with 2 cards under it, BT26-076 Crowmon in hand, and BT26-082 Ravemon in the trash. The bot has Monodramon (level 3), Omnimon, and 4 cards in hand. End breeding and decline Yoshino's [Start of Your Main Phase]. 1) Digivolve the left Peckmon into Crowmon. 2) Accept Thomas and trash the card under Yoshino. Crowmon must land on the Peckmon you chose; Yoshino must not resolve mid-digivolution or use that Crowmon. 3) The order prompt shows Crowmon's [When Digivolving] together with Yoshino: resolve Crowmon first. It deletes Monodramon; accept trashing the card under Thomas, and the bot trashes 1 card. 4) Crowmon reacts and digivolves into the trash Ravemon. 5) On Ravemon's [When Digivolving], choose \"Delete this Digimon\": Omnimon is deleted. 6) The [On Deletion] effects of Peckmon, Crowmon and Ravemon must open right away, with no further action. Ravemon asks whether to place itself at the bottom of security. Thomas is not offered a second time.",
  },
  "arena-github5300-yoshino-cost-payload": {
    ptBR: "GitHub #5300. Encerre a criação e recuse colocar um card sob Yoshino no início da fase principal. Jogue ST24-09 Sunflowmon e suspenda o Digimon adversário; recuse colocar o topo do deck sob um Tamer. Aceite suspender Yoshino e depois recuse evoluir: Yoshino fica suspensa, o BT26-039 continua em campo e Lilamon permanece na mão. Reinicie para aceitar a evolução com custo reduzido em 1, ou recusar a suspensão. Para o outro gatilho, jogue Falcomon, aceite descartar o card sob Yoshino e recuperar o card da lixeira; a suspensão e a evolução continuam escolhas separadas.",
    en: "GitHub #5300. End breeding and decline placing a card under Yoshino at the start of Main. Play ST24-09 Sunflowmon and suspend the opposing Digimon; decline placing the deck's top card under a Tamer. Accept suspending Yoshino, then decline digivolving: Yoshino stays suspended, BT26-039 stays in play, and Lilamon stays in hand. Restart to accept the evolution with its cost reduced by 1, or decline the suspension. For the other trigger, play Falcomon, accept trashing Yoshino's bottom card and recovering the trash card; suspension and digivolution remain separate choices.",
  },
  "arena-github5300-keenan-cost-execute": {
    ptBR: "GitHub #5300. Encerre a criação e recuse colocar um card sob Keenan no início da fase principal. Jogue EX6-049 Devimon: o bot descarta 1 dos seus 7 cards. Recuse a suspensão para deixar Keenan ativo, ou aceite para suspendê-lo e escolher exatamente 1 Digimon DATA SQUAD para ganhar Execute neste turno. Depois de pagar, esse ganho é obrigatório; o Monodramon não é elegível. Reinicie e jogue Falcomon, pagando o descarte sob Keenan, para testar o outro gatilho.",
    en: "GitHub #5300. End breeding and decline placing a card under Keenan at the start of Main. Play EX6-049 Devimon: the bot trashes 1 of its 7 hand cards. Decline the suspension to leave Keenan active, or accept to suspend him and choose exactly 1 DATA SQUAD Digimon to gain Execute for this turn. After payment, that grant is mandatory; Monodramon is ineligible. Restart and play Falcomon, paying the trash from under Keenan, to test the other trigger.",
  },
  "arena-bt26-yoshino-trigger-stack": {
    ptBR: 'Discord 1555741214014447737. Você tem 6 de memória, ST24-05 GeoGreymon, três BT26-091 Yoshino Fujieda (a primeira com 2 cards embaixo), ST24-10 Lilamon e ST24-11 Rosemon na mão. O bot tem 3 Digimon. Encerre a criação e recuse o [Início da Sua Fase Principal] das três Yoshino. 1) Evolua o GeoGreymon para a Lilamon. 2) No [Ao Evoluir] da Lilamon, suspenda 1 Digimon do bot, descarte os 2 cards de baixo da primeira Yoshino e evolua para a Rosemon. 3) No [Ao Evoluir] da Rosemon, suspenda os outros 2 Digimon do bot. Cada Yoshino ativa uma vez por evento: a primeira Yoshino ativa só uma vez pelos 2 cards descartados juntos, e a suspensão dupla da Rosemon ativa cada Yoshino uma vez. Na janela de ordem, efeitos iguais em "Resolvem depois destes" aparecem numa linha com ×N, a lista rola sozinha e o botão de resolver continua visível.',
    en: "Discord 1555741214014447737. You have 6 memory, ST24-05 GeoGreymon, three BT26-091 Yoshino Fujieda (the first with 2 cards under it), and ST24-10 Lilamon and ST24-11 Rosemon in hand. The bot has 3 Digimon. End breeding and decline all three Yoshinos' [Start of Your Main Phase]. 1) Digivolve GeoGreymon into Lilamon. 2) On Lilamon's [When Digivolving], suspend 1 of the bot's Digimon, trash the 2 cards under the first Yoshino, and digivolve into Rosemon. 3) On Rosemon's [When Digivolving], suspend the bot's other 2 Digimon. Each Yoshino triggers once per event: the first Yoshino triggers only once for the 2 cards trashed together, and Rosemon's double suspend triggers each Yoshino once. In the order prompt, identical entries under \"Resolve after these\" share one row with ×N, that list scrolls on its own, and the resolve button stays in view.",
  },
  "arena-bt26-yoshino-match-b3759aa7": {
    ptBR: 'Discord 1555741214014447737, partida de produção b3759aa7 às 00:36:55 UTC. Você tem 4 de memória, Agumon (ST24-04) sobre Pinamon, três BT26-091 Yoshino Fujieda com os cards virados para baixo do log, Ravemon em campo, 1 card de segurança e GeoGreymon, Lilamon, Ravemon e dois Crowmon na mão. O bot tem Dynasmon e Candlemon ativos, Wisemon, Mistymon e duas Kari Kamiya suspensos. Encerre a criação e recuse o [Início da Sua Fase Principal] das três Yoshino. 1) Evolua o Agumon para GeoGreymon pelo custo alternativo (2). 2) Evolua para Lilamon. No [Ao Evoluir], suspenda o Dynasmon, descarte os 2 cards de baixo da primeira Yoshino e evolua para o Ravemon. 3) No [Ao Evoluir] do Ravemon, escolha "Delete this Digimon" e recuse impedir a saída. A janela de [Ao Deletar] mostra Pinamon e Ravemon uma vez cada, e as Yoshino aparecem numa linha com ×N em "Resolvem depois destes", com o botão de resolver visível. 4) Resolva o Pinamon: descarte o card de baixo de uma Yoshino e jogue o Peckmon da lixeira. 5) Quando a vez das Yoshino chegar, aceite: ela suspende e evolui o Peckmon para o Crowmon da mão com custo 1 a menos.',
    en: 'Discord 1555741214014447737, production match b3759aa7 at 00:36:55 UTC. You have 4 memory, Agumon (ST24-04) on Pinamon, three BT26-091 Yoshino Fujieda with the face-down cards from the log, Ravemon in play, 1 security card, and GeoGreymon, Lilamon, Ravemon and two Crowmon in hand. The bot has Dynasmon and Candlemon active, and Wisemon, Mistymon and two Kari Kamiya suspended. End breeding and decline all three Yoshinos\' [Start of Your Main Phase]. 1) Digivolve Agumon into GeoGreymon for its alternate cost (2). 2) Digivolve into Lilamon. On its [When Digivolving], suspend Dynasmon, trash the 2 cards under the first Yoshino, and digivolve into Ravemon. 3) On Ravemon\'s [When Digivolving], choose "Delete this Digimon" and decline preventing the leave. The [On Deletion] prompt lists Pinamon and Ravemon once each, and the Yoshinos share one ×N row under "Resolve after these" with the resolve button in view. 4) Resolve Pinamon: trash the bottom card under a Yoshino and play Peckmon from the trash. 5) When a Yoshino\'s turn comes, accept: it suspends and digivolves Peckmon into a Crowmon from hand with the cost reduced by 1.',
  },
  "arena-bt22-rie-kishibe-delete-without-digivolve": {
    ptBR: "Você tem 5 cards de segurança, BT22-090 Rie Kishibe e EX13-074 Rie Kishibe ([CS]) em campo, e BT19-073 e EX13-064 LordKnightmon na mão. Encerre seu turno. O [Fim do Seu Turno] da BT22-090 deve oferecer deletar a EX13-074: aceite. A EX13-074 vai para a lixeira, mas a BT22-090 não evolui, porque nenhuma LordKnightmon cumpre o requisito com mais de 3 cards de segurança. As duas LordKnightmon ficam na mão.",
    en: "You have 5 security cards, BT22-090 Rie Kishibe and EX13-074 Rie Kishibe ([CS]) in play, and BT19-073 and EX13-064 LordKnightmon in hand. End your turn. BT22-090's [End of Your Turn] must offer to delete EX13-074: accept. EX13-074 goes to the trash, but BT22-090 does not digivolve, because no LordKnightmon meets its requirement with more than 3 security cards. Both LordKnightmon stay in hand.",
  },
  "arena-bt22-rie-kishibe-legal-digivolve": {
    ptBR: "GitHub #5290. Você tem 3 cards de segurança, BT22-090 Rie Kishibe e BT22-083 Yuuko Kamishiro ([CS]) em campo, e EX13-064 LordKnightmon na mão. Encerre a criação e depois encerre seu turno. Aceite o [Fim do Seu Turno] da Rie, delete a Yuuko e escolha a LordKnightmon. A Rie evolui para EX13-064 pagando 2 de memória (5 menos 3), compra 1 card e fica como card de evolução. A Yuuko fica na lixeira. Com 4 ou mais cards de segurança, essa evolução é ilegal, mesmo que você aceite pagar a deleção.",
    en: "GitHub #5290. You have 3 security cards, BT22-090 Rie Kishibe and BT22-083 Yuuko Kamishiro ([CS]) in play, and EX13-064 LordKnightmon in hand. End breeding, then end your turn. Accept Rie's [End of Your Turn], delete Yuuko, and choose LordKnightmon. Rie digivolves into EX13-064 for 2 memory (5 minus 3), draws 1 card, and becomes a digivolution card. Yuuko stays in the trash. At 4 or more security cards, this evolution is illegal even if you accept paying the deletion.",
  },
  "arena-bt24-skullbaluchimon-simultaneous-delete": {
    ptBR: "Discord 1557502317098573905. Você tem 7 de memória e BT24-075 SkullBaluchimon e um Monodramon na mão. O bot tem Monodramon (nível 3) e Kokatorimon (nível 4). Encerre a criação e jogue o SkullBaluchimon. No [Ao Jogar], aceite descartar o Monodramon e escolha os dois alvos. Os dois Digimon do bot são deletados juntos, numa única deleção, e não um depois do outro.",
    en: "Discord 1557502317098573905. You have 7 memory, and BT24-075 SkullBaluchimon and a Monodramon in hand. The bot has Monodramon (level 3) and Kokatorimon (level 4). End breeding and play SkullBaluchimon. On its [On Play], accept trashing Monodramon and choose both targets. Both of the bot's Digimon are deleted together in a single deletion, not one after the other.",
  },
  "arena-lm-gundramon-simultaneous-delete": {
    ptBR: "Discord 1557502317098573905. Você tem LM-067 Gundramon em campo com 3 cards de texto [Three Musketeers] como cards de evolução. O bot tem Monodramon, Muchomon e Armadillomon (custo 7 ou menos) e um BT6-065 Gundramon de custo 11. Encerre a criação e ataque o jogador com o Gundramon. No [Ao Atacar], descarte os 3 cards de evolução e escolha 3 alvos. Os 3 Digimon do bot são deletados juntos, numa única deleção, depois que os 3 cards são descartados.",
    en: "Discord 1557502317098573905. You have LM-067 Gundramon in play with 3 [Three Musketeers] text cards as digivolution cards. The bot has Monodramon, Muchomon and Armadillomon (play cost 7 or lower) and a play cost 11 BT6-065 Gundramon. End breeding and attack the player with Gundramon. On its [When Attacking], trash the 3 digivolution cards and choose 3 targets. The bot's 3 Digimon are deleted together in a single deletion, after all 3 cards are trashed.",
  },
  "arena-bt20-omnimon-each-player-survivor": {
    ptBR: "Reproduz a partida do Discord. É o turno do bot. Você não tem Digimon em campo, tem 2 cards de segurança, BT13-007 King Drasil_7D6 na criação com BT20-083 Omekamon embaixo, e BT20-102 Omnimon (X Antibody) na mão. O WarGreymon do bot ataca você. Quando sua segurança for removida, aceite jogar o Omekamon. No [Ao Jogar] dele, aceite evoluir para o Omnimon (X Antibody). Seu Omnimon é o seu único Digimon, então ele é o seu escolhido; a escolha seguinte deve listar só os Digimon do bot, sem selo de deletar. Escolha um: o outro é deletado, depois devolva o escolhido ao fundo do deck. Seu Omnimon (X Antibody) deve continuar em campo.",
    en: "Reproduces the Discord match. It is the bot's turn. You have no Digimon in play, 2 security cards, BT13-007 King Drasil_7D6 in the breeding area with BT20-083 Omekamon under it, and BT20-102 Omnimon (X Antibody) in hand. The bot's WarGreymon attacks you. When your security is removed, accept playing Omekamon. On its [On Play], accept digivolving into Omnimon (X Antibody). Your Omnimon is your only Digimon, so it is your chosen one; the next choice must list only the bot's Digimon, with no delete badge. Choose one: the other is deleted, then return the chosen one to the deck bottom. Your Omnimon (X Antibody) must stay in play.",
  },
  "arena-github-5346-blast-dna-decision": {
    en: "End breeding, pass the turn, and decline WarGreymon's end-of-turn DNA. When the opponent attacks, decline Blocker and choose Omnimon ACE for Counter. Choose field WarGreymon + a MetalGarurumon from hand. Three physical DNA routes are available before activation. After DNA, Counter must disappear and Omnimon must ask for the opponent's Digimon: select it and confirm to return it to the deck bottom. Alternatively skip that return; the sole remaining Digimon is then deleted automatically. A repeated Counter answer must not restore the consumed material choices. This focused scenario uses a passive attacker; the regression also covers the reported Shoutmon EX6.",
    ptBR: "Encerre a criação, passe o turno e recuse o DNA de fim de turno do WarGreymon. Quando o oponente atacar, recuse Bloqueador e escolha Omnimon ACE no Contra-ataque. Escolha WarGreymon do campo + um MetalGarurumon da mão. Há três rotas físicas de DNA antes da ativação. Após o DNA, o Contra-ataque deve desaparecer e Omnimon deve pedir o Digimon oponente: selecione e confirme para devolvê-lo ao fundo do deck. Ou pule essa devolução; o único Digimon restante será excluído automaticamente. Uma resposta repetida de Contra-ataque não deve restaurar materiais consumidos. Este cenário usa um atacante sem efeitos; a regressão também cobre o Shoutmon EX6 reportado.",
  },
  "arena-bt20-ouryuken-blast-dna-counter": {
    ptBR: "Reproduz o Counter da partida de zeroxbass: Alphamon EX13-060 em campo, duas cópias de Ouryuken ACE BT20-060 e duas de Ouryumon BT20-018 na mão. Pule a criação e encerre o turno, recusando jogar Ouryumon pelo Alphamon. O Lanamon BT12-024 do bot ataca: recuse o redirecionamento herdado do Grademon. Escolha um ACE destacado na mão e clique no botão Blast DNA no painel de Counter, sem precisar tocar no Alphamon do campo. As cópias idênticas de Ouryumon aparecem em uma única opção. Só o ACE escolhido e uma cópia de Ouryumon são consumidos; o outro par fica na mão. O When Digivolving aplica -15000 no Lanamon, descarta uma segurança do bot e recupera uma sua antes de deletar o atacante. Não ocorre security check. Passar Counter recusa a evolução e deixa o ataque continuar.",
    en: "Reproduces zeroxbass's Counter: EX13-060 Alphamon in play, two BT20-060 Ouryuken ACEs and two BT20-018 Ouryumons in hand. Skip breeding and end your turn, declining Alphamon's optional Ouryumon play. The bot's BT12-024 Lanamon attacks: decline Grademon's inherited attack redirection. Choose a highlighted ACE in your hand and click Blast DNA in the Counter rail, without tapping Alphamon on the field. Identical Ouryumon copies share one option. Only the selected ACE and one Ouryumon copy are consumed; the other pair stays in hand. When Digivolving applies -15000 to Lanamon, trashes one bot security and recovers one of yours before deleting the attacker. No security check occurs. Pass Counter declines evolution and lets the attack continue.",
  },
  "arena-github-5323-alphamon-main-dna": {
    en: "GitHub #5323 current-behavior check: end breeding, select BT20-060 Ouryuken in hand, choose DNA and both field Digimon (EX13-060 Alphamon and BT20-018 Ouryumon). Confirm the printed cost-0 route. Both materials merge, Lanamon gets -15000 DP, one bot security is trashed and you recover one. Memory rises from 7 to 10. Reset for the paid control: ordinary Digivolve onto Alphamon costs 6, leaves Ouryumon in play and memory at 1, with no security trash or Recovery. These are two separate printed routes.",
    ptBR: "GitHub #5323, verificação do comportamento atual: encerre a criação, selecione Ouryuken BT20-060 na mão, escolha DNA e os dois Digimon do campo (Alphamon EX13-060 e Ouryumon BT20-018). Confirme a rota impressa de custo 0. Os materiais se unem, Lanamon recebe -15000 DP, uma segurança do bot é descartada e você recupera uma. A memória vai de 7 para 10. Reinicie para o controle pago: Digivolver normalmente sobre Alphamon custa 6, mantém Ouryumon no campo e deixa 1 de memória, sem descartar segurança nem recuperar. São duas rotas impressas diferentes.",
  },
  "arena-github-5323-alphamon-blast-dna": {
    en: "GitHub #5323 current-behavior check: Alphamon EX13-060 is in the battle area; Ouryumon BT20-018 and Ouryuken BT20-060 are in hand. Main DNA is unavailable with only one field material. End breeding and your turn, declining Alphamon's optional play. The bot's Lanamon attacks. Select the highlighted Ouryuken in hand and use Blast DNA in the Counter panel: it consumes field Alphamon and hand Ouryumon at no cost, trashes one bot security and recovers one before Lanamon is deleted; no security check occurs. Pass Counter instead to keep both hand cards and let the attack continue. A breeding-area Alphamon cannot be used.",
    ptBR: "GitHub #5323, verificação do comportamento atual: Alphamon EX13-060 está na área de batalha; Ouryumon BT20-018 e Ouryuken BT20-060 estão na mão. DNA na fase principal fica indisponível com apenas um material no campo. Encerre a criação e o turno, recusando jogar pelo Alphamon. O Lanamon do bot ataca. Selecione Ouryuken destacado na mão e use Blast DNA no painel de Counter: consome Alphamon do campo e Ouryumon da mão sem custo, descarta uma segurança do bot e recupera uma antes de deletar Lanamon; não ocorre verificação de segurança. Passe o Counter para manter as duas cartas na mão e deixar o ataque continuar. Alphamon na criação não pode ser usado.",
  },
  "arena-bt20-ouryuken-reduction-resumes": {
    ptBR: "O bot tem BT26-016 Chronomon: Holy Mode (12000 DP) sobre BT26-029 Aegiochusmon: Holy, protegido contra redução de DP pelos seus efeitos até o fim do seu turno. Você tem 3 de memória, BT13-007 King Drasil_7D6 no breeding com 5 cartas de digivolução (uma delas é BT20-060 Alphamon: Ouryuken), BT13-110 Royal Knights of the Purge no campo e outro Ouryuken na mão. Rota 1: jogue o Ouryuken da mão e aceite a redução da King Drasil (custo 9 → 0). O On Play aplica -15000, bloqueado pela proteção; termine o turno e o Chronomon vai a 0 DP no turno do bot e é deletado (ele pode usar o próprio efeito uma vez para ficar, mas sai na verificação seguinte). Rota 2: ative o ＜Delay＞ do Royal Knights of the Purge para jogar o Ouryuken das cartas de digivolução da King Drasil. Pelo texto da option, o On Play do Ouryuken não ativa: nenhum -15000 é aplicado e o Chronomon continua com 12000.",
    en: "The bot has BT26-016 Chronomon: Holy Mode (12000 DP) over BT26-029 Aegiochusmon: Holy, protected from your DP reduction until the end of your turn. You have 3 memory, BT13-007 King Drasil_7D6 in breeding with 5 digivolution cards (one is BT20-060 Alphamon: Ouryuken), BT13-110 Royal Knights of the Purge in the battle area, and another Ouryuken in hand. Route 1: play the Ouryuken from your hand and accept King Drasil's reduction (cost 9 → 0). Its On Play applies -15000, blocked by the protection; end your turn and Chronomon drops to 0 DP on the bot's turn and is deleted (it may use its own effect once to stay, but leaves on the next check). Route 2: activate Royal Knights of the Purge's ＜Delay＞ to play the Ouryuken from King Drasil's digivolution cards. By the Option's text, Ouryuken's On Play does not activate: no -15000 is applied and Chronomon stays at 12000.",
  },
  "arena-mobile-blast-counter-tap": {
    ptBR: 'Teste em modo celular (DevTools → toolbar de dispositivo). A partida começa no turno do bot, e o Phoenixmon ST1-10 dele ataca. Toque no BlackWarGreymon EX10-010 destacado na mão. O painel de Counter deve mostrar o botão "Blast Digivolve": tocar nele faz o Blast sem precisar acertar a carta. Alternativa: toque no Giromon BT13-071 em cima dos selos (×2, escudo de Blocker, +2K). O toque deve escolher o Giromon em vez de abrir a explicação do selo. Nos dois casos o Giromon vira BlackWarGreymon.',
    en: "Test in phone mode (DevTools → device toolbar). The match starts on the bot's turn, and its ST1-10 Phoenixmon attacks. Tap the highlighted EX10-010 BlackWarGreymon in your hand. The Counter rail must show a \"Blast Digivolve\" button: tapping it Blast Digivolves without hitting the card. Alternatively, tap BT13-071 Giromon right on its badges (×2, Blocker shield, +2K). The tap must choose Giromon instead of opening the badge's explanation. Either way, Giromon becomes BlackWarGreymon.",
  },
  "arena-bt24-fugamon-self-trash": {
    ptBR: "Você tem BT24-013 Fugamon em campo e outro Fugamon e um Monodramon na mão. Ataque o jogador com o Fugamon do campo e aceite o [Ao Atacar]: descarte o Monodramon e delete o Monodramon do bot. O Fugamon da mão não deve comprar carta, porque não foi ele que foi descartado.",
    en: "You have BT24-013 Fugamon in play, plus another Fugamon and a Monodramon in hand. Attack the player with the Fugamon in play and accept its [When Attacking]: trash the Monodramon and delete the bot's Monodramon. The Fugamon in hand must not draw a card, because it was not the card trashed.",
  },
  "arena-bt2-kurisarimon-repeat-memory": {
    ptBR: "Reproduz o bug de Oxxo: você tem 1 de memória, Infermon com Kurisarimon BT2-059 nas fontes, Arata BT5-090 em campo e Diaboromon EX6-043 na mão. Pule a criação e evolua o Infermon para Diaboromon (custo 3). Resolva primeiro o [Quando Evolui], aceitando o token, e depois aceite suspender Arata para jogar outro token. Kurisarimon deve ganhar 1 de memória por cada token: -2 → -1 → 0. Seu turno continua com dois tokens e Arata suspenso.",
    en: "Reproduces Oxxo's bug: you have 1 memory, Infermon with BT2-059 Kurisarimon in its sources, BT5-090 Arata in play, and EX6-043 Diaboromon in hand. Skip breeding and digivolve Infermon into Diaboromon (cost 3). Resolve [When Digivolving] first, accepting its token, then accept suspending Arata to play another token. Kurisarimon must gain 1 memory for each token: -2 → -1 → 0. Your turn continues with two tokens and a suspended Arata.",
  },
  "arena-github5310-okuwamon-grandis-memory": {
    ptBR: "Pule a criação. Com 3 de memória, evolua Okuwamon P-075 para GrandisKuwagamon BT9-055 pelo custo impresso de 4. Escolha o Monodramon do bot no [Quando Evolui]. Okuwamon concede o efeito antes de evoluir: a suspensão deve ganhar exatamente 1 de memória, de -1 para 0, mantendo seu turno. Grandis fica com 16000 DP e não deve repetir a suspensão. Este cenário verifica o contrato atual; o relato de 56 ativações ainda não foi reproduzido.",
    en: "Skip breeding. With 3 memory, digivolve P-075 Okuwamon into BT9-055 GrandisKuwagamon for its printed cost of 4. Choose the bot's Monodramon for [When Digivolving]. Okuwamon grants the effect before digivolving: that suspension must gain exactly 1 memory, from -1 to 0, keeping your turn. Grandis stays at 16000 DP and must not repeat the suspension. This scenario verifies the current contract; the reported 56 activations remain unproven.",
  },
  "arena-github5310-grandis-end-of-attack": {
    ptBR: "Pule a criação e ataque a segurança com GrandisKuwagamon BT9-055, que tem GranKuwagamon e Okuwamon P-075 nas fontes. Grandis deve continuar suspenso durante a checagem de segurança e só depois, no [Fim do Ataque], suspender o Monodramon do bot e voltar à posição ativa. Ataque a segurança uma segunda vez: o limite de uma vez por turno deve deixá-lo suspenso ao final. O efeito de memória de Okuwamon não está armado neste cenário; sua herdada concede Perfurante.",
    en: "Skip breeding and attack security with BT9-055 GrandisKuwagamon, with GranKuwagamon and P-075 Okuwamon in its sources. Grandis must stay suspended during the security check, then suspend the bot's Monodramon and unsuspend only at [End of Attack]. Attack security a second time: the once-per-turn limit must leave Grandis suspended afterward. Okuwamon's memory effect is not armed in this scenario; its inherited effect grants Piercing.",
  },
  "arena-bt2-kurisarimon-start-main-memory": {
    ptBR: "Você tem 3 de memória e dois Diaboromon EX6-043, um com Kurisarimon BT2-059 nas fontes. Pule a criação e aceite os dois efeitos de início da Fase Principal para jogar um token de cada vez. Resolva a herdada de Kurisarimon após cada token: a memória deve subir de 3 para 4 e depois para 5. Dois efeitos separados geram dois ganhos; dois tokens simultâneos de um único efeito geram apenas um.",
    en: "You have 3 memory and two EX6-043 Diaboromon, one with BT2-059 Kurisarimon in its sources. Skip breeding and accept both start-of-main effects to play one token at a time. Resolve Kurisarimon's inherited effect after each token: memory must rise from 3 to 4, then to 5. Two separate effects produce two gains; two simultaneous tokens from one effect produce only one.",
  },
  "arena-ex12-metalgarurumon-trash-then-return": {
    ptBR: "Reproduz a partida do Discord. Você tem EX12-032 WereGarurumon em campo, EX12-035 MetalGarurumon na mão e 3 de memória. O bot tem EX6-035 Cherubimon com 1 card de evolução e BT15-034 Salamon sem cards de evolução. Evolua o WereGarurumon para MetalGarurumon pela rota alternativa (custo 3). No [Quando Evolui], o único card de evolução do bot sai do Cherubimon sem escolha: o card deve descolar do Cherubimon e o painel da direita “Cartas de digivolução enviadas ao lixo” deve mostrá-lo. Só depois abre a escolha separada do Digimon que volta ao fundo do deck, com Cherubimon e Salamon. Escolha a Salamon: ela vai para o fundo do deck e o Cherubimon fica em campo.",
    en: "Reproduces the Discord match. You have EX12-032 WereGarurumon in play, EX12-035 MetalGarurumon in hand, and 3 memory. The bot has EX6-035 Cherubimon with 1 digivolution card and BT15-034 Salamon with none. Digivolve WereGarurumon into MetalGarurumon with the alternate route (cost 3). On [When Digivolving], the bot's only digivolution card leaves Cherubimon with no choice: the card must peel off Cherubimon, and the right-hand “Digivolution cards trashed” panel must show it. Only then does the separate return choice open, listing Cherubimon and Salamon. Choose Salamon: it goes to the deck bottom and Cherubimon stays in play.",
  },
  "arena-bt22-palmon-cs-restack": {
    ptBR: "Você tem dois Digimon com BT22-044 Palmon como card de evolução: EX13-077 Omnimon: Merciful Mode (sem o traço [CS]) e BT22-031 GoldNumemon ([CS]). Avance até sua Fase Principal. 1) O Omnimon: Merciful Mode não deve oferecer o [Principal] herdado da Palmon. 2) Ative o [Principal] herdado da Palmon no GoldNumemon e aceite. O GoldNumemon vai para o fundo da pilha, a Palmon fica no topo, você compra 1 card, e o [Seu Turno] da Palmon dá +1 de memória.",
    en: "You have two Digimon with BT22-044 Palmon as a digivolution card: EX13-077 Omnimon: Merciful Mode (no [CS] trait) and BT22-031 GoldNumemon ([CS]). Advance to your main phase. 1) Omnimon: Merciful Mode must not offer Palmon's inherited [Main]. 2) Activate Palmon's inherited [Main] on GoldNumemon and accept. GoldNumemon moves to the bottom of the stack, Palmon becomes the top card, you draw 1 card, and Palmon's [Your Turn] gives +1 memory.",
  },
  "arena-bt12-mikemon-own-battle-only": {
    ptBR: "Você tem 0 de memória, uma GeoGreymon com BT12-036 Mikemon nas fontes e outra GeoGreymon sem fontes. O bot tem dois Monodramon suspensos. Ataque um Monodramon com a GeoGreymon sem fontes: ele é deletado e a memória fica em 0. Depois ataque o outro Monodramon com a GeoGreymon que tem Mikemon: a memória sobe para 1.",
    en: "You have 0 memory, one GeoGreymon with BT12-036 Mikemon in its sources, and another GeoGreymon with no sources. The bot has two suspended Monodramon. Attack one Monodramon with the GeoGreymon that has no sources: it is deleted and memory stays at 0. Then attack the other Monodramon with the GeoGreymon that has Mikemon: memory rises to 1.",
  },
  "arena-bt22-mirei-play-cost-floor": {
    ptBR: "Você tem BT22-089 Mirei Mikagura em campo, e outra BT22-089 (custo 3) e BT22-093 Ami Aiba (custo 4, [CS]) na mão. Avance para a fase principal e aceite o [Início da Sua Fase Principal]: a Mirei volta ao fundo do deck. A escolha deve oferecer só a Ami Aiba; a Mirei de custo 3 fica na mão.",
    en: "You have BT22-089 Mirei Mikagura in play, plus another BT22-089 (cost 3) and BT22-093 Ami Aiba (cost 4, [CS]) in hand. Advance to the main phase and accept [Start of Your Main Phase]: Mirei returns to the deck bottom. The choice must offer only Ami Aiba; the cost 3 Mirei stays in hand.",
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
  "arena-bt24-homeros-neptunemon-timing-choice": {
    ptBR: "Relato de MiMiMi. Encerre a criação e depois a fase Principal sem jogar cartas. Aceite suspender Homeros. Neptunemon oferece a mesma cláusula com dois timings: cada opção deve mostrar seu badge [On Play] ou [When Digivolving]. Escolha qualquer uma: os dois Digimon sem fontes do bot voltam ao fundo do deck, e o Digimon com uma fonte permanece. Homeros fica suspenso e o turno passa normalmente.",
    en: "MiMiMi report. End breeding, then end Main without playing cards. Accept suspending Homeros. Neptunemon offers the same clause at two timings: each option must show its [On Play] or [When Digivolving] badge. Choose either: both opposing Digimon with no sources return to the deck bottom, while the Digimon with one source stays. Homeros remains suspended and the turn passes normally.",
  },
  "arena-bt25-ceresmon-homeros-suspend": {
    ptBR: "Discord 1556518401655054436. Encerre a criação e resolva Homeros: memória de 6 para 7, ele suspende e compra 1. Nenhuma Ceresmon deve ativar, nem a BT25-059 nem a recebida por Succession da BT26-032; Omnimon continua com 17000 DP. Ataque a segurança com Muchomon BT1-013: agora as duas Ceresmon ativam. Escolha Omnimon para ambas. Há 2 Digimon suspensos (Muchomon e Omnimon), então cada efeito dá -6000 DP e Omnimon fica com 5000 DP. Homeros não conta nem consome o uma vez por turno.",
    en: "Discord 1556518401655054436. End breeding and resolve Homeros: memory rises from 6 to 7, it suspends and draws 1. Neither BT25-059 Ceresmon nor its effect received through BT26-032 Succession should trigger; Omnimon stays at 17000 DP. Attack security with Muchomon BT1-013: both Ceresmon effects now trigger. Choose Omnimon for both. With 2 suspended Digimon (Muchomon and Omnimon), each effect gives -6000 DP, leaving Omnimon at 5000 DP. Homeros does not count or spend the once-per-turn effects.",
  },
  "arena-p224-kotone-own-source": {
    ptBR: "Entre na Principal com 3 de memória. Jogue P-224 Kotone Amano da mão e, no [Ao Jogar], coloque AD1-006 Shoutmon X7 sob ela para comprar 1. Com memória 0, ative o [Principal] da Kotone e aceite suspendê-la. X7 deve aparecer para seleção. Escolha X7 e use BT11-015 OmniShoutmon da mão como material de DigiXros. O custo é 10 (13 − 1 da Kotone − 2 do DigiXros), e o turno passa com 10 de memória para o bot. Reprodução do bug 1556113288599834624 e da condição de custo da partida 9b9ea6cc.",
    en: "Enter Main with 3 memory. Play P-224 Kotone Amano from hand and place AD1-006 Shoutmon X7 under her with [On Play] to draw 1. At 0 memory, activate Kotone's [Main] and accept suspending her. X7 must be selectable. Choose X7 and use BT11-015 OmniShoutmon from hand as a DigiXros material. The play costs 10 (13 − 1 from Kotone − 2 from DigiXros), passing the turn with 10 memory for the bot. Reproduces bug 1556113288599834624 and the cost condition in match 9b9ea6cc.",
  },
  "arena-kotone-digixros-pending-attack": {
    ptBR: "Encerre a criação e recuse os efeitos do início da Main. Jogue Shoutmon X7 da mão sem DigiXros e recuse seus efeitos e o ataque de Taiki. Ative Kotone para jogar Shoutmon EX6: selecione Taiki BT10-087, escolha os materiais sob ele e use OmniShoutmon + RaptorSparrowmon. Resolva o On Play de EX6 antes de Taiki e aceite jogar ShootingStarmon. Recuse o ataque de ShootingStarmon; depois aceite o ataque pendente de EX6 via Taiki BT21-083, escolha a segurança e recuse Alliance. EX6 deve atacar com Rush herdado; ambos os Taikis ficam suspensos.",
    en: "End breeding and decline the Start of Main effects. Play Shoutmon X7 from hand without DigiXros; decline its effects and Taiki's attack. Activate Kotone to play Shoutmon EX6: select Taiki BT10-087, choose the materials under it, and use OmniShoutmon + RaptorSparrowmon. Resolve EX6's On Play before Taiki and accept playing ShootingStarmon. Decline ShootingStarmon's attack, then accept EX6's pending attack through Taiki BT21-083, target security and decline Alliance. EX6 must attack with inherited Rush; both Taikis end suspended.",
  },
  "arena-bt6-beelstarmon-duplicate-cost": {
    ptBR: "Encerre a criação e jogue uma BT6-112 BeelStarmon da mão. Há outra cópia na mão e sete redutores no lixo (uma BeelStarmon e seis Options de custo 7). O custo impresso 12 deve cair para 5 apenas uma vez: a memória vai de 6 para 1, não para 6. Depois, resolva o Ao Jogar escolhendo uma Option do lixo.",
    en: "End breeding and play one BT6-112 BeelStarmon from hand. Another copy is in hand and seven reducers are in trash (one BeelStarmon and six cost-7 Options). Its printed cost 12 must fall to 5 only once: memory goes from 6 to 1, not stay at 6. Then resolve On Play by choosing an Option from trash.",
  },
  "arena-bt20-saviorhuckmon-end-turn-sistermon": {
    ptBR: "Encerre a criação. Evolua a BaoHuckmon para BT20-014 SaviorHuckmon da mão: custo 3, a memória vai de 5 para 2. Aceite o ＜Delay＞ de The Sistermon Sisters Training Gym e jogue a BT23-077 Sistermon Ciel da mão. Os efeitos de SaviorHuckmon e da Sistermon Ciel deletam os dois Monodramon do bot. Encerre o turno: no [Fim do Seu Turno], SaviorHuckmon oferece suspender a Sistermon Ciel e evoluir para BT13-017 Jesmon da mão sem pagar o custo. Aceite: a Sistermon Ciel fica suspensa e SaviorHuckmon vira Jesmon.",
    en: "End breeding. Digivolve BaoHuckmon into BT20-014 SaviorHuckmon from hand: cost 3, memory goes from 5 to 2. Accept The Sistermon Sisters Training Gym's ＜Delay＞ and play BT23-077 Sistermon Ciel from hand. SaviorHuckmon's and Sistermon Ciel's effects delete the bot's two Monodramon. End the turn: on [End of Your Turn], SaviorHuckmon offers to suspend Sistermon Ciel and digivolve into BT13-017 Jesmon from hand without paying the cost. Accept: Sistermon Ciel is suspended and SaviorHuckmon becomes Jesmon.",
  },
  "arena-rock-proganomon-breeding-sources": {
    ptBR: "Discord 1557413340161253496. Encerre a criação sem mover Sunarizamon. Ataque o Monodramon suspenso com EX10-032 Proganomon. Aceite o efeito de descartar fontes e escolha 1 Gotsumon BT4-065 das fontes no campo. Tumblemon EX8-005 na criação não aparece como candidato e fica intacto.",
    en: "Discord 1557413340161253496. End breeding without moving Sunarizamon. Attack suspended Monodramon with EX10-032 Proganomon. Accept the source-trash effect and select 1 Gotsumon BT4-065 from battle-area sources. Tumblemon EX8-005 in breeding is excluded and remains intact.",
  },
  "arena-rock-pyramidimon-breeding-sources": {
    ptBR: "Discord 1557413340161253496. Encerre a criação sem mover Sunarizamon. Ataque o Monodramon suspenso com EX11-044 Pyramidimon. Aceite o efeito de descartar fontes e escolha 3 Gotsumon BT4-065 das fontes no campo. Tumblemon EX8-005 na criação não aparece como candidato e fica intacto.",
    en: "Discord 1557413340161253496. End breeding without moving Sunarizamon. Attack suspended Monodramon with EX11-044 Pyramidimon. Accept the source-trash effect and select 3 Gotsumon BT4-065 from battle-area sources. Tumblemon EX8-005 in breeding is excluded and remains intact.",
  },
  "arena-rock-magneticdramon-breeding-sources": {
    ptBR: "Discord 1557413340161253496. Encerre a criação sem mover Sunarizamon. Ataque o Monodramon suspenso com EX10-036 Magneticdramon. Aceite o efeito de descartar fontes e escolha 3 Gotsumon BT4-065 das fontes no campo. Tumblemon EX8-005 na criação não aparece como candidato e fica intacto. Para Magneticdramon, recuse recolocar fontes; a segurança do bot perde 1 card.",
    en: "Discord 1557413340161253496. End breeding without moving Sunarizamon. Attack suspended Monodramon with EX10-036 Magneticdramon. Accept the source-trash effect and select 3 Gotsumon BT4-065 from battle-area sources. Tumblemon EX8-005 in breeding is excluded and remains intact. For Magneticdramon, decline source replenishment; the bot loses 1 security card.",
  },
  "arena-rock-gravel-hearts-tumblemon-memory": {
    ptBR: "Discord 1557413340161253496. Encerre a criação sem mover Sunarizamon. Recuse trocar Close no início da Principal. Jogue Landramon EX10-028 (memória 6 para 2). Aceite o efeito, descartando o único Gotsumon BT4-065 das fontes do outro Gotsumon BT4-065 no campo; dê os bônus a Proganomon. Aceite suspender Close EX10-063 (+1 memória: 3). Aceite Gravel Hearts e evolua Proganomon para Pyramidimon EX11-044 da mão por 0. Aceite descartar 3 fontes: Tumblemon EX8-005 e os dois Gotsumon BT4-065 sob Pyramidimon. Delete Monodramon. Recuse repor as fontes de Pyramidimon. Tumblemon ganha 1 memória obrigatoriamente (3 para 4), sem confirmação opcional; o Tumblemon na criação fica intacto.",
    en: "Discord 1557413340161253496. End breeding without moving Sunarizamon. Decline replacing Close at the start of Main. Play EX10-028 Landramon (memory 6 to 2). Accept its effect, trashing the single Gotsumon BT4-065 source under the other battle-area Gotsumon BT4-065; give the bonuses to Proganomon. Accept suspending EX10-063 Close (+1 memory: 3). Accept Gravel Hearts and evolve Proganomon into hand EX11-044 Pyramidimon for 0. Accept trashing 3 sources: EX8-005 Tumblemon and both Gotsumon BT4-065 under Pyramidimon. Delete Monodramon. Decline replenishing Pyramidimon sources. Tumblemon mandatorily gains 1 memory (3 to 4) without an optional confirmation; breeding Tumblemon remains intact.",
  },
  "arena-bt25-beelstarmon-option-trash-trigger": {
    ptBR: "Encerre a criação. Ataque o Monodramon suspenso do bot com a sua BT25-085 BeelStarmon (EX7-071 Hurricane Screw Shot está nas fontes dela). No [Ao Atacar], resolva primeiro o efeito que desuspende; aceite e pague descartando Hurricane Screw Shot das fontes. BeelStarmon desuspende e o efeito de Hurricane Screw Shot ativa: a memória vai de 5 para 6. Depois recuse usar uma Option. A batalha deleta o Monodramon.",
    en: "End breeding. Attack the bot's suspended Monodramon with your BT25-085 BeelStarmon (EX7-071 Hurricane Screw Shot is in its sources). On [When Attacking], resolve the unsuspend effect first; accept it and pay by trashing Hurricane Screw Shot from the sources. BeelStarmon unsuspends and Hurricane Screw Shot's effect activates: memory goes from 5 to 6. Then decline using an Option. The battle deletes Monodramon.",
  },
  "arena-bt20-last-guardian-omnimon-wipe": {
    ptBR: 'Discord 1555673696960774224. Encerre a criação. Uma The Last Guardian está no campo desde um turno anterior. Jogue a segunda The Last Guardian da mão (custo 4, memória de 6 para 2): ela revela 3 Tai Kamiya, não adiciona nada e fica no campo. Evolua o Omnimon para BT20-102 Omnimon (X Antibody) (custo 2, memória para 0). No [Ao Digievoluir], escolha Greymon como seu sobrevivente e Monodramon como o do bot. Só a The Last Guardian antiga pode perguntar "Prevent leaving the battle area?", e só uma vez: a jogada neste turno não pode usar ＜Delay＞. Aceite: um card por vez, a antiga se quebra, depois o Garurumon do bot, e por fim o Monodramon voa para o fundo do deck do bot. Greymon, Omnimon (X Antibody) e a nova The Last Guardian ficam no campo. A escolha do seu sobrevivente mostra a primeira frase do efeito; a do bot mostra a frase do "Then", pois é esse Digimon que volta ao deck.',
    en: "Discord 1555673696960774224. End breeding. One The Last Guardian has been in the battle area since an earlier turn. Play the second The Last Guardian from hand (cost 4, memory 6 to 2): it reveals 3 Tai Kamiya, adds nothing, and stays in the battle area. Digivolve Omnimon into BT20-102 Omnimon (X Antibody) (cost 2, memory to 0). On [When Digivolving], choose Greymon as your survivor and Monodramon as the bot's. Only the earlier The Last Guardian may ask \"Prevent leaving the battle area?\", and only once: the copy placed this turn can't use ＜Delay＞. Accept: one card at a time, the earlier copy breaks, then the bot's Garurumon, and last the bot's Monodramon flies to the bottom of its deck. Greymon, Omnimon (X Antibody), and the new The Last Guardian remain. Your survivor choice shows the effect's first sentence; the bot's shows the \"Then\" sentence, since that Digimon is the one returned to the deck.",
  },
  "arena-ex7-deputymon-option-trash-trigger": {
    ptBR: "Encerre a criação. Evolua o seu Agumon para EX7-010 Deputymon da mão: custo 2, a memória vai de 5 para 3. Aceite o [Ao Digivolver] e descarte P-180 Bind Red Trigger das fontes do seu Monodramon. O efeito de Bind Red Trigger ativa e deleta o Muchomon do bot (5000 DP).",
    en: "End breeding. Digivolve your Agumon into EX7-010 Deputymon from hand: cost 2, memory goes from 5 to 3. Accept its [When Digivolving] and trash P-180 Bind Red Trigger from your Monodramon's sources. Bind Red Trigger's effect activates and deletes the bot's Muchomon (5000 DP).",
  },
  "arena-bt22-leopardmon-king-drasil": {
    ptBR: "A criação passa automaticamente. No início da Principal, King Drasil coloca Ouryuken ACE BT20-060 e Leopardmon ACE BT22-052 embaixo de si. Escolha Ouryuken como posição 1 (mais perto do fundo), depois Leopardmon. As duas saídas são simultâneas: Leopardmon deve ganhar 2 de memória antes de sair, de 3 para 5, em qualquer ordem das fontes. Ambos ficam embaixo de Drasil; não há Overflow.",
    en: "Breeding skips automatically. At the start of Main, King Drasil places Ouryuken ACE BT20-060 and Leopardmon ACE BT22-052 under itself. Choose Ouryuken as position 1 (nearest the bottom), then Leopardmon. Both leave simultaneously: Leopardmon must gain 2 memory before leaving, from 3 to 5, regardless of stack order. Both stay under Drasil; no Overflow applies.",
  },
  "arena-bt13-king-drasil-source-count": {
    ptBR: "O turno abre direto na Principal: King Drasil_7D6 já colocou o Digi-Ovo do topo embaixo de si e tem 3 fontes. Jogue Omekamon (memória 10 para 5) e, no Ao Jogar, coloque Kentaurosmon embaixo de King Drasil: agora são 4 fontes. Jogue Jesmon e aceite a redução: o custo 12 cai 4 + 4 e a memória vai de 5 para 1, não para 0.",
    en: "The turn opens in Main: King Drasil_7D6 has already placed the top Digi-Egg under itself and holds 3 sources. Play Omekamon (memory 10 to 5) and, on its On Play, place Kentaurosmon under King Drasil: it now holds 4 sources. Play Jesmon and accept the reduction: cost 12 falls by 4 + 4 and memory goes from 5 to 1, not to 0.",
  },
  "arena-ui-ex11-cool-boy-hand-selection": {
    ptBR: "Discord 1557581905220730932. Encerre a criação. Há 6 de memória e um Cool Boy EX11-071 no campo. A mão começa com duas cópias físicas de HoverEspimon BT20-050 (LIBERATOR, custo 4), seguidas de Cool Boy EX11-071 (custo 3, inelegível). Ative o Principal do Cool Boy no campo e aceite devolvê-lo ao fundo do deck. Com a seleção aberta, toque em um dos dois HoverEspimon à esquerda sem precisar de Ver tabuleiro, depois confirme. Só a cópia escolhida entra no campo; paga 4−2=2, a memória fica em 4 e o outro HoverEspimon e o Cool Boy da mão permanecem. Reinicie e escolha a outra cópia. Compare retrato, paisagem e aparelho desdobrado, incluindo rolagem e troca de tamanho durante a seleção. Recusar o custo mantém o Cool Boy no campo e a memória em 6.",
    en: "Discord 1557581905220730932. End breeding. You have 6 memory and EX11-071 Cool Boy in play. The hand starts with two physical BT20-050 HoverEspimon copies (LIBERATOR, play cost 4), followed by EX11-071 Cool Boy (cost 3, ineligible). Activate the field Cool Boy's Main effect and accept returning it to the deck bottom. With selection open, tap either leftmost HoverEspimon without View board, then confirm. Only the selected copy enters play; paying 4−2=2 leaves memory at 4, while the other HoverEspimon and hand Cool Boy remain. Reset and choose the other copy. Compare portrait, landscape and unfolded layouts, including scrolling and resizing during selection. Declining the cost keeps field Cool Boy and memory at 6.",
  },
  "arena-ui-king-drasil-mandatory-order": {
    ptBR: "Discord 1557582469409144852. O turno abre na Principal com 10 de memória: há um King Drasil_7D6 BT13-007 na criação e três cópias físicas dele como fontes. Jogue Royal Knights of the Purge BT13-110 da mão (10→4). Recuse colocar um Digimon embaixo de Drasil. Ao colocar a Option no campo, os três herdados obrigatórios aparecem juntos. Selecione todos, de cima para baixo, ou ordene as três linhas manualmente; a memória só muda ao confirmar Resolver nesta ordem. Cada cópia ganha 1: 4→5→6→7, sem confirmação opcional. Para comparar com efeitos opcionais, abra /dev/effects-lab?scenario=effects-lab-prod-royal-knights, passe a criação e evolua Zudomon BT2-027 em UlforceVeedramon ST8-10: o Ao Digievoluir obrigatório aparece com três Cool Boy BT20-091 opcionais; selecionar todos deve preservar Perguntar/Sim/Não.",
    en: "Discord 1557582469409144852. Main opens at 10 memory: one BT13-007 King Drasil_7D6 is in breeding with three physical copies as sources. Play BT13-110 Royal Knights of the Purge from hand (10→4). Decline placing a Digimon under Drasil. Placing the Option in the battle area offers all three mandatory inherited effects together. Select all, top to bottom, or order the three rows manually; memory changes only after confirming Resolve in this order. Each copy gains 1: 4→5→6→7, without optional confirmation. For the optional control, open /dev/effects-lab?scenario=effects-lab-prod-royal-knights, pass breeding and evolve BT2-027 Zudomon into ST8-10 UlforceVeedramon: its mandatory When Digivolving appears with three optional BT20-091 Cool Boys; selecting all must preserve Ask/Yes/No.",
  },
  "arena-st12-blanc-rush-second-attack": {
    ptBR: "A criação passa automaticamente. Resolva King Drasil no início da Main. Jogue Omnimon BT13-112, aceite a redução de custo e escolha jogar os Royal Knights de Drasil: Omnimon X BT20-102, Ouryuken ACE BT20-060 e Leopardmon ACE BT22-052. Resolva Leopardmon para jogar Blanc ST12-12 e descarte Tai com Blanc para comprar 2. No fim do turno, aceite Omnimon X, escolha Blanc e ataque a security sem suspender. Ouryuken ganha 3 de memória: de -1 para 2. A Main continua; Blanc mantém Rush e fica ativa. Ataque novamente com Blanc: a opção deve estar disponível, ela suspende e remove a segunda security. Ouryuken não ganha memória outra vez neste turno.",
    en: "Breeding skips automatically. Resolve King Drasil at the start of Main. Play Omnimon BT13-112, accept the cost reduction and choose to play the Royal Knights from Drasil: Omnimon X BT20-102, Ouryuken ACE BT20-060 and Leopardmon ACE BT22-052. Resolve Leopardmon to play Blanc ST12-12, then trash Tai with Blanc to draw 2. At end of turn, accept Omnimon X, choose Blanc and attack security without suspending. Ouryuken gains 3 memory: -1 to 2. Main continues; Blanc keeps Rush and remains unsuspended. Attack again with Blanc: the action must be available, she suspends and removes the second security. Ouryuken does not gain memory again this turn.",
  },
  "arena-bt13-omnimon-later-token-rush": {
    ptBR: "O turno abre direto na Principal: King Drasil_7D6 está na criação com EX13-014 Jesmon e o Digi-Ovo do topo embaixo. Jogue BT13-112 Omnimon e aceite a redução de King Drasil: custo 14 cai 4 + 2, a memória vai de 10 para 2. No Ao Jogar, escolha jogar os Royal Knights: Jesmon entra, King Drasil vai para a lixeira e todos os seus Digimon ganham ＜Rush＞. Depois o efeito de Jesmon dispara: delete o Monodramon do bot e jogue o Token Atho, René & Por. O Token entrou depois do efeito de Omnimon, mas também deve mostrar ＜Rush＞. Ataque o bot com o Token: o ataque é aceito e 1 carta de segurança sai.",
    en: "The turn opens in Main: King Drasil_7D6 is in breeding with EX13-014 Jesmon and the top Digi-Egg under it. Play BT13-112 Omnimon and accept King Drasil's reduction: cost 14 falls by 4 + 2, memory goes from 10 to 2. On its On Play, choose to play the Royal Knights: Jesmon enters, King Drasil goes to the trash, and all your Digimon gain ＜Rush＞. Then Jesmon's effect triggers: delete the bot's Monodramon and play the Atho, René & Por Token. The Token entered after Omnimon's effect, but it must also show ＜Rush＞. Attack the bot with the Token: the attack is accepted and 1 security card is removed.",
  },
  "arena-bt26-zombie-plutomon-removed-trigger": {
    ptBR: "Encerre a criação. Ative o [Principal] herdado de BT22-044 Palmon para colocar a carta do topo no fundo das fontes e comprar 1. Aceite o herdado de BT22-004 e evolua para BT22-056 da mão. Escolha ZombiePlutomon para -3000 DP e De-Digivolve 1. BT26-079 vai para a lixeira e Plutomon permanece em campo. O efeito pendente de ZombiePlutomon não deve ativar nem pedir descarte: sua mão fica com 8 cartas e a do bot com 6.",
    en: "End breeding. Activate BT22-044 Palmon's inherited [Main] to place the top card at the bottom of its sources and draw 1. Accept BT22-004's inherited effect and digivolve into BT22-056 from hand. Target ZombiePlutomon for -3000 DP and De-Digivolve 1. BT26-079 goes to trash while Plutomon stays in play. ZombiePlutomon's pending effect must not activate or request discards: your hand stays at 8 cards and the bot's at 6.",
  },
  "arena-bt25-titamon-trigger-text": {
    ptBR: "Encerre a criação. Evolua Cerberusmon para BT26-059 Plutomon da mão pela rota TS (custo 4). Aceite o efeito e descarte um Monodramon. Há dois BT25-084 Titamon em campo: ambos devem mostrar o efeito de deletar o Digimon adversário de menor DP na escolha de ordem, junto do efeito de Plutomon. Nenhum deles deve mostrar a proteção por descartar 2 cartas. Resolva os efeitos: o Titamon verde do bot é deletado, seus dois Titamon permanecem e a proteção de cada um continua disponível para uma saída real.",
    en: "End breeding. Digivolve Cerberusmon into BT26-059 Plutomon from hand using the TS route (cost 4). Accept its effect and trash a Monodramon. Two BT25-084 Titamon are in play: both must show their lowest-DP deletion effect in the order prompt alongside Plutomon's effect. Neither should show its protection by trashing 2 cards. Resolve the effects: the bot's green Titamon is deleted, both of yours stay in play, and each copy's protection remains available for an actual removal.",
  },
  "arena-bt24-hyogamon-pending-trash-digivolve": {
    ptBR: 'Encerre a criação. Jogue BT24-021 SnowGoblimon (memória 1 para -2). No Ao Jogar, adicione Plutomon e descarte o Plutomon da mão. Os herdados de Salamon e Hyogamon (embaixo de Cerberusmon) disparam juntos: resolva Salamon primeiro e evolua Cerberusmon para Plutomon da lixeira (memória -2 para -5); a evolução compra ZombiePlutomon. No Quando Evolui de Plutomon, descarte ZombiePlutomon e jogue Fugamon da lixeira, depois resolva os efeitos novos. A escolha de ordem desses efeitos novos mostra Hyogamon em "Resolvem depois destes". O herdado de Hyogamon ainda deve ser oferecido: aceite e evolua Plutomon para ZombiePlutomon da lixeira (custo 0). Antes da correção ele sumia e o turno passava.',
    en: "End breeding. Play BT24-021 SnowGoblimon (memory 1 to -2). On its On Play, add Plutomon and trash Plutomon from hand. The inherited effects of Salamon and Hyogamon (under Cerberusmon) trigger together: resolve Salamon first and digivolve Cerberusmon into Plutomon from the trash (memory -2 to -5); the digivolution draws ZombiePlutomon. On Plutomon's When Digivolving, trash ZombiePlutomon and play Fugamon from the trash, then resolve the new effects. The order prompt for those new effects lists Hyogamon under \"Resolve after these\". Hyogamon's inherited effect must still be offered: accept and digivolve Plutomon into ZombiePlutomon from the trash (cost 0). Before the fix it vanished and the turn passed.",
  },
  "arena-ex10-darkness-bagramon-digixros-interrupt": {
    ptBR: "Encerre a criação. Jogue DarknessBagramon da mão por DigiXros, com Bagramon da mão e DarkKnightmon do campo como materiais. O efeito de DarkKnightmon interrompe antes de DarknessBagramon entrar: aceite e escolha ChuuChuumon entre as fontes de DarkKnightmon (ChuuChuumon e Monodramon apenas). A memória continua 16 nesse momento. Depois DarknessBagramon entra com Bagramon e DarkKnightmon embaixo, a memória vai de 16 para 6, e os Ao Jogar de ChuuChuumon e DarknessBagramon aparecem juntos para você escolher a ordem.",
    en: "End breeding. Play DarknessBagramon from hand by DigiXros, with Bagramon from hand and DarkKnightmon from the field as materials. DarkKnightmon's effect interrupts before DarknessBagramon enters: accept and choose ChuuChuumon from DarkKnightmon's sources (only ChuuChuumon and Monodramon). Memory is still 16 at that point. Then DarknessBagramon enters with Bagramon and DarkKnightmon under it, memory goes from 16 to 6, and the On Play effects of ChuuChuumon and DarknessBagramon appear together for you to order.",
  },
  "arena-ex10-tactimon-digixros-material": {
    ptBR: "Encerre a criação. Jogue Bagramon da mão por DigiXros, com SkullKnightmon do campo como material. DigiXros não é um efeito, então o efeito de Tactimon (impedir a saída por efeitos) não deve ser oferecido. SkullKnightmon vai para baixo de Bagramon, Tactimon mantém as 2 fontes e a memória vai de 12 para 1.",
    en: "End breeding. Play Bagramon from hand by DigiXros, with SkullKnightmon from the field as the material. A DigiXros is not an effect, so Tactimon's effect (prevent leaving by effects) must not be offered. SkullKnightmon goes under Bagramon, Tactimon keeps its 2 sources, and memory goes from 12 to 1.",
  },
  "arena-ex10-bagramon-materials-destination": {
    ptBR: "Encerre a criação e recuse colocar uma carta sob Yuu & Nene no início da Principal. Jogue EX10-056 Bagramon usando DigiXros: suspenda EX10-064 Yuu & Nene, escolha EX10-058 sob esse Domador e BT10-073 da lixeira. Apenas essas duas cartas vão para Bagramon; BT10-073 sob Yuu & Nene permanece lá. O custo é 9 (memória 2 para -7). Aceite o Ao Jogar e escolha Monodramon do bot. A próxima escolha deve oferecer apenas Kokatorimon e Izzy Izumi do bot: escolha Izzy, ou reinicie para escolher Kokatorimon. Monodramon vai ao fundo das fontes do escolhido e sua fonte vai para a lixeira. Aceite o Todos os Turnos de Bagramon: suas duas fontes são descartadas e a segurança do bot cai de 5 para 4. Reinicie e recuse esse efeito: ambas as fontes e a segurança devem permanecer.",
    en: "End breeding and decline placing a card under Yuu & Nene at Start of Main. Play EX10-056 Bagramon with DigiXros: suspend EX10-064 Yuu & Nene, select EX10-058 under that Tamer and BT10-073 from trash. Only those two physical cards move under Bagramon; BT10-073 under Yuu & Nene stays there. Pay 9 (memory 2 to -7). Accept On Play and choose the bot's Monodramon. The next choice must offer only the bot's Kokatorimon and Izzy Izumi: choose Izzy, or reset to choose Kokatorimon. Monodramon goes to the chosen host's bottom and its source goes to trash. Accept Bagramon's All Turns: its two sources are trashed and the bot's security falls from 5 to 4. Reset and decline that effect: both sources and security must remain.",
  },
  "arena-bt21-dracomon-start-main": {
    ptBR: "Mova Dracomon X da criação: os dois efeitos devem aparecer juntos. Resolva BT20-007 primeiro, descarte Dracomon EX13-008 e compre Coredramon. Depois resolva BT21-046 e aceite evoluir de graça. Reinicie para testar a ordem inversa: resolver BT21-046 antes da compra consome sua oportunidade.",
    en: "Move Dracomon X out of breeding: both effects should appear together. Resolve BT20-007 first, trash Dracomon EX13-008 and draw Coredramon. Then resolve BT21-046 and accept the free evolution. Reset to try the reverse order: resolving BT21-046 before the draw consumes its opportunity.",
  },
  "arena-bt24-asuna-return-play": {
    ptBR: "Encerre o turno. No início do turno do bot, Asuna Shiroki volta para o fundo do deck como custo e só depois a outra Asuna entra vinda do lixo. A pilha devolvida deve pousar no deck antes de a nova carta aparecer.",
    en: "End your turn. At the start of the bot's turn, Asuna Shiroki returns to the bottom of the deck as its cost, and only then does the other Asuna enter from the trash. The returned stack must land in the deck before the new card appears.",
  },
  "arena-mervamon-effect-assembly": {
    ptBR: "Jogue Mervamon, aceite o efeito, escolha Aegiochusmon: Dark no lixo e use o Lv.4 TB como material de Assembly.",
    en: "Play Mervamon, accept its effect, choose Aegiochusmon: Dark in trash, then use the Lv.4 TB card as its Assembly material.",
  },
  "arena-bt11-analogman-redirect-timing": {
    ptBR: "Jogue GrapLeomon e mande Gaomon atacar o jogador. O efeito Ao Atacar de Gaomon (cada jogador compra 1) deve resolver ANTES de o Analogman do bot suspender e redirecionar o ataque.",
    en: "Play GrapLeomon and order Gaomon to attack the player. Gaomon's When Attacking effect (each player draws 1) must resolve BEFORE the bot's Analogman suspends and redirects the attack.",
  },
  "arena-rina-evade-unsuspend": {
    ptBR: "Começa após Ulforce X virar Veemon, sobreviver ao Arts de Noir com Evade e receber o turno com 5 de memória (custo da Opção). Veemon e Rina EX13 devem desvirar ANTES dos efeitos das Rinas aparecerem. Resolva Rina EX13 primeiro: suspender para comprar é opcional; evoluir em Veedramon por 0 também é opcional. Rina BT11 dá +1 (6); ao entrar na Principal, Rina EX13 dá +1 (7). Se aceitar a compra, Rina EX13 deve continuar suspensa.",
    en: "Starts after Ulforce X became Veemon, survived Noir's Arts deletion with Evade, and received the turn with 5 memory from the Option's cost. Veemon and EX13 Rina must unsuspend BEFORE the Rina effects appear. Resolve EX13 Rina first: suspending to draw is optional; digivolving into Veedramon for 0 is also optional. BT11 Rina gains 1 (6); at Main entry EX13 Rina gains 1 (7). If you accept the draw, EX13 Rina must stay suspended.",
  },
  "arena-bt11-rina-ulforce-effect-choice": {
    ptBR: "Encerre a criação e ataque a segurança com UlforceVeedramon. Resolva primeiro a Rina BT11 e aceite suspendê-la. As duas opções devem mostrar textos diferentes: mudar orientação e devolver os Digimon com menos fontes. Escolha a segunda e aceite: só BT1-013 volta ao fundo do deck; BT1-011 com uma fonte fica. Depois resolva o Ao Atacar de Ulforce.",
    en: "End breeding and attack security with UlforceVeedramon. Resolve BT11 Rina first and accept suspending her. The two options must show different texts: change orientation and return the Digimon with the fewest sources. Choose the second and accept: only BT1-013 returns to the deck bottom; BT1-011 with one source stays. Then resolve Ulforce's When Attacking effect.",
  },
  "arena-bt11-rina-mailmon-suspended-subject": {
    ptBR: "Encerre a criação. Vincule Mailmon ao Gatchmon e escolha o UlforceVeedramon do bot: ele não pode suspender. Termine o turno. Quando Veedramon EX13 atacar, a Rina BT11 pode suspender, mas não pode ativar os efeitos do Ulforce ao lado: o Veedramon que atacou não tem Quando Digivolve. Ulforce deve continuar desvirado e Gatchmon deve permanecer no campo.",
    en: "End breeding. Link Mailmon to Gatchmon and choose the bot's UlforceVeedramon: it cannot suspend. End the turn. When EX13 Veedramon attacks, BT11 Rina may suspend, but cannot activate the adjacent Ulforce's effects: the attacking Veedramon has no When Digivolving effect. Ulforce must stay unsuspended and Gatchmon must remain on the field.",
  },
  "arena-bt11-rina-ulforce-immunity": {
    ptBR: "Encerre a criação e ataque a segurança com Rebootmon. Ao Atacar, vincule Logimon de graça e desuspenda Rebootmon (imunidade a efeitos de Digimon do oponente). Logimon suspende UlforceVeedramon; a Rina do bot ativa o Quando Digivolve de Ulforce. Rebootmon deve ficar; só BT1-013 volta ao fundo do deck.",
    en: "End breeding and attack security with Rebootmon. On When Attacking, link Logimon for free and unsuspend Rebootmon (immune to opponent Digimon effects). Logimon suspends UlforceVeedramon; the bot's Rina activates Ulforce's When Digivolving. Rebootmon must stay; only BT1-013 goes to the deck bottom.",
  },
  "arena-ex12-diarbbitmon-option-trigger-timing": {
    ptBR: "Encerre a criação e use o lado Opção de Diarbbitmon (Truskmore Advance). Suspenda UlforceVeedramon e trave 2 cartas do bot. A Rina e o herdado de AeroVeedramon do bot NÃO podem ativar antes de a Opção terminar. Faça a Digievolução Arts de Bastemon em Diarbbitmon: seus efeitos Quando Digivolve resolvem primeiro e depois os do bot.",
    en: "End breeding and use Diarbbitmon's Option side (Truskmore Advance). Suspend UlforceVeedramon and lock 2 of the bot's cards. The bot's Rina and AeroVeedramon's inherited effect must NOT activate before the Option finishes. Arts Digivolve Bastemon into Diarbbitmon: your When Digivolving effects resolve first, then the bot's.",
  },
  "arena-bt26-cerberusmon-breeding-arts": {
    ptBR: "Encerre a criação e use o lado Opção de Cerberusmon: Werewolf Mode (Inferno Divide). Descarte 1 carta e De-Digivolva 3 o Digimon do bot. Depois, a Digievolução Arts deve oferecer o Guardromon da sua área de criação: escolha-o. Cerberusmon fica na área de criação e não vai para o lixo.",
    en: "End breeding and use Cerberusmon: Werewolf Mode's Option side (Inferno Divide). Trash 1 card and De-Digivolve 3 the bot's Digimon. Arts Digivolve must then offer Guardromon in your breeding area: choose it. Cerberusmon stays in the breeding area and is not trashed.",
  },
  "arena-github-5301-bacchusmon-arts": {
    en: "End breeding. Use BT26-080 Bacchusmon's Option side (Reversal of the Dead) for 5; Deramon's TS trait waives the Purple color requirement. Unsuspend the bot's Monodramon: it is then deleted as the lowest-DP unsuspended Digimon. Arts Digivolve must offer only Deramon, not the red Groundramon. Choose Deramon: Bacchusmon evolves for free and draws 1; decline its optional When Digivolving attack. Restart and decline Arts instead: the Option is trashed and Deramon stays.",
    ptBR: "Encerre a criação. Use o lado Opção de Bacchusmon BT26-080 (Reversal of the Dead) por 5; o traço TS de Deramon dispensa a cor roxa. Desvire Monodramon do bot: ele é deletado como o Digimon desvirado de menor DP. Digievolução Arts deve oferecer só Deramon, não Groundramon vermelho. Escolha Deramon: Bacchusmon evolui de graça e compra 1; recuse o ataque opcional de Quando Digivolve. Reinicie e recuse Arts: a Opção vai ao lixo e Deramon fica.",
  },
  "arena-github-5301-bacchusmon-breeding-arts": {
    en: "End breeding without moving Deramon. Use BT26-080's Option side for 5; Deramon's TS trait in breeding waives the Purple requirement. Unsuspend the bot's Monodramon and resolve its deletion. Arts Digivolve must offer Deramon in breeding, excluding the red Groundramon. Choose Deramon: Bacchusmon stays in breeding, draws 1, and is not trashed. Its When Digivolving effect does not activate in breeding.",
    ptBR: "Encerre a criação sem mover Deramon. Use o lado Opção de BT26-080 por 5; o traço TS de Deramon na criação dispensa a cor roxa. Desvire Monodramon do bot e resolva sua deleção. Digievolução Arts deve oferecer Deramon na criação, excluindo Groundramon vermelho. Escolha Deramon: Bacchusmon fica na criação, compra 1 e não vai ao lixo. Seu Quando Digivolve não ativa na criação.",
  },
  "arena-github-5301-bacchusmon-no-arts-base": {
    en: "End breeding. Use BT26-080's Option side for 5; Dan Yuki's TS trait waives the Purple requirement. Unsuspend the bot's Monodramon, which is then deleted. Groundramon is red Lv.5 and Dan is a Tamer: neither meets Bacchusmon's printed evolution requirement. No Arts choice is offered; the Option is trashed. Compare with the legal-base scenarios.",
    ptBR: "Encerre a criação. Use o lado Opção de BT26-080 por 5; o traço TS de Dan Yuki dispensa a cor roxa. Desvire Monodramon do bot, que é deletado em seguida. Groundramon é nível 5 vermelho e Dan é Domador: nenhum atende ao requisito impresso de Bacchusmon. Arts não é oferecida; a Opção vai ao lixo. Compare com os cenários de base válida.",
  },
  "arena-bt15-leviamon-x-played-subject-left": {
    ptBR: "Encerre a criação e use Night Raid para jogar DemiDevimon do lixo. O ＜Atraso＞ do Biting Crush do bot joga Leviamon, cujo Ao Jogar apaga seus Digimon (DemiDevimon incluso). Mesmo assim, o Leviamon (X Antibody) do lixo do bot deve digievoluir Leviamon (Q4735).",
    en: "End breeding and use Night Raid to play DemiDevimon from the trash. The bot's Biting Crush ＜Delay＞ plays Leviamon, whose On Play deletes your Digimon (DemiDevimon included). The bot's Leviamon (X Antibody) in the trash must still digivolve Leviamon (Q4735).",
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
  "arena-deusmon-sukamon-app-fusion": {
    ptBR: "Espere o bot jogar KingSukamon e transformar seu Warudamon. Termine a Criação no seu turno. Selecione Deusmon: nenhuma rota de App Fusion deve aparecer. Sukamon tem 4000 DP e Cometmon vinculado; mão, memória, fontes, deck e lixo ficam iguais ao cancelar.",
    en: "Wait for the bot to play KingSukamon and transform your Warudamon. End Breeding on your turn. Select Deusmon: no App Fusion route may appear. Sukamon has 4000 DP with Cometmon linked; cancel and verify unchanged hand, memory, sources, deck and trash.",
  },
  "arena-deusmon-healthy-app-fusion": {
    ptBR: "Termine a Criação. Selecione Deusmon e Warudamon: uma rota de custo 0 usa Cometmon. Cancele uma vez e confirme depois. Recuse os dois vínculos opcionais de Deusmon: Warudamon e Cometmon viram fontes, compra 1, sem pagar memória.",
    en: "End Breeding. Select Deusmon and Warudamon: one cost-0 route uses Cometmon. Cancel once, then confirm. Decline both optional Deusmon links: Warudamon and Cometmon become sources, draw 1, spend no memory.",
  },
  "arena-deusmon-reverse-app-fusion": {
    ptBR: "Termine a Criação. Use Deusmon sobre Cometmon com Warudamon vinculado: uma rota de custo 0. Recuse os dois vínculos opcionais; fontes são Cometmon e Warudamon, compra 1, custo 0.",
    en: "End Breeding. App Fuse Deusmon onto Cometmon with Warudamon linked: one cost-0 route. Decline both optional links; sources are Cometmon then Warudamon, draw 1, cost 0.",
  },
  "arena-deusmon-wrong-link-app-fusion": {
    ptBR: "Termine a Criação. Warudamon tem Mienumon vinculado, não Cometmon. Selecione Deusmon: nenhuma rota de App Fusion. Cancele e confira que nenhuma carta ou memória mudou.",
    en: "End Breeding. Warudamon has Mienumon linked instead of Cometmon. Select Deusmon: no App Fusion route. Cancel and verify no card or memory changed.",
  },
  "arena-deusmon-sukamon-effect-fusion": {
    ptBR: "Espere KingSukamon transformar seu Warudamon; termine a Criação. Passe sem suspender o Tamer. Aceite a App Fusion de BT25-089 e selecione Sukamon se solicitado: Deusmon não é candidato; nenhuma fusão ou compra acontece. Confira antes do fim do turno, pois a transformação expira depois.",
    en: "Wait for KingSukamon to transform your Warudamon; end Breeding. Pass without suspending the Tamer. Accept BT25-089 App Fusion and select Sukamon if asked: Deusmon is not a candidate; no fusion or draw occurs. Inspect during the effect, because the rewrite expires after turn end.",
  },
  "arena-deusmon-healthy-effect-fusion": {
    ptBR: "Termine a Criação e passe sem suspender o Tamer. Aceite a App Fusion de BT25-089 e selecione Warudamon e Deusmon se solicitado. Recuse os dois vínculos opcionais: Deusmon vira topo com Warudamon e Cometmon como fontes, compra 1 por fusão.",
    en: "End Breeding and pass without suspending the Tamer. Accept BT25-089 App Fusion and select Warudamon and Deusmon if asked. Decline both optional links: Deusmon becomes top with Warudamon and Cometmon as sources, draw 1 for fusion.",
  },
  "arena-issue-4888-app-fusion": {
    ptBR: "Selecione Mienumon na mão e use App Fusion no Mirrormon com Copipemon vinculado. O custo deve ser 0.",
    en: "Select Mienumon in hand and App Fuse onto Mirrormon, which has Copipemon as its link card. The cost must be 0.",
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
  "arena-sakuyamon-maid-option-timing": {
    ptBR: "Encerre a criação. Evolua Kyubimon em Taomon BT17-035, aceite usar Yellow Scramble e evolua Taomon em Sakuyamon: Maid Mode ST22-06. Os dois Digimon adversários devem permanecer: a nova Maid não reage à Opção que a evoluiu. Depois use Blade of the True; aceite All Turns da Maid para colocar o menor Digimon na segurança e descartar o topo.",
    en: "End breeding. Evolve Kyubimon into BT17-035 Taomon, accept Yellow Scramble and evolve Taomon into ST22-06 Sakuyamon: Maid Mode. Both opposing Digimon must remain: the new Maid does not react to the Option that evolved it. Then use Blade of the True; accept Maid's All Turns to place the lowest-DP Digimon into security and trash the top card.",
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
  "arena-ex13-craniamon-weregarurumon-assembly": {
    ptBR: "Compre a carta do turno e encerre a criação. Jogue Craniamon (EX13-062): selecione WereGarurumon BT23-056 (Lv.5), Guardromon EX13-051 (Lv.4) e Gotsumon EX13-047 (Lv.3) no lixo. WereGarurumon deve estar habilitado. Bokomon (Blocker só herdado) e Monmon (azul) não podem ser selecionados. Confirme Assembly: Craniamon custa 7, recebe os três materiais e a memória vai para 7 do oponente.",
    en: "Draw the turn card and end breeding. Play Craniamon (EX13-062): select WereGarurumon BT23-056 (Lv.5), Guardromon EX13-051 (Lv.4), and Gotsumon EX13-047 (Lv.3) from the trash. WereGarurumon must be selectable. Bokomon (inherited-only Blocker) and Monmon (blue) must stay disabled. Confirm Assembly: Craniamon costs 7, receives all three materials, and memory goes to 7 on the opponent's side.",
  },
  "arena-ex13-magnamon-partition-assembly": {
    ptBR: "Encerre a criação e ataque a segurança com Paildramon (AD1-011). Gaia Force na segurança tentará deletá-lo. Aceite Partition para jogar Magnamon EX13-020 e Vegiemon sem pagar custo. Na escolha de Assembly do Magnamon, selecione o Veemon do seu lixo; Monodramon não deve ser elegível. Magnamon entra com Veemon em suas cartas de digievolução e a memória continua em 5. Você também pode recusar Assembly: Magnamon entra sem Veemon e continua gratuito.",
    en: "End breeding and attack security with Paildramon (AD1-011). The security Gaia Force attempts to delete it. Accept Partition to play EX13-020 Magnamon and Vegiemon without paying their costs. For Magnamon's Assembly, select the Veemon in your trash; Monodramon must not be eligible. Magnamon enters with Veemon in its digivolution cards and memory stays at 5. You may also decline Assembly: Magnamon enters without Veemon and remains free.",
  },
  "arena-ex13-craniamon-assembly": {
    ptBR: "Compre a carta do turno e encerre a criação. Jogue Craniamon (EX13-062) com a memória em 0: o seletor de Assembly deve abrir. Somente Bulbmon (Lv.5), Guardromon (Lv.4) e Gotsumon (Lv.3) devem ser elegíveis; Bokomon (Blocker só herdado) e Monmon (azul) não. Escolha os três: Craniamon custa 7 e a memória vai para 7 do oponente.",
    en: "Draw the turn card and end breeding. Play Craniamon (EX13-062) with memory at 0: the Assembly picker must open. Only Bulbmon (Lv.5), Guardromon (Lv.4), and Gotsumon (Lv.3) may be eligible; Bokomon (inherited-only Blocker) and Monmon (blue) may not. Pick all three: Craniamon costs 7 and memory goes to 7 on the opponent's side.",
  },
  "arena-p220-millenniummon-assembly": {
    ptBR: 'Compre a carta do turno e encerre a criação. Jogue Millenniummon (P-220) com a memória em 0: o seletor de Assembly deve abrir. Escolha Patamon (Lv.3): o outro Lv.3 (Kunemon) e Groundramon (sem o traço) não podem ser elegíveis. Complete com Deltamon (Lv.4) e Kimeramon (Lv.5): Millenniummon custa 8. Recuse "você pode deletar 1 Digimon": a memória vai para 8 do oponente.',
    en: 'Draw the turn card and end breeding. Play Millenniummon (P-220) with memory at 0: the Assembly picker must open. Pick Patamon (Lv.3): the other Lv.3 (Kunemon) and Groundramon (no trait) may not be eligible. Finish with Deltamon (Lv.4) and Kimeramon (Lv.5): Millenniummon costs 8. Decline "you may delete 1 Digimon": memory goes to 8 on the opponent\'s side.',
  },
  "arena-ex9-kimeramon-skullgreymon-assembly": {
    ptBR: "Compre a carta do turno e encerre a criação. Jogue Kimeramon (EX9-074) com a memória em 0: o seletor de Assembly deve abrir e oferecer os seis Lv.4 [DM] e também SkullGreymon (Lv.5 tratado como Lv.4 para o Kimeramon). Escolha os sete: Kimeramon custa 3 e a memória vai para 3 do oponente.",
    en: "Draw the turn card and end breeding. Play Kimeramon (EX9-074) with memory at 0: the Assembly picker must open and offer the six Lv.4 [DM] Digimon plus SkullGreymon (Lv.5, treated as Lv.4 for Kimeramon). Pick all seven: Kimeramon costs 3 and memory goes to 3 on the opponent's side.",
  },
  "arena-bt24-masterblimpmon-assembly": {
    ptBR: "Compre a carta do turno e encerre a criação. Jogue MasterBlimpmon (BT24-062): o seletor de Assembly deve abrir e listar as duas receitas ([Blimpmon] / Tamer [TS]). Somente o Tamer [TS] deve ser elegível; Shamanmon (Digimon [TS]) não. Escolha o Tamer: MasterBlimpmon custa 5 e a memória vai para 5 do oponente.",
    en: "Draw the turn card and end breeding. Play MasterBlimpmon (BT24-062): the Assembly picker must open and list both recipes ([Blimpmon] / [TS] Tamer). Only the [TS] Tamer may be eligible; Shamanmon ([TS] Digimon) may not. Pick the Tamer: MasterBlimpmon costs 5 and memory goes to 5 on the opponent's side.",
  },
  "arena-bt22-boltmon-assembly": {
    ptBR: "Compre a carta do turno e encerre a criação. Jogue Boltmon (BT22-078) com a memória em 0: o seletor de Assembly deve abrir. Depois de escolher uma Candlemon BT15-069, a segunda BT15-069 não pode ser elegível. Escolha os cinco números diferentes: Boltmon custa 6 e a memória vai para 6 do oponente.",
    en: "Draw the turn card and end breeding. Play Boltmon (BT22-078) with memory at 0: the Assembly picker must open. Once one Candlemon BT15-069 is picked, the second BT15-069 may not be eligible. Pick the five different card numbers: Boltmon costs 6 and memory goes to 6 on the opponent's side.",
  },
  "arena-ex13-gotsumon-promo-knightmon": {
    ptBR: "Compre BT1-009, encerre a criação e jogue Gotsumon. Ele revela Tai Kamiya, Knightmon promo (P-111) e Black Scramble. Na escolha da carta com Blocker, Knightmon P-111 deve ser oferecido e ir para a mão; Tai Kamiya e Black Scramble voltam ao fundo do deck.",
    en: "Draw BT1-009, end breeding, and play Gotsumon. It reveals Tai Kamiya, promo Knightmon (P-111), and Black Scramble. The Blocker choice must offer Knightmon P-111 and add it to the hand; Tai Kamiya and Black Scramble return to the bottom of the deck.",
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
  "arena-ex13-examon-option-dp": {
    ptBR: "Compre a carta do turno e encerre a criação. Faça DNA de Wingdramon + Groundramon em Examon EX13-045; ataque a segurança e recuse os efeitos opcionais. Examon fica com 25000 DP e Monochromon com 15000. Alexandrite Memory Boost!, Unleash the Dragon Gene e Tai Kamiya devem continuar sem DP e sem bônus de +10000. Depois use a segunda Alexandrite e jogue Monochromon da mão: a Option continua sem DP e o novo Digimon recebe +10000 até o fim do turno do oponente.",
    en: "Draw the turn card and end breeding. DNA digivolve Wingdramon + Groundramon into EX13-045 Examon; attack security and decline optional effects. Examon reaches 25000 DP and Monochromon reaches 15000. Alexandrite Memory Boost!, Unleash the Dragon Gene, and Tai Kamiya must still have no DP or +10000 bonus. Then use the second Alexandrite and play Monochromon from hand: the Option stays without DP and the new Digimon gets +10000 until the opponent's turn ends.",
  },
  "arena-ex13-examon-battle-win-timing": {
    ptBR: "Faça a DNA digivolução de Wingdramon + Groundramon em Examon. Examon ataca a segurança e depois batalha com o Digimon do bot. O efeito de vencer a batalha não pode resolver sozinho: ele deve aparecer no mesmo prompt de ordem que o efeito de suspensão do Wingdramon e o [When Attacking] do Bebydomon, e você escolhe a ordem.",
    en: "DNA digivolve Wingdramon + Groundramon into Examon. Examon attacks security, then battles the bot's Digimon. The win-battle effect must not resolve on its own: it must appear in the same order prompt as Wingdramon's suspend effect and Bebydomon's [When Attacking], and you choose the order.",
  },
  "arena-ex13-wisemon-witchelny-cost": {
    ptBR: "Reprodução da sequência de Nom (13:40 UTC). Encerre a criação; evolua BT18-036 em BT19-036 Wizardmon (X Antibody) por 0. Aceite colocar BT18-098 no fundo da segurança e suspenda Kari para ganhar 1 memória (8 → 9). Jogue a segunda Kari por 4 (9 → 5). Evolua em EX13-034 Wisemon: devem aparecer o custo regular de 4 e o alternativo de 3. Escolha 3 (5 → 2) e o próprio Wisemon para receber Reboot, Blocker e proteção contra De-Digivolve.",
    en: "Reproduce Nom's sequence (13:40 UTC). End breeding; evolve BT18-036 into BT19-036 Wizardmon (X Antibody) for 0. Accept placing BT18-098 at the bottom of security and suspend Kari to gain 1 memory (8 → 9). Play the second Kari for 4 (9 → 5). Evolve into EX13-034 Wisemon: both regular cost 4 and alternate cost 3 must appear. Choose 3 (5 → 2) and Wisemon itself to receive Reboot, Blocker and De-Digivolve protection.",
  },
  "arena-ex13-chirinmon-cost-choice": {
    ptBR: "Digivolva o Lv.4 [DATA SQUAD] em Chirinmon. O efeito deve perguntar uma vez se você quer usá-lo e, depois, qual custo pagar: a carta do topo da segurança ou a carta virada para baixo sob o Tamer. Nenhum botão deve repetir o texto do efeito.",
    en: "Digivolve the [DATA SQUAD] Lv.4 into Chirinmon. The effect must ask once whether to use it, then which cost to pay: the top security card or the face-down card under the Tamer. No button should repeat the effect text.",
  },
  "arena-bt18-candlemon-data-selection": {
    ptBR: "Discord 1556041043550408755, reprodução reduzida da partida cbd3a09b de Nom contra Sweet JP, às 13:39 UTC. Encerre a criação e jogue Candlemon BT18-030 (custo 3). Ele revela Dynasmon EX13-037, Candlemon BT18-030 e Wizardmon (X Antibody) BT19-036. Na primeira seleção das três cartas reveladas, escolha Dynasmon para amarelo/Data e confirme. Na segunda, as mesmas três cartas aparecem novamente: escolha Wizardmon para Witchelny e confirme; Dynasmon e Candlemon não são elegíveis para Witchelny. Ambos os escolhidos vão à mão e o Candlemon revelado vai ao fundo do deck. Dynasmon tem Witchelny no texto, mas não esse traço. Reinicie e atribua Wizardmon ao grupo amarelo/Data: somente ele vai à mão e você ordena os dois restantes no fundo do deck (Q1050).",
    en: "Discord 1556041043550408755, reduced reproduction of Nom vs Sweet JP, match cbd3a09b at 13:39 UTC. End breeding and play BT18-030 Candlemon (cost 3). It reveals EX13-037 Dynasmon, BT18-030 Candlemon and BT19-036 Wizardmon (X Antibody). In the first selection of the three revealed cards, choose Dynasmon for yellow/Data and confirm. The second selection shows the same three cards again: choose Wizardmon for Witchelny and confirm; Dynasmon and Candlemon are ineligible for Witchelny. Both selections enter the hand and the revealed Candlemon goes to the deck bottom. Dynasmon has Witchelny in its text, but lacks that trait. Restart and assign Wizardmon to the yellow/Data group: only it enters the hand and you order the other two on the deck bottom (Q1050).",
  },
  "arena-bt26-monimon-optional-cost": {
    ptBR: "Ataque um Agumon suspenso com DarkKnightmon (EX10-031), que tem Monimon BT26-006 nas fontes. Recuse o custo: nenhuma das 3 fontes deve ir para a lixeira, a mão e a memória ficam iguais e o ataque continua. Reinicie o cenário e aceite: descarte Monimon e SkullKnightmon P-115. Depois você pode recusar jogar, mantendo as 2 fontes na lixeira, ou jogar Yuu Amano por 1 de memória / ChuuChuumon BT14-057 por 1. O custo exige exatamente 2 fontes; pagar consome o [Uma Vez Por Turno], mesmo sem jogar.",
    en: "Attack a suspended Agumon with DarkKnightmon (EX10-031), which has BT26-006 Monimon in its sources. Decline the cost: none of its 3 sources should enter the trash, hand and memory stay unchanged, and the attack continues. Restart and accept: trash Monimon and P-115 SkullKnightmon. You may then decline to play, leaving both sources in the trash, or play Yuu Amano for 1 memory / BT14-057 ChuuChuumon for 1. The cost requires exactly 2 sources; paying spends [Once Per Turn] even without playing.",
  },
  "arena-bt26-cerberusmon-optional-cost": {
    ptBR: "Discord 1556544429438013471, partida f659486e de taurusfire110 contra bageko3 (05:47:53 UTC). Encerre a criação e evolua o Digimon Nv.4 TS em Cerberusmon BT26-074 pela rota alternativa (custo 3). Na seleção do descarte, confirme sem escolher cartas: a mão e a lixeira ficam iguais e a memória fica em 7. Ataque o bot com Cerberusmon: a seleção volta porque recusar não gastou o Uma Vez Por Turno. Descarte uma carta, aceite usar a Opção e escolha Cerberusmon: Werewolf Mode BT26-056 da lixeira. Inferno Divide custa 1 (3 menos 2); descarte outra carta para a Opção e o DarkTyrannomon Nv.4 do bot regride para Monodramon Nv.3. Reinicie para testar Ao Jogar (custo 7), ou recuse usar a Opção depois de pagar: o descarte continua pago e consome o uso do turno.",
    en: "Discord 1556544429438013471, match f659486e: taurusfire110 vs bageko3 (05:47:53 UTC). End breeding and digivolve the level 4 TS Digimon into BT26-074 Cerberusmon through its alternate route (cost 3). Confirm the trash selection with no cards: hand and trash stay unchanged and memory stays at 7. Attack the bot with Cerberusmon: the selection returns because declining preserved Once Per Turn. Trash a card, accept using the Option and select BT26-056 Cerberusmon: Werewolf Mode from the trash. Inferno Divide costs 1 (3 minus 2); trash another hand card for the Option and the bot's level 4 DarkTyrannomon de-digivolves into level 3 Monodramon. Restart to test On Play (cost 7), or decline using the Option after paying: the card stays trashed and the turn's use is consumed.",
  },
  "arena-bt18-lucemon-optional-hand-cost": {
    ptBR: "Pule a criação. No início da fase principal, escolha Nenhuma seleção para recusar o custo do Lucemon: nenhuma carta vai ao lixo, o oponente não escolhe e você não recupera segurança. Reinicie e descarte Monodramon: se o oponente recusar descartar segurança, você recupera 1; se aceitar, ele descarta a segurança do topo e você não recupera. Depois jogue o Lucemon da mão por 10 e repita o teste do On Play.",
    en: "Skip breeding. At Start of Main, choose No Selection to decline Lucemon's cost: no card is trashed, the opponent gets no choice, and you recover no security. Reset and discard Monodramon: if the opponent declines to trash security, recover 1; if they accept, they trash their top security and you do not recover. Then play the Lucemon in hand for 10 and repeat the On Play test.",
  },
  "arena-ex13-flamewizardmon-optional-cost": {
    ptBR: "Evolua o BT18-030 em EX13-029 FlameWizardmon (custo 2). O [Quando Evolui] deve perguntar se você quer descartar a carta do topo da segurança: recuse. Sua segurança continua com 4 cartas e o Digimon do bot continua com 6000 DP. Depois ataque o bot com o FlameWizardmon: a mesma pergunta volta, porque a recusa não gastou o [Uma Vez Por Turno]. Aceite: o topo da segurança vai para a lixeira, o Digimon do bot cai para 2000 DP e, com 3 cartas na segurança, é deletado.",
    en: "Digivolve BT18-030 into EX13-029 FlameWizardmon (cost 2). Its [When Digivolving] must ask whether to trash your top security card: decline. Your security stays at 4 cards and the bot's Digimon stays at 6000 DP. Then attack the bot with FlameWizardmon: the same question comes back, because declining did not spend the [Once Per Turn]. Accept: the top security card goes to the trash, the bot's Digimon drops to 2000 DP and, with 3 security cards left, it is deleted.",
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
  "arena-github5306-training-use-memory": {
    ptBR: "#5306: controle do comportamento atual. Encerre a criação com 1 de memória e use Treadmill Training da mão. O custo 2 leva a memória a 1 do oponente antes da escolha. Escolha Reppamon entre as duas cartas reveladas; Muchomon vai para o fundo e Training fica no campo. Após resolver tudo, o turno passa ao oponente com 1. O Delay não pode ser ativado no turno em que Training foi colocado.",
    en: "#5306: current-behavior control. End breeding at 1 memory and use Treadmill Training from hand. Its cost of 2 moves memory to the opponent's 1 before the selection. Choose Reppamon among the two revealed cards; Muchomon goes to the bottom and Training stays in play. After everything resolves, the opponent's turn starts at 1. Delay cannot activate on the turn Training was placed.",
  },
  "arena-github5306-training-delay-paid": {
    ptBR: "#5306: controle do comportamento atual. Encerre a criação com 3 de memória. Ative o Delay de Treadmill Training e digievolua Kudamon em Liamon: custo impresso 3 menos 2 = 1, deixando 2 de memória. Training vai para o lixo, Liamon fica sobre Kudamon e você compra 1 carta. Reinicie e recuse a digievolução: Training vai para o lixo, Kudamon fica e a memória continua em 3.",
    en: "#5306: current-behavior control. End breeding at 3 memory. Activate Treadmill Training's Delay and digivolve Kudamon into Liamon: printed cost 3 minus 2 = 1, leaving 2 memory. Training is trashed, Liamon sits over Kudamon, and you draw 1. Restart and decline digivolution: Training is trashed, Kudamon stays, and memory remains at 3.",
  },
  "arena-github5306-training-delay-free": {
    ptBR: "#5306: controle do comportamento atual. Encerre a criação e ative o Delay para digievoluir Kudamon em Reppamon. O custo 2 menos 2 = 0 mantém a memória em 3; não há ganho de memória. Training vai para o lixo, Reppamon fica sobre Kudamon e você compra 1 carta.",
    en: "#5306: current-behavior control. End breeding and activate Delay to digivolve Kudamon into Reppamon. Cost 2 minus 2 = 0 keeps memory at 3; no memory is gained. Training is trashed, Reppamon sits over Kudamon, and you draw 1.",
  },
  "arena-github5306-training-delay-cost-choice": {
    ptBR: "#5306: controle com a combinação vista nos logs, sem atribuição ao jogador. Encerre a criação com 3 de memória e ative o Delay para digievoluir Etemon em MetalEtemon. Escolha a exigência impressa de custo 4: paga 2 e deixa 1. Reinicie e escolha a exigência alternativa de custo 3: paga 1 e deixa 2. Training vai para o lixo e a digievolução compra 1 carta; nenhuma opção ganha memória.",
    en: "#5306: control using a pair observed in logs, without player attribution. End breeding at 3 memory and activate Delay to digivolve Etemon into MetalEtemon. Choose the printed cost-4 requirement: pay 2 and leave 1. Restart and choose the alternate cost-3 requirement: pay 1 and leave 2. Training is trashed and digivolution draws 1; neither choice gains memory.",
  },
  "arena-bt20-dragon-gene-delay-no-dna": {
    ptBR: "Unleash the Dragon Gene está no campo desde um turno anterior ao lado de Slayerdramon, e você não tem [Examon] na mão. Encerre a criação e jogue Aqua Viper (BT4-102), devolvendo Slayerdramon. O ＜Delay＞ deve ser oferecido mesmo sem DNA possível: aceite, Unleash the Dragon Gene vai para o lixo e Slayerdramon volta para a mão.",
    en: "Unleash the Dragon Gene has been in the battle area since an earlier turn beside Slayerdramon, and your hand has no [Examon]. End breeding and play Aqua Viper (BT4-102), returning Slayerdramon. The ＜Delay＞ must still be offered with no legal DNA: accept it, Unleash the Dragon Gene goes to the trash, and Slayerdramon returns to your hand.",
  },
  "arena-bt20-dragon-gene-security": {
    ptBR: "Discord 1557553612228665396. Encerre a criação e o turno sem jogar cartas. Quando o bot atacar sua segurança, aceite o efeito de BT20-093 e escolha Dracomon BT20-007 da mão ou EX3-037 do lixo: só o escolhido entra em jogo, sem custo. EX3-037 também revela 4 cartas: escolha Coredramon e Examon e ordene as restantes. Unleash the Dragon Gene fica no campo. Reinicie e recuse o efeito, ou aceite e escolha Nenhuma seleção: nenhum Dracomon entra, mas a Option ainda fica no campo. Coredramon não é alvo do efeito de segurança, pois ele exige Dracomon no nome.",
    en: "Discord 1557553612228665396. End breeding and your turn without playing cards. When the bot attacks your security, accept BT20-093's effect and choose Dracomon BT20-007 from hand or EX3-037 from trash: only the chosen card enters play, for free. EX3-037 also reveals 4 cards: choose Coredramon and Examon and order the rest. Unleash the Dragon Gene stays in the battle area. Restart and decline the effect, or accept and choose No Selection: no Dracomon is played, but the Option still stays in the battle area. Coredramon is not a security-effect target because this effect requires Dracomon in the name.",
  },
  "arena-bt13-royal-purge-delay-rush": {
    ptBR: "Encerre a criação e resolva o efeito do início da Main de King Drasil. Ative o ＜Delay＞ de Royal Knights of the Purge e escolha BT20-102 Omnimon (X Antibody) entre as cartas de digievolução de King Drasil. Aceite ou recuse a redução de custo e resolva os dois Tamers BT20-091. Omnimon não ativa o Ao Jogar, ganha ＜Rush＞ e deve poder atacar neste turno.",
    en: "End breeding and resolve King Drasil's Start of Main effect. Activate Royal Knights of the Purge's ＜Delay＞ and choose BT20-102 Omnimon (X Antibody) from King Drasil's digivolution cards. Accept or decline the cost reduction and resolve both BT20-091 Tamers. Omnimon's On Play does not activate, it gains ＜Rush＞, and it must be able to attack this turn.",
  },
  "arena-p206-digital-gate-breeding-color": {
    ptBR: "Encerre a criação sem mover Monodramon. Seu único Digimon é Monodramon (vermelho) na área de criação. Ative o ＜Delay＞ de Digital Gate Open: Tai Kamiya (vermelho) deve ser oferecido com custo reduzido em 4 e entrar em jogo; Matt Ishida (azul) não pode ser escolhido.",
    en: "End breeding without moving Monodramon. Your only Digimon is the red Monodramon in the breeding area. Activate Digital Gate Open's ＜Delay＞: the red Tai Kamiya must be offered at 4 less cost and enter play; the blue Matt Ishida can't be chosen.",
  },
  "arena-ex13-merciful-repeat-barrier": {
    ptBR: "Encerre a criação. Ataque Magnadramon suspenso com Omnimon: o bot paga Barrier. Digievolua Omnimon em EX13 Merciful Mode por 2, recuse o ataque opcional e escolha Battle duas vezes, sempre contra Magnadramon. O Barrier herdado de Reppamon deve ser oferecido e pago em cada batalha: Magnadramon permanece no campo e a security do bot cai de 5 para 2.",
    en: "End breeding. Attack the suspended Magnadramon with Omnimon: the bot pays Barrier. Digivolve Omnimon into EX13 Merciful Mode for 2, decline the optional attack, then choose Battle twice, targeting Magnadramon each time. Reppamon's inherited Barrier must be offered and paid for each battle: Magnadramon stays in play and the bot's security drops from 5 to 2.",
  },
  "arena-ex13-merciful-mode-attack-order": {
    ptBR: "Tabuleiro da partida f9505ba7 (Discord 1554922883652784198), turno 6. Encerre a criação. Jogue Omnimon: Merciful Mode com Assembly usando do lixo: WarGreymon, MetalGarurumon, WereGarurumon: Sagittarius Mode, Angemon, MegaKabuterimon e Biyomon. Aceite o ataque, escolha o próprio Merciful Mode e ataque o jogador. São 7 cores, então 3 ativações: as 3 devem resolver (Battle; Recovery só aparece com 5 cartas no lixo do bot) antes da Alliance e dos Ao Atacar herdados de Angemon, WereGarurumon, MetalGarurumon e WarGreymon. A checagem de segurança vem por último.",
    en: "Board of match f9505ba7 (Discord 1554922883652784198), turn 6. End breeding. Play Omnimon: Merciful Mode with Assembly from the trash: WarGreymon, MetalGarurumon, WereGarurumon: Sagittarius Mode, Angemon, MegaKabuterimon, and Biyomon. Accept the attack, choose Merciful Mode itself, and attack the player. Seven colors give 3 activations: all 3 must resolve (Battle; Recovery appears only once the bot has 5 trash cards) before Alliance and the inherited When Attacking effects of Angemon, WereGarurumon, MetalGarurumon, and WarGreymon. The security check comes last.",
  },
  "arena-st17-magnamon-merciful-colors": {
    ptBR: "Issue #4905, partida d20f9c5d. Encerre a criação e jogue Veemon P-117. Digievolua nele Magnamon ST17-13 pela condição alternativa de Veemon. Escolha Omnimon: Merciful Mode como alvo: ele tem 6 cores distintas concedidas pelas fontes (branco, vermelho, azul, preto, verde e amarelo). As 6 cartas de digievolução devem ir ao lixo de uma vez; depois, Merciful sem fontes deve voltar à mão.",
    en: "Issue #4905, match d20f9c5d. End breeding and play P-117 Veemon. Digivolve it into ST17-13 Magnamon using the alternate Veemon requirement. Choose Omnimon: Merciful Mode: its sources grant 6 distinct colors (white, red, blue, black, green, and yellow). All 6 digivolution cards must be trashed together, then the source-free Merciful must return to the hand.",
  },
  "arena-ex13-gallantmon-standoff": {
    ptBR: "Discord 1556325649071870043. Encerre a criação e jogue Gallantmon EX13-015 da mão usando Assembly com WarGrowlmon, Growlmon e Guilmon do trash. Seu Ao Jogar tenta deletar o Gallantmon adversário. Ele pode se proteger tentando deletar seu Gallantmon: Guilmon e Growlmon herdados aumentam o limite para 13000 DP. Aceite sua própria proteção e delete o Guilmon adversário. Seu Gallantmon fica; o custo adversário falha e o Gallantmon dele também é deletado (Q7247). A segurança adversária não muda. Se recusar sua proteção, seu Gallantmon é deletado e o adversário fica.",
    en: "Discord 1556325649071870043. End breeding and play EX13-015 Gallantmon from hand using Assembly with WarGrowlmon, Growlmon and Guilmon in the trash. Its On Play attempts to delete the opposing Gallantmon. That Gallantmon can protect itself by trying to delete yours: inherited Guilmon and Growlmon raise its cap to 13000 DP. Accept your own protection and delete the opposing Guilmon. Your Gallantmon stays; the opposing cost fails and their Gallantmon is also deleted (Q7247). Opposing security stays unchanged. Decline your protection instead to lose your Gallantmon and let theirs survive.",
  },
  "arena-ad1-gallantmon-deletion-attack-order": {
    ptBR: "Discord 1555207697991864380. Encerre a criação. Digievolua WarGrowlmon (com Growlmon embaixo) em Gallantmon. Resolva primeiro o Ao Digievoluir que deleta até 10000 DP: delete 1 DarkTyrannomon e aceite o ataque ao jogador. Growlmon herdado (ganhar 1 memória) e o Ao Atacar de Gallantmon disparam juntos: escolha o Ao Atacar primeiro. Ele deleta o outro DarkTyrannomon, depois Growlmon dá +1 memória uma única vez. Ao Fim do Ataque, WarGrowlmon herdado dá +2 memória.",
    en: "Discord 1555207697991864380. End breeding. Digivolve WarGrowlmon (Growlmon underneath) into Gallantmon. Resolve the When Digivolving effect that deletes up to 10000 DP first: delete 1 DarkTyrannomon and accept the attack on the player. Inherited Growlmon (gain 1 memory) and Gallantmon's When Attacking trigger together: choose When Attacking first. It deletes the other DarkTyrannomon, then Growlmon gains 1 memory only once. At End of Attack, inherited WarGrowlmon gains 2 memory.",
  },
  "arena-bt20-cool-boy-stacked-omekamon": {
    ptBR: "Discord 1555487329328693248. É o turno do bot: o Omnimon dele (15000) ataca você. Bloqueie com o Craniamon (13000, [Royal Knight]). Quando ele for deletado na batalha, as duas Cool Boy abrem juntas o modal de múltiplos efeitos, cada uma com Perguntar/Sim/Não. Ordene as duas, marque Sim nas duas e resolva. Cada uma joga 1 Omekamon da mão sem outra pergunta de sim/não: os 2 Omekamon entram em campo e sua mão fica vazia. O [Seu Turno] da Cool Boy não deve aparecer depois.",
    en: "Discord 1555487329328693248. It is the bot's turn: its Omnimon (15000) attacks you. Block with Craniamon (13000, [Royal Knight]). When it is deleted in battle, both Cool Boys open the multiple-effects modal together, each with Ask/Yes/No. Order both, set Yes on both, and resolve. Each one plays 1 Omekamon from hand with no further yes/no question: both Omekamon enter play and your hand ends empty. Cool Boy's [Your Turn] effect must not appear afterwards.",
  },
  "arena-ex5-attack-priority": {
    ptBR: "O bot ataca com Shoutmon EX6. Os efeitos Ao Atacar e Alliance dele devem resolver antes das reações de MetalEtemon e da herança de Etemon.",
    en: "The bot attacks with Shoutmon EX6. Its When Attacking and Alliance effects must resolve before MetalEtemon and inherited Etemon react.",
  },
  "arena-reboot-timing": {
    ptBR: "Seu turno começa com todos os seus Digimon com Reboot suspensos. Observe a fase de Dessuspensão.",
    en: "Your turn starts with all your Reboot Digimon suspended. Watch the Unsuspend phase.",
  },
  "arena-marcus-alliance": {
    ptBR: "Pule a criação. No início da Principal, aceite pagar 1 de memória para transformar BT12-092 Marcus Damon em um Digimon de 3000 DP (a memória fica em 4). Ataque a segurança do bot com BT23-020 Seadramon. No Alliance, escolha Marcus: a resposta deve ser aceita, Marcus suspende e Seadramon fica com 8000 DP durante o ataque, checando 2 cartas. A segurança do bot cai de 5 para 3. Ao terminar o ataque, Seadramon volta a 5000 DP. Se recusar a transformação no início da Principal, Marcus não deve aparecer como aliado de Alliance.",
    en: "Skip breeding. At the start of Main, accept paying 1 memory to treat BT12-092 Marcus Damon as a 3000 DP Digimon (memory becomes 4). Attack the bot's security with BT23-020 Seadramon. Choose Marcus for Alliance: the answer must be accepted, Marcus suspends, and Seadramon has 8000 DP during the attack and checks 2 cards. The bot's security drops from 5 to 3. Seadramon returns to 5000 DP after the attack. If you decline the transformation at the start of Main, Marcus must not appear as an Alliance ally.",
  },
  "arena-alliance-20": {
    ptBR: "Encerre a criação, ataque com Seadramon e escolha 1 dos outros 19 Digimon para Alliance.",
    en: "End breeding, attack with Seadramon, and choose 1 of the other 19 Digimon for Alliance.",
  },
  "arena-bt21-davis-top-stack": {
    ptBR: "Encerre a criação e ative o efeito Main de Davis. Magnamon deve ir ao lixo e Veemon deve permanecer no campo.",
    en: "End breeding and activate Davis's Main effect. Magnamon should be trashed and Veemon should remain in play.",
  },
  "arena-bt25-shutmon-link-prompt": {
    ptBR: "Encerre a criação e vincule Shutmon da mão ao Digimon Appmon. O seletor de 2 alvos deve mostrar o texto [When Linking] do quadro de vínculo, não o [All Turns] do texto principal.",
    en: "End breeding and link Shutmon from your hand to the Appmon Digimon. The choose-2 prompt must show the link box's [When Linking] text, not the main text's [All Turns] clause.",
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
  "arena-bt18-velgrmon-opponent-cost": {
    ptBR: "Pule a criação e ataque a segurança com Velgrmon. Aceite o efeito de fim do ataque e escolha o KaiserLeomon roxo/amarelo de nível 4 do oponente como custo. Seu Velgrmon e seu KaiserLeomon devem permanecer; o KaiserLeomon do oponente e os dois Digimon de nível 5 devem ser deletados, restando apenas o MetalGarurumon de nível 6 do oponente. Reinicie e recuse o efeito: nenhum Digimon deve ser deletado.",
    en: "Skip breeding and attack security with Velgrmon. Accept the end-of-attack effect and choose the opponent's purple/yellow level 4 KaiserLeomon as the cost. Your Velgrmon and KaiserLeomon must remain; the opponent's KaiserLeomon and both level 5 Digimon must be deleted, leaving only their level 6 MetalGarurumon. Reset and decline the effect: no Digimon should be deleted.",
  },
  "arena-ex5-targetmon-opponent-cost": {
    ptBR: "Pule a criação e ataque o WarGreymon suspenso com Chirinmon. Aceite a herança do Targetmon e escolha o Sukamon do oponente como custo. Chirinmon deve sobreviver com Targetmon na evolução; seu Sukamon e o WarGreymon devem permanecer, e apenas o Sukamon do oponente deve ser deletado. Reinicie e recuse: Chirinmon e Targetmon vão ao lixo e ambos os Sukamon permanecem.",
    en: "Skip breeding and attack the suspended WarGreymon with Chirinmon. Accept Targetmon's inherited effect and choose the opponent's Sukamon as the cost. Chirinmon must survive with Targetmon underneath; your Sukamon and WarGreymon must remain, and only the opponent's Sukamon must be deleted. Reset and decline: Chirinmon and Targetmon go to trash and both Sukamon remain.",
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
  "arena-ex12-susanoomon-later-arrival-dp": {
    ptBR: "Digievolua Susanoomon sobre Nezhamon com o custo alternativo 5: as 4 cores das fontes dão -12000 DP a todos os Digimon adversários no turno. Encerre o turno sem atacar. O Ravemon (BT26-082) com a face para cima na segurança adversária se joga no fim do seu turno e deve ser deletado com 0 DP.",
    en: "Digivolve Susanoomon onto Nezhamon with the alternate cost 5: the 4 source colors give all opposing Digimon -12000 DP for the turn. End the turn without attacking. The face-up BT26-082 Ravemon in the opponent's security plays itself at the end of your turn and must be deleted at 0 DP.",
  },
  "arena-ex13-kingsukamon-machinedramon-dp": {
    ptBR: "Jogue EX13-031 KingSukamon da mão (custo 7), aceite o [Ao Jogar], descarte o Chuumon e escolha o Machinedramon do bot (11000 DP). O efeito muda o DP original, o que não é redução de DP: o Machinedramon deve virar um [Sukamon] branco com 3000 DP.",
    en: "Play EX13-031 KingSukamon from hand (cost 7), accept its [On Play], trash Chuumon, and choose the bot's Machinedramon (11000 DP). The effect changes original DP, which is not a DP reduction: Machinedramon must become a white [Sukamon] with 3000 DP.",
  },
  "arena-ex13-kingsukamon-vulcanusmon-link": {
    ptBR: "O Vulcanusmon do bot tem Divine Arms Version Ω ([Link] [Vulcanusmon]) e Iron Slash ([Link] traço [TS]) linkados. Jogue EX13-031 KingSukamon da mão (custo 7), aceite o [Ao Jogar], descarte o Chuumon e escolha o Vulcanusmon. Ele passa a se chamar [Sukamon], então o Divine Arms deve ir para o lixo do bot e o Vulcanusmon perde ＜Reboot＞ e ＜Security A. +1＞. O Iron Slash continua linkado, porque o traço [TS] não muda.",
    en: "The bot's Vulcanusmon has Divine Arms Version Ω ([Link] [Vulcanusmon]) and Iron Slash ([Link] [TS] trait) linked. Play EX13-031 KingSukamon from hand (cost 7), accept its [On Play], trash Chuumon, and choose Vulcanusmon. Its name becomes [Sukamon], so Divine Arms must go to the bot's trash and Vulcanusmon loses ＜Reboot＞ and ＜Security A. +1＞. Iron Slash stays linked, because the [TS] trait does not change.",
  },
  "arena-ex13-kingetemon-digivolve-rule-check": {
    ptBR: "Encerre a criação e digivolva o seu KingSukamon (EX13-031) em KingEtemon (EX13-035) da mão pelo custo 4. Com KingEtemon, seu Etemon e o Sukamon do bot, há 3 Digimon com [Sukamon]/[Etemon] no nome: o Sukamon do bot cai para 0 DP e vai para o lixo. Você deve receber UM pedido de ordem com o herdado do KingSukamon e o [Ao Digivolver] do KingEtemon. Resolva o KingSukamon primeiro: ele revela 3 cartas e pode jogar o Sukamon (EX13-028). Depois o [Ao Digivolver] do KingEtemon resolve.",
    en: "End breeding and digivolve your KingSukamon (EX13-031) into KingEtemon (EX13-035) from hand for 4. KingEtemon, your Etemon, and the bot's Sukamon make 3 Digimon with [Sukamon]/[Etemon] in their names, so the bot's Sukamon drops to 0 DP and is trashed. You must get ONE order prompt with KingSukamon's inherited effect and KingEtemon's [When Digivolving]. Resolve KingSukamon first: it reveals 3 cards and may play Sukamon (EX13-028). Then KingEtemon's [When Digivolving] resolves.",
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
  "arena-ex10-blastmon-digixros": {
    ptBR: "Encerre a criação e jogue Blastmon da mão com DigiXros. A seleção de materiais deve aceitar 3 cartas [Bagra Army] e parar na terceira: escolha SkullKnightmon, DeadlyAxemon e ChuuChuumon. O custo 13 cai 2 por material, então a memória vai de 7 para 0 e as 3 cartas ficam sob Blastmon. Damemon fica na mão.",
    en: "End breeding and play Blastmon from hand with DigiXros. Material selection must accept 3 [Bagra Army] cards and stop at the third: choose SkullKnightmon, DeadlyAxemon, and ChuuChuumon. The cost of 13 falls by 2 per material, so memory goes from 7 to 0 and all 3 cards end under Blastmon. Damemon stays in hand.",
  },
  "arena-suspend-lock-block": {
    ptBR: "Seu Blocker já começa impedido de suspender. O ataque do bot não deve poder ser bloqueado.",
    en: "Your Blocker starts unable to suspend. It must not be able to block the bot's attack.",
  },
  "arena-issue-5161-larva-breeding": {
    en: "Move Lucemon: Larva from breeding. Printed 0 DP permits the move; Chaos Mode keeps Larva from deletion. The Main phase opens.",
    ptBR: "Mova Lucemon: Larva da criação. DP impresso 0 permite mover; Chaos Mode impede sua deleção. A fase principal começa.",
  },
  "arena-issue-5104-alter-s-sources": {
    en: "End breeding, attack security with Omnimon Alter-S, accept End of Attack, then select Greymon and Garurumon from its sources. Both are played and Alter-S becomes top security.",
    ptBR: "Encerre a criação, ataque a segurança com Omnimon Alter-S, aceite Fim do Ataque e selecione Greymon e Garurumon das fontes. Ambos são jogados; Alter-S vira a segurança do topo.",
  },
  "arena-issue-5115-melting-trash": {
    en: "End breeding, play Yuuki, accept the established Melting Recital Delay and its evolution effect, then select QueenBeemon from trash. The sole legal base is chosen automatically. The emblem is trashed and the base becomes BT19-053 for cost reduced by 3.",
    ptBR: "Encerre a criação, jogue Yuuki, aceite Delay de Melting Recital e seu efeito de evolução; selecione QueenBeemon do lixo. A única base válida é escolhida automaticamente. A opção vai ao lixo e a base vira BT19-053 com custo reduzido em 3.",
  },
  "arena-issue-5129-hyogamon-trash": {
    en: "End breeding, play Ogremon, trash Monodramon, then accept the inherited Hyogamon evolution. Select the Titamon route from trash. Only its own host evolves, with cost reduced by 1.",
    ptBR: "Encerre a criação, jogue Ogremon, descarte Monodramon e aceite a evolução herdada de Hyogamon. Escolha Titamon do lixo. Só a própria base evolui, com custo reduzido em 1.",
  },
  "arena-issue-5129-goblimon-trash": {
    en: "End breeding, play Ogremon, trash Monodramon, then accept the inherited Goblimon evolution. Select the Titamon route from trash. Goblimon must be a source under the Demon/Titan host.",
    ptBR: "Encerre a criação, jogue Ogremon, descarte Monodramon e aceite a evolução herdada de Goblimon. Escolha Titamon do lixo. Goblimon precisa ser fonte sob uma base Demon/Titan.",
  },
  "arena-issue-5125-ulforce-gold": {
    en: "End breeding, play EX13 UlforceVeedramon and select AeroVeedramon, GoldVeedramon and Veemon from trash for Assembly. GoldVeedramon is legal. Cost is 7; decline optional orientation.",
    ptBR: "Encerre a criação, jogue UlforceVeedramon EX13 e selecione AeroVeedramon, GoldVeedramon e Veemon do lixo para Assembly. GoldVeedramon é válido. Custo 7; recuse mudar orientação.",
  },
  "arena-issue-5122-ulforce-bt13": {
    en: "End breeding and inspect BT13 UlforceVeedramon. It has no printed Assembly, so ordinary play costs 11 and the three trash cards remain there. EX13 Ulforce has a separate positive scenario.",
    ptBR: "Encerre a criação e inspecione UlforceVeedramon BT13. Não tem Assembly impresso: jogar custa 11 e as três cartas ficam no lixo. Ulforce EX13 tem cenário positivo separado.",
  },
  "arena-issue-5125-ulforce-bt11": {
    en: "End breeding and inspect BT11 UlforceVeedramon. It has no printed Assembly; ordinary play costs 12. Use the EX13 scenario to verify GoldVeedramon eligibility.",
    ptBR: "Encerre a criação e inspecione UlforceVeedramon BT11. Não tem Assembly impresso: jogar custa 12. Use o cenário EX13 para testar GoldVeedramon.",
  },
  "arena-issue-5128-craniamon": {
    en: "End breeding, play EX13-062, select all 3 trash materials in the Assembly dialog and confirm. Decline optional effects to finish. Each material has printed Blocker at levels 5, 4 and 3.",
    ptBR: "Encerre a criação, jogue EX13-062, selecione os 3 materiais do lixo na janela Assembly e confirme. Recuse efeitos opcionais para concluir. Cada material tem Blocker impresso nos níveis 5, 4 e 3.",
  },
  "arena-issue-5145-slayerdramon": {
    en: "End breeding, play EX13-024, select all 3 trash materials in the Assembly dialog and confirm. Decline optional effects to finish. Materials match Dracomon/Examon text, including an Examon-only level 5.",
    ptBR: "Encerre a criação, jogue EX13-024, selecione os 3 materiais do lixo na janela Assembly e confirme. Recuse efeitos opcionais para concluir. Materiais têm Dracomon/Examon no texto, incluindo nível 5 só com Examon.",
  },
  "arena-issue-5146-breakdramon": {
    en: "End breeding, play EX13-044, select all 3 trash materials in the Assembly dialog and confirm. Decline optional effects to finish. Materials match Dracomon/Examon text at levels 5, 4 and 3.",
    ptBR: "Encerre a criação, jogue EX13-044, selecione os 3 materiais do lixo na janela Assembly e confirme. Recuse efeitos opcionais para concluir. Materiais têm Dracomon/Examon no texto nos níveis 5, 4 e 3.",
  },
  "arena-issue-5140-merciful": {
    en: "End breeding, play EX13-077, select all 6 trash materials in the Assembly dialog and confirm. Decline optional effects to finish. All six are ADVENTURE Digimon and can be assigned distinct Red, Blue, White, Purple, Yellow and Green colors.",
    ptBR: "Encerre a criação, jogue EX13-077, selecione os 6 materiais do lixo na janela Assembly e confirme. Recuse efeitos opcionais para concluir. Os seis são Digimon ADVENTURE e permitem atribuir cores distintas: vermelho, azul, branco, roxo, amarelo e verde.",
  },
  "arena-issue-5154-dantemon": {
    en: "End breeding, play BT26-086, select all 7 trash materials in the Assembly dialog and confirm. Decline optional effects to finish. Seven Digimon must have the Seven Code trait and different names.",
    ptBR: "Encerre a criação, jogue BT26-086, selecione os 7 materiais do lixo na janela Assembly e confirme. Recuse efeitos opcionais para concluir. Sete Digimon precisam ter Seven Code e nomes diferentes.",
  },
  "arena-issue-5156-giant-slayer": {
    en: "End breeding, play BT26-085, select all 5 trash materials in the Assembly dialog and confirm. Decline optional effects to finish. Five different levels with Chronomon text/Shaman trait, including the level 2 Digi-Egg. Seven Code alone is insufficient.",
    ptBR: "Encerre a criação, jogue BT26-085, selecione os 5 materiais do lixo na janela Assembly e confirme. Recuse efeitos opcionais para concluir. Cinco níveis diferentes com Chronomon no texto/Shaman, incluindo Digi-Egg nível 2. Só Seven Code não basta.",
  },
  "arena-github-5270-senbon": {
    en: "End breeding and use Senbon Dokkan. Play both revealed BigMamemon (total cost 14), then select two opposing TS Digimon together. Accept Neptunemon’s suspend protection once: both survive. This additional matching defect was found by the removal sweep.",
    ptBR: "Encerre a criação e use Senbon Dokkan. Jogue os dois BigMamemon revelados (custo total 14), então selecione juntos dois TS adversários. Aceite uma vez a proteção de Neptunemon ao suspendê-lo: ambos sobrevivem. Este defeito adicional foi encontrado na varredura de exclusão.",
  },
  "arena-github-5282-iron-slash": {
    en: "End breeding and use Iron Slash. Select LordKnightmon and choose De-Digivolve 2. LordKnightmon and Rie must both be trashed, exposing Monodramon. Decline the optional link.",
    ptBR: "Encerre a criação e use Iron Slash. Selecione LordKnightmon e escolha De-Digivolve 2. LordKnightmon e Rie devem ir ao lixo, expondo Monodramon. Recuse o vínculo opcional.",
  },
  "arena-github-5282-minervamon": {
    en: "End breeding and play Minervamon. Choose LordKnightmon for the first De-Digivolve 1. It exposes Rie; the next instance cannot start on a Tamer, so Rie and Monodramon remain.",
    ptBR: "Encerre a criação e jogue Minervamon. Escolha LordKnightmon para o primeiro De-Digivolve 1. Ele expõe Rie; a próxima instância não pode iniciar num Tamer, então Rie e Monodramon permanecem.",
  },
  "arena-github-5277-overflow-full-cost": {
    en: "End breeding and play Neptunemon. With only one opposing Digimon its cost stays 12: memory moves from 7 to -5. Bottom-deck Alphamon: Ouryuken ACE; Overflow 5 moves -5 to 0. A final gauge of 0 includes Overflow in this case, as in the production candidate action.",
    ptBR: "Encerre a criação e jogue Neptunemon. Com apenas um Digimon adversário, o custo continua 12: a memória vai de 7 a -5. Envie Alphamon: Ouryuken ACE ao fundo do deck; Overflow 5 leva -5 a 0. Aqui, a memória final 0 inclui Overflow, como na ação candidata dos logs.",
  },
  "arena-github-5277-overflow": {
    en: "End breeding and play Neptunemon for 7 memory. Bottom-deck the opponent’s source-free Alphamon: Ouryuken ACE. Its Overflow 5 must apply once immediately, leaving you at 5 memory. This report passes in the current baseline.",
    ptBR: "Encerre a criação e jogue Neptunemon por 7 de memória. Envie Alphamon: Ouryuken ACE, sem fontes, ao fundo do deck adversário. Overflow 5 deve ocorrer uma vez imediatamente, deixando 5 de memória. Este relato já passa na base atual.",
  },
  "arena-github-5276-overflow": {
    en: "End breeding and play Neptunemon for 7 memory. Bottom-deck the opponent’s source-free Alphamon: Ouryuken ACE. Its Overflow 5 must apply once immediately, leaving you at 5 memory. This report passes in the current baseline.",
    ptBR: "Encerre a criação e jogue Neptunemon por 7 de memória. Envie Alphamon: Ouryuken ACE, sem fontes, ao fundo do deck adversário. Overflow 5 deve ocorrer uma vez imediatamente, deixando 5 de memória. Este relato já passa na base atual.",
  },
  "arena-github-5270-junomon": {
    en: "End breeding and play Junomon: Hysteric Mode without Assembly. Trash all 3 security and select the opposing level 3, 4 and 5 TS Digimon together. Accept Neptunemon’s suspend protection: all three survive one deletion batch. Recover 3 security.",
    ptBR: "Encerre a criação e jogue Junomon: Hysteric Mode sem Assembly. Descarte as 3 seguranças e selecione juntos os TS de nível 3, 4 e 5 adversários. Aceite a proteção de Neptunemon ao suspendê-lo: os três sobrevivem a um único lote de exclusão. Recupere 3 seguranças.",
  },
  "arena-github-5270-hurricane": {
    en: "End breeding and use Hurricane Screw Shot. Select the opposing level 3, 4 and 5 Digimon. Accept Neptunemon’s suspend protection once: all three survive the simultaneous deletion. This interaction already passes in the baseline.",
    ptBR: "Encerre a criação e use Hurricane Screw Shot. Selecione os Digimon adversários de nível 3, 4 e 5. Aceite uma vez a proteção de Neptunemon ao suspendê-lo: os três sobrevivem à exclusão simultânea. Esta interação já passa na base.",
  },
  "arena-github-5270-gundramon": {
    en: "End breeding and attack security with Gundramon. Trash all 3 Three Musketeers sources and select the opposing level 3, 4 and 5 Digimon together. Accept Neptunemon’s suspend protection once: all survive. This interaction already passes in the baseline.",
    ptBR: "Encerre a criação e ataque a segurança com Gundramon. Descarte as 3 fontes Three Musketeers e selecione juntos os Digimon adversários de nível 3, 4 e 5. Aceite uma vez a proteção de Neptunemon ao suspendê-lo: todos sobrevivem. Esta interação já passa na base.",
  },
  "arena-github-5160-super-hacking": {
    en: "Use Happy Bullet Showering to delete the opposing Agumon. Accept Super Hacking and link the trash Appmon to Gatchmon.",
    ptBR: "Use Happy Bullet Showering para deletar Agumon. Aceite Super Hacking e vincule o Appmon do lixo ao Gatchmon.",
  },
  "arena-github-5162-gym-security": {
    en: "Attack security. The Gym must enter the opponent battle area whether the optional Sistermon play is accepted or declined.",
    ptBR: "Ataque a seguran\u00e7a. O Gym deve entrar no campo advers\u00e1rio, aceitando ou recusando jogar Sistermon.",
  },
  "arena-github-5162-gym-empty": {
    en: "Attack security. With no Sistermon available, the Gym still enters the opponent battle area.",
    ptBR: "Ataque a seguran\u00e7a. Sem Sistermon dispon\u00edvel, o Gym ainda entra no campo advers\u00e1rio.",
  },
  "arena-github-5162-gym-suppressed": {
    en: "Attack security with Alphamon. Hisyaryumon’s inherited effect prevents Option Security effects, so Gym goes to trash. This matches the production report.",
    ptBR: "Ataque a segurança com Alphamon. A herança de Hisyaryumon impede efeitos de Segurança de Opções, então Gym vai ao lixo, como na partida reportada.",
  },
  "arena-github-5111-jesmon": {
    en: "Evolve SaviorHuckmon into Jesmon. Select the Sistermon branch, play Sistermon Blanc from trash and decline the extra attack.",
    ptBR: "Evolua SaviorHuckmon para Jesmon. Escolha Sistermon, jogue Blanc do lixo e recuse o ataque extra.",
  },
  "arena-github-5112-plutomon": {
    en: "Attack Agumon. Pay the hand trash cost and play the Titan from trash with cost reduced by 7.",
    ptBR: "Ataque Agumon. Pague o descarte da m\u00e3o e jogue o Titan do lixo com custo reduzido em 7.",
  },
  "arena-github-5116-rizegreymon": {
    en: "Play RizeGreymon. Trash the two face-down Tamer sources and use ST24-07 as an Option.",
    ptBR: "Jogue RizeGreymon. Descarte as duas fontes viradas do Tamer e use ST24-07 como Op\u00e7\u00e3o.",
  },
  "arena-github-5119-cerberusmon": {
    en: "Attack Agumon. Trash the hand card, use Dark Field from trash for 1 memory, then play Goblimon.",
    ptBR: "Ataque Agumon. Descarte a carta da m\u00e3o, use Dark Field do lixo por 1 mem\u00f3ria e jogue Goblimon.",
  },
  "arena-github-5127-zephagamon-option": {
    en: "Use LM-066 as an Option. Suspend the two opposing Digimon to reduce its cost to 4, then choose the lock and bottom-deck target.",
    ptBR: "Use LM-066 como Op\u00e7\u00e3o. Suspenda os dois Digimon advers\u00e1rios para reduzir o custo para 4 e escolha os alvos.",
  },
  "arena-github-5127-zephagamon-protection": {
    en: "Use Happy Bullet Showering on Zephagamon. Its protection can suspend your Agumon as the cost and prevent deletion.",
    ptBR: "Use Happy Bullet Showering em Zephagamon. A prote\u00e7\u00e3o pode suspender seu Agumon como custo e impedir a dele\u00e7\u00e3o.",
  },
  "arena-github-5124-princemamemon": {
    en: "Evolve BigMamemon into PrinceMamemon and choose BigMamemon from the three revealed cards; the other two go to trash.",
    ptBR: "Evolua BigMamemon para PrinceMamemon e escolha BigMamemon entre as tr\u00eas reveladas; as outras v\u00e3o para o lixo.",
  },
  "arena-github-5124-bigmamemon": {
    en: "Evolve the black level 4 into BigMamemon and play the revealed Bokomon.",
    ptBR: "Evolua o n\u00edvel 4 preto para BigMamemon e jogue Bokomon revelado.",
  },
  "arena-github-5136-greymon-recovery": {
    en: "Play Greymon. Select Omnimon Alter-S from trash; Agumon is not eligible.",
    ptBR: "Jogue Greymon. Escolha Omnimon Alter-S no lixo; Agumon n\u00e3o \u00e9 eleg\u00edvel.",
  },
  "arena-github-5144-mastemon-infermon": {
    en: "End your turn and let the bot play Infermon with Arata in play. On your next turn, attack security with Titamon. Mastemon may place Infermon as bottom security; Infermon return/DP protection does not prevent this zone movement.",
    ptBR: "Encerre seu turno e espere o bot jogar Infermon com Arata em campo. No próximo turno, ataque a segurança com Titamon. Mastemon pode colocar Infermon no fundo da seguran\u00e7a; prote\u00e7\u00e3o contra retorno/DP n\u00e3o impede esse movimento.",
  },
  "arena-github-5149-proto-form": {
    en: "End your turn. The bot uses Happy Bullet Showering on your Agumon. Choose Monodramon from its sources to return, then place Proto Form on security.",
    ptBR: "Encerre seu turno. O bot usa Happy Bullet Showering em seu Agumon. Escolha Monodramon das fontes para devolver e coloque Proto Form na segurança.",
  },
  "arena-github-5151-examon-sources": {
    en: "Attack the suspended Muchomon. After winning, play Coredramon from Examon sources and finish the Piercing checks.",
    ptBR: "Ataque Muchomon suspenso. Ap\u00f3s vencer, jogue Coredramon das fontes de Examon e resolva Perfurar.",
  },
  "arena-issue-5106-chuumon-inherited": {
    en: "Attack Omnimon with Etemon. Accept the inherited effect, select Chuumon from trash, and confirm. It enters suspended; the newly deleted inherited Chuumon is also a legal choice.",
    ptBR: "Ataque Omnimon com Etemon. Aceite o efeito herdado, escolha Chuumon do trash e confirme. Ele entra suspenso; o Chuumon recém-deletado da pilha também é válido.",
  },
  "arena-issue-5139-tsunomon-inherited": {
    en: "Attack Kokatorimon with Gomamon. Accept Tsunomon’s inherited effect and return Greymon from trash. Monodramon lacks ADVENTURE and must be excluded.",
    ptBR: "Ataque Kokatorimon com Gomamon. Aceite o herdado de Tsunomon e devolva Greymon do trash. Monodramon não tem ADVENTURE e deve ser excluído.",
  },
  "arena-issue-5141-ukkomon-moving": {
    en: "Move Ukkomon from breeding, add a revealed Digimon, and order the rest. Decline the optional hatch; Main opens automatically.",
    ptBR: "Mova Ukkomon da criação, adicione um Digimon revelado e ordene o restante. Recuse a eclosão opcional; a fase Principal começa automaticamente.",
  },
  "arena-issue-5126-yuuki-end-turn": {
    en: "End breeding and decline Yuuki’s Start of Main discard with No Selection, then end your turn. Accept suspending Yuuki and choose either Loudmon from trash. Monodramon is ineligible.",
    ptBR: "Encerre a criação e recuse o descarte de Yuuki no início da Principal com Nenhuma seleção. Encerre o turno, aceite suspender Yuuki e escolha um dos Loudmon do trash. Monodramon não é válido.",
  },
  "arena-issue-5123-ryugumon-watcher": {
    en: "Play Agumon and resolve Ryugumon first in the effect-order dialog. Its All Turns watcher offers an opposing Digimon: confirm Kokatorimon. It cannot suspend or activate When Digivolving effects until its turn ends. Then confirm Agumon’s remaining deck order.",
    ptBR: "Jogue Agumon. O observador All Turns de Ryugumon oferece um Digimon adversário: confirme Kokatorimon. Ele não pode suspender nem ativar efeitos When Digivolving até o fim do turno dele.",
  },
  "arena-issue-5113-weregarurumon-target": {
    en: "Play WereGarurumon and select the opposing Digimon or Tamer directly on the board. Confirm the target; it cannot suspend until its turn ends.",
    ptBR: "Jogue WereGarurumon e selecione diretamente na mesa o Digimon ou Tamer adversário. Confirme o alvo; ele não pode suspender até o fim do turno dele.",
  },
  "arena-issue-5118-candlemon-main": {
    en: "At Start of Main choose top or bottom security to trash, then draw and gain 1 memory. With two security left, you may put the Witchelny-text Candlemon from hand under security. Playing Candlemon has no printed On Play search.",
    ptBR: "No início da Principal escolha o topo ou fundo da segurança para descartar; compre e ganhe 1 memória. Com duas seguranças, pode colocar Candlemon da mão no fundo da segurança por ter Witchelny no texto. Jogar Candlemon não tem busca On Play.",
  },
  "arena-issue-5142-bt10-087-search": {
    en: "End breeding and play Taiki Kudo. Add Shoutmon X7 to the hand. Choose ZeigGreymon for placement under Taiki. Confirm the remainder’s deck order. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Taiki Kudo. Adicione Shoutmon X7 à mão. Escolha ZeigGreymon para colocar sob Taiki. Confirme a ordem das restantes no deck. A fase Principal deve continuar.",
  },
  "arena-issue-5155-bt12-021-search": {
    en: "End breeding and play Veemon. Add Paildramon and Davis Motomiya to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Veemon. Adicione Paildramon e Davis Motomiya à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5117-bt13-048-search": {
    en: "End breeding and play Salamon. Add Garurumon and Gallantmon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Salamon. Adicione Garurumon e Gallantmon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5148-bt24-043-search": {
    en: "End breeding and play Tapirmon. Add Garurumon and Shamanmon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Tapirmon. Adicione Garurumon e Shamanmon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5132-bt24-044-search": {
    en: "End breeding and play Muchomon. Add Shoto Kazama and Biyomon to the hand. First select Muchomon on the board and confirm its suspension. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Muchomon. Adicione Shoto Kazama e Biyomon à mão. Primeiro selecione Muchomon na mesa e confirme sua suspensão. A fase Principal deve continuar.",
  },
  "arena-issue-5121-bt24-058-search": {
    en: "End breeding and play Blimpmon. Add WarGrowlmon to the hand. Choose Add to the hand, then Bottom of deck. Confirm the remainder’s deck order. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Blimpmon. Adicione WarGrowlmon à mão. Escolha Adicionar à mão, depois Fundo do deck. Confirme a ordem das restantes no deck. A fase Principal deve continuar.",
  },
  "arena-issue-5138-bt25-022-search": {
    en: "End breeding and play Lunamon. Add Cyclonemon and Shamanmon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Lunamon. Adicione Cyclonemon e Shamanmon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5131-bt3-093-search": {
    en: "End breeding and play Davis Motomiya. Add Shoutmon X7 and Paildramon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Davis Motomiya. Adicione Shoutmon X7 e Paildramon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5108-ex12-073-search": {
    en: "End breeding and play Giant Meat. Add MetalEtemon to the hand. Confirm the remainder’s deck order. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Giant Meat. Adicione MetalEtemon à mão. Confirme a ordem das restantes no deck. A fase Principal deve continuar.",
  },
  "arena-issue-5137-ex13-027-search": {
    en: "End breeding and play Chuumon. Add Sukamon to the hand. Choose Etemon as the second selection to trash. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Chuumon. Adicione Sukamon à mão. Escolha Etemon na segunda seleção para descartar. A fase Principal deve continuar.",
  },
  "arena-issue-5107-ex2-008-search": {
    en: "End breeding and play Guilmon. Add WarGrowlmon and Takato Matsuki to the hand. Confirm the remainder’s deck order. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Guilmon. Adicione WarGrowlmon e Takato Matsuki à mão. Confirme a ordem das restantes no deck. A fase Principal deve continuar.",
  },
  "arena-issue-5109-ex4-038-search": {
    en: "End breeding and play Agumon. Add Greymon and Garurumon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Agumon. Adicione Greymon e Garurumon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5135-st14-11-search": {
    en: "End breeding and play Ai & Mako. Add Aldamon to the hand. Confirm the remainder’s deck order. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Ai & Mako. Adicione Aldamon à mão. Confirme a ordem das restantes no deck. A fase Principal deve continuar.",
  },
  "arena-issue-5132-st18-04-search": {
    en: "End breeding and play Pteromon. Add Biyomon and Vemmon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Pteromon. Adicione Biyomon e Vemmon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5114-st20-02-search": {
    en: "End breeding and play Biyomon. Add Greymon and Matt Ishida & T.K. Takaishi to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Biyomon. Adicione Greymon e Matt Ishida & T.K. Takaishi à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5152-lm-051-search": {
    en: "End breeding and play Alexandrite Memory Boost!. Add Greymon to the hand. Confirm the remainder’s deck order. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Alexandrite Memory Boost!. Adicione Greymon à mão. Confirme a ordem das restantes no deck. A fase Principal deve continuar.",
  },
  "arena-issue-5132-lm-055-search": {
    en: "End breeding and play Sprint Dash Training. Add Greymon to the hand. Main must remain playable.",
    ptBR: "Encerre a criação e jogue Sprint Dash Training. Adicione Greymon à mão. A fase Principal deve continuar.",
  },
  "arena-issue-5182-supreme-connection-delay": {
    en: "End breeding and use Supreme Connection! from hand (3 memory). It goes to the battle area, but its ＜Delay＞ can't be activated this turn. Then activate ＜Delay＞ on the Supreme Connection! that was already in play: it goes to the trash, and Gigadramon is played from hand for 3. Memory ends at 2.",
    ptBR: "Encerre a criação e use Supreme Connection! da mão (3 de memória). Ela vai para a área de batalha, mas o ＜Delay＞ dela não pode ser ativado neste turno. Depois, ative o ＜Delay＞ da Supreme Connection! que já estava em jogo: ela vai para a lixeira e Gigadramon é jogado da mão por 3. A memória termina em 2.",
  },
  "arena-issue-5181-sharkmon-shellmon": {
    en: "End breeding and digivolve Shellmon into Sharkmon with the [Aqua]/[Sea Animal] route (cost 3). Shellmon has [Aquatic] only from its [Rule] text. De-Digivolve 1 the opponent's Digimon. Memory ends at 5.",
    ptBR: "Encerre a criação e digivolva Shellmon em Sharkmon pela rota [Aqua]/[Sea Animal] (custo 3). Shellmon tem [Aquatic] apenas pelo texto [Rule]. Aplique De-Digivolve 1 no Digimon do oponente. A memória termina em 5.",
  },
};

const SCENARIO_OPTIONS: readonly [DevScenario, string][] = [
  ["arena-github5326-sistermon-zero-security", "GitHub #5326 · Sistermon Blanc / zero security control"],
  ["arena-github5331-offense-hand", "GitHub #5331 · Offense Training hand ownership"],
  ["arena-github5332-kekkomon-cost", "GitHub #5332 · Kekkomon Tamer cost selection"],
  ["arena-github5333-tesla-source-replay", "GitHub #5333 · Tesla Main after source replay"],
  ["arena-github5307-larva-bt18-breeding", "GitHub #5307 · Larva breeding / BT18 Satan Mode"],
  ["arena-github5307-larva-ex10-breeding", "GitHub #5307 · Larva breeding / EX10 Satan Mode"],
  ["arena-github5308-greymon-security-destination", "GitHub #5308 · Greymon X / security versus hand"],
  ["arena-bt21-satellamon-cost-control", "BT21 Satellamon · 13-card cost control (Freezing unresolved)"],
  ["arena-github5319-bt25-murasamemon-security-option", "GitHub #5319 · BT25-041 security payment supplies e-Pulse"],
  ["arena-github5319-murasamemon-e-pulse", "GitHub #5319 · Murasamemon uses e-Pulse after security pickup"],
  ["arena-github5319-murasamemon-spent-cost", "GitHub #5319 · Cougarmon spent-cost control"],
  ["arena-turn-end-dp-expiry", "Turn-end DP expiry · Active phase handoff"],
  ["arena-github5311-crescemon-cost-scope", "GitHub #5311 · Crescemon incoming versus outgoing cost"],
  ["arena-github5311-imperialdramon-cost-scope", "GitHub #5311 sweep · Imperialdramon intrinsic discount"],
  ["arena-github5322-metalmamemon-no-cost", "#5322 MetalMamemon · no trash Digimon"],
  ["arena-github5322-metalmamemon-paid", "#5322 MetalMamemon · pay or decline placement"],
  ["arena-github5322-metalmamemon-strip-zero", "#5322 MetalMamemon · paid placement, no sources to strip"],
  ["arena-github5318-junomon-printed-cost", "GitHub #5318 · Junomon printed play-cost control"],
  ["arena-github-5302-kunlun-security-check", "GitHub #5302 · Kunlun after security check"],
  ["arena-github-5305-gravity-order", "GitHub #5305 · Gravity Crush end-turn ordering"],
  ["arena-github-5315-homeros-unused", "GitHub #5315 · Homeros / unused Wrath Mode"],
  ["arena-github-5315-homeros-spent", "GitHub #5315 · Homeros / spent Wrath Mode"],
  ["arena-github5313-inori-memory-four", "GitHub #5313 · Inori 4-memory timing"],
  ["arena-github5313-inori-memory-five", "GitHub #5313 · Inori 5-memory control"],
  ["arena-github5303-magnamon-printed-dp", "GitHub #5303 · Magnamon printed DP and expiry"],
  ["arena-github-5324-omnimon-traits", "GitHub #5324 · Omnimon X full traits and Cool Boy search"],
  ["arena-github5320-alliance-after-evolution", "GitHub #5320 · Alliance after Mococomon evolution"],
  ["arena-github-5297-omnimon-main-dna", "GitHub #5297 · Omnimon Main DNA and physical materials"],
  ["arena-github-5297-omnimon-agumon-dna", "GitHub #5297 · Omnimon Agumon end-of-turn DNA"],
  ["arena-github-5286-lordknightmon-knightmon", "GitHub #5286 · LordKnightmon EX13 Knightmon picker"],
  ["arena-github-5285-examon-battle-win", "GitHub #5285 · Examon battle-win play"],
  ["arena-github-5284-regulusmon-shared-opt", "GitHub #5284 · Regulusmon shared once per turn"],
  ["arena-github-5279-millenniummon-self-delete", "GitHub #5279 · Millenniummon self-deletion"],
  ["arena-github-5267-omnimon-source-count", "GitHub #5267 · Omnimon bottom-deck versus Then deletion"],

  ["arena-github-5289-ulforce-rina", "GitHub #5289 · Rina cannot evolve Ulforce X onto X"],
  ["arena-github-5289-ulforce-exact-base", "GitHub #5289 · Ulforce X exact evolution base"],
  ["arena-github-5274-siriusmon-vb-cost", "GitHub #5274 · Siriusmon costs 3 from VB WereGarurumon"],
  ["arena-github-5273-two-ouryumon-dna", "GitHub #5273 · Two Ouryumon ordinary DNA"],
  ["arena-github-5272-kyubimon-moving", "GitHub #5272 · Kyubimon When Moving search"],
  ["arena-github-5269-kyubimon-digivolving", "GitHub #5269 / #5272 · Kyubimon When Digivolving search"],
  ["arena-github-5268-blue-card-chaos-mode", "GitHub #5268 · Blue Card rejects Chaos onto Chaos"],
  ["arena-github-5268-blue-card-lucemon", "GitHub #5268 · Blue Card retains legal Lucemon evolution"],
  ["arena-github-5283-wargreymon-modal-warp", "GitHub #5283 · WarGreymon modal warp rulings"],
  ["arena-github-5283-metalgarurumon-modal-warp", "GitHub #5283 · MetalGarurumon modal warp rulings"],
  ["arena-github-5283-wargreymon-mandatory-delete", "GitHub #5283 · Starter WarGreymon mandatory deletion"],

  ["arena-issue-5266-elecmon-bottom-deck", "GitHub #5266 · AeroVeedramon returns separate Elecmon"],
  ["arena-issue-5266-candlemon-own-host", "GitHub #5265 / #5266 · Candlemon protects only its own host"],
  ["arena-own-field-effects", "Your field effects · Leopardmon Blocker + opposing DP"],
  ["arena-multiple-field-effects", "Multiple field effects · stacked Apollomon reductions"],
  ["arena-tai-matt-double-end-turn", "Tai & Matt BT17 · double End of Turn"],
  ["arena-issue-5254-examon-dna", "GitHub #5254 · Examon BT20 / EX13 Lv.5 DNA"],
  ["arena-issue-5258-plesiomon-optional-attack", "GitHub #5258 · Plesiomon optional attack"],
  ["arena-issue-5259-gammamon-exact-evolution", "GitHub #5259 · Gammamon exact evolution"],
  ["arena-issue-5261-sukamon-field-reduction", "GitHub #5261 · Sukamon and field effects"],
  ["arena-oct06-king-sukamon-assembly", "06/10 · KingSukamon · Assembly do lixo"],
  ["arena-oct06-chuumon-trash-revival", "06/10 · Chuumon EX5 · herança e jogar do lixo"],
  ["arena-oct06-dorbickmon-digixros", "06/10 · Dorbickmon EX3 · cinco materiais DigiXros"],
  ["arena-oct06-snow-goblimon-reveal", "06/10 · SnowGoblimon · revelar e selecionar"],
  ["arena-oct06-trash-recovery", "06/10 · Interface · selecionar do lixo"],
  ["arena-oct06-sukamon-bt11-deletion-search", "06/10 · Sukamon BT11 · deleção e busca no deck"],
  ["arena-oct06-sukamon-bt3-deletion-search", "06/10 · Sukamon BT3 · deleção e jogar revelada"],
  ["arena-oct06-sukamon-ex13-deletion-search", "06/10 · Sukamon EX13 · deleção e jogar revelada"],
  ["arena-oct06-revealed-search", "06/10 · Interface · selecionar reveladas do deck"],
  ["arena-oct06-mastemon-owner-security", "06/10 · Mastemon · segurança do dono"],
  ["arena-oct06-kyo-barrier", "06/10 · Kyo · Barrier"],
  ["arena-oct06-millennium-deck-order", "06/10 · Millenniummon · ordem no deck"],
  ["arena-oct06-kazemon-blast", "06/10 · Kazemon · Blast em resolução"],
  ["arena-oct06-asuna-jupiter", "06/10 · Asuna · Jupitermon por 0"],
  ["arena-oct06-giromon-assembly", "06/10 · Giromon · Assembly e deleção"],
  ["arena-oct06-blue-scramble-decline", "06/10 · Blue Scramble · recusar único rookie"],
  ["arena-oct06-rina-decline", "06/10 · Rina · comprar e recusar evolução"],
  ["arena-oct06-vortex-opt-decline", "06/10 · Vortexdramon · recusa preserva OPT"],
  ["arena-oct06-vortex-piercing-controls", "06/10 · Vortexdramon · controles de Piercing"],
  ["arena-oct06-zero-dp-partition", "06/10 · Sanmyojin · Partition a 0 DP"],
  ["arena-oct06-takato-blitz", "06/10 · Takato · Blitz por efeito"],
  ["arena-oct06-partition-dragon-gene", "06/10 · Partition · Dragon Gene · Analog Youth"],
  ["arena-oct06-inherited-battle", "06/10 · Groundramon · herdado após De-Digivolve"],
  ["arena-oct06-active-overflow", "06/10 · Overflow · início do turno"],
  ["arena-discord-1556882561995644928-mobile-inspection", "Mobile · read Alphamon during Leopardmon's decision"],
  ["arena-issue-5167-assembly-digimon", "GitHub #5167 · Digimon Assembly materials"],
  ["arena-issue-5171-taomon-famis", "GitHub #5171 · Taomon ACE uses Famis"],
  ["arena-issue-5176-king-drasil-ace", "#5176 · King Drasil absorbs Royal Knight ACE"],
  ["arena-issue-5166-dna-material-pairs", "#5166 · DNA material pair choice"],
  ["arena-issue-5173-cyber-engage", "#5173 · Cyber Engage reduced cost"],
  ["arena-issue-5173-cyber-engage-psychemon", "#5173 · Cyber Engage vs Psychemon"],
  ["arena-issue-5127-opponent-suspend-cost", "GitHub #5127 · Opposing suspend cost"],
  ["arena-issue-5127-opponent-survival", "GitHub #5127 · Opposing survival cost"],
  ["arena-issue-5168-alter-s-simultaneous", "GitHub #5168 · alter-s-simultaneous"],
  ["arena-issue-5169-demidevimon-native", "GitHub #5169 · demidevimon-native"],
  ["arena-issue-5179-imperialdramon-blitz", "GitHub #5179 \u00b7 Imperialdramon ordinary-evolution Blitz"],
  ["arena-issue-5190-tapmon-bootmon", "GitHub #5190 / #5192 \u00b7 Tapmon, Bootmon and Shutmon"],
  ["arena-issue-5232-icemon-egg", "GitHub #5232 \u00b7 icemon-egg"],
  ["arena-issue-5246-savior-decline", "GitHub #5246 \u00b7 SaviorHuckmon optional effect"],
  ["arena-issue-5241-kurata-sleep", "GitHub #5241 \u00b7 Kurata / Belphemon Sleep"],
  ["arena-issue-5247-crimson-use-cost", "GitHub #5247 \u00b7 Crimson Blaze / Chikurimon"],
  ["arena-issue-5248-dynasmon-security", "GitHub #5248 \u00b7 Dynasmon Security targets"],
  ["arena-issue-5207-dorimon-guard", "GitHub #5207 \u00b7 Dorimon / Guard memory"],
  ["arena-issue-5214-habakirimon-security", "GitHub #5214 \u00b7 habakirimon-security"],
  ["arena-issue-5204-dorimon-cost", "GitHub #5204 \u00b7 dorimon-cost"],
  ["arena-issue-5219-lucemon-breeding", "GitHub #5219 \u00b7 lucemon-breeding"],
  ["arena-issue-5217-metalgarurumon-choice", "GitHub #5217 \u00b7 metalgarurumon-choice"],
  ["arena-issue-5230-hidden-inherited", "GitHub #5230 \u00b7 hidden-inherited"],
  ["arena-issue-5218-landramon-discard", "GitHub #5218 \u00b7 landramon-discard"],
  ["arena-issue-5235-merciful-jupiter-order", "GitHub #5235 \u00b7 merciful-jupiter-order"],
  ["arena-issue-5215-venusmon-guard-cost", "GitHub #5215 \u00b7 venusmon-guard-cost"],
  ["arena-issue-5199-sistermon-option", "GitHub #5199 · Sistermon Option target selection"],
  ["arena-issue-5196-kyubimon-search", "GitHub #5196 · Kyubimon search timing"],
  ["arena-issue-5194-alphamon-entry", "GitHub #5193 / #5194 \u00b7 Alphamon entry without Rush"],
  ["arena-issue-5185-nokia-warp", "GitHub #5185 \u00b7 Nokia Hand Main warp"],
  ["arena-issue-5170-kaguyamon-end-turn", "GitHub #5170 · kaguyamon-end-turn"],
  ["arena-issue-5170-kaguyamon-on-play", "GitHub #5170 · kaguyamon-on-play"],
  ["arena-issue-5170-arisa-overclock", "GitHub #5170 · arisa-overclock"],
  ["arena-issue-5159-kudamon-moving", "GitHub #5159 · Kudamon moving reveal"],
  ["arena-issue-5158-guilmon-x-reveal", "GitHub #5158 · Guilmon X reveal"],
  ["arena-issue-5050-counter-immunity", "GitHub #5050 · Counter immunity"],
  ["arena-issue-5059-angewomon-warp", "GitHub #5059 · Angewomon warp"],
  ["arena-issue-5058-davis-large-hand", "GitHub #5058 · Davis large hand"],
  ["arena-issue-5070-lunamon-breeding", "GitHub #5070 · lunamon-breeding"],
  ["arena-issue-5067-treadmill-reveal", "GitHub #5067 · treadmill-reveal"],
  ["arena-issue-5066-shadow-reveal", "GitHub #5066 · shadow-reveal"],
  ["arena-issue-5063-bokomon-base", "GitHub #5063 · bokomon-base"],
  ["arena-issue-5064-hybrid-protection", "GitHub #5064 · hybrid-protection"],
  ["arena-issue-5060-exact-lucemon", "GitHub #5060 · exact-lucemon"],
  ["arena-issue-5047-richard-self", "GitHub #5047 · richard-self"],
  ["arena-issue-5049-decline-dna", "GitHub #5049 · decline-dna"],
  ["arena-issue-5073-epulse-trash", "GitHub #5073 · e-Pulse trash play"],
  ["arena-issue-5099-mervamon-iliad", "GitHub #5099 · Mervamon hand + trash"],
  ["arena-issue-5106-king-sukamon-cost", "GitHub #5106 · KingSukamon cost choice"],
  ["arena-issue-5118-candlemon-search", "GitHub #5118 · BT18-030 Candlemon search"],
  ["arena-issue-5135-ai-mako-your-turn", "GitHub #5135 · Ai & Mako search + memory"],
  ["arena-issue-5106-chuumon-self-replay", "GitHub #5106 · Chuumon self replay"],
  ["arena-issue-5011-agumon-search", "#5011 · Agumon · busca DM/Ver.1"],
  ["arena-issue-5011-gabumon-search", "#5011 · Gabumon · busca DM/Ver.2"],
  ["arena-issue-5014-digital-gate-cool-boy", "#5014 · Digital Gate Open · Cool Boy sem custo"],
  ["arena-issue-4999-mother-option-color", "#4999 · Mother D-Reaper · cor de Option"],
  ["arena-issue-5000-mother-marsmon-cost", "#5000 · Mother D-Reaper · Marsmon"],
  ["arena-issue-5001-gomamon-vikemon-search", "#5001 · Gomamon · Vikemon Sea Beast"],
  ["arena-issue-5003-bacchus-pending-effects", "#5003 · Bacchusmon · efeitos pendentes"],
  ["arena-issue-5004-shine-burst-marcus", "#5004 · ShineGreymon · Marcus ST24"],
  ["arena-issue-5005-mococomon-forced-attack", "#5005 · Mococomon · ataque por efeito"],
  ["arena-issue-5007-armor-shakkoumon-order", "#5007 · Shakkoumon · Armor Purge"],
  ["arena-issue-5008-hand-trash-selection", "#5008 · Seleção da mão · descarte"],
  ["arena-issue-5009-pipe-fox-no-level", "#5009 · Pipe Fox · token sem nível"],
  ["arena-issue-5010-kapurimon-security-flip", "#5010 · Kapurimon · security revelada"],
  ["arena-issue-4998-gammamon-breeding", "#4998 · Strongest of Brothers · criação"],
  ["arena-issue-4998-paradise-lost-breeding", "#4998 · Paradise Lost · varredura"],
  ["arena-issue-4993-inferno-divide-immunity", "#4993 · Inferno Divide · imunidade"],
  ["arena-issue-4994-fly-bullet-immunity", "#4994 · Fly Bullet · imunidade"],
  ["arena-issue-4995-image-training", "#4995 · Image Training · custo alternativo"],
  ["arena-issue-4995-breathing-training", "#4995 · Breathing Training · custo alternativo"],
  ["arena-issue-4995-asuna-evolution", "#4995 · Asuna · evolução por efeito"],
  ["arena-issue-4995-pagumon-evolution", "#4995 · Pagumon · evolução por efeito"],
  ["arena-issue-4996-heavy-metal-breeding", "#4996 · HeavyMetaldramon · criação"],
  ["arena-discord-1556821976922849360-tsunomon-jupitermon", "Tsunomon · Jupitermon cost 4 minus 1"],
  ["arena-discord-1556821976922849360-tsunomon-jupitermon-zero", "Tsunomon · Jupitermon cost 1 minus 1"],
  ["arena-discord-1556810241952194590-cerberusmon-alphamon", "Cerberusmon · Option versus protected Alphamon"],
  ["arena-examon-bt23-partition-choice", "Examon BT23 · explicit Partition choice"],
  ["arena-discord-1556831312008974437-jesmon-gankoomon-immunity", "Jesmon · attack after Gankoomon X immunity"],
  ["arena-discord-1556811259867955282-patamon-zero", "Patamon · security search with 0 targets"],
  ["arena-discord-1556811259867955282-patamon-one", "Patamon · security search with 1 targets"],
  ["arena-discord-1556811259867955282-patamon-multiple", "Patamon · security search with 2 targets"],
  ["arena-discord-1556798361435373630-mococomon-once-per-turn", "Mococomon · once per turn during a nested attack"],
  ["arena-discord-1556782829713621082-digilab-breeding", "DigiLab · CS Veemon in breeding"],
  ["arena-discord-1556772689731915896-fly-bullet-hand", "Fly Bullet · Option from hand"],
  ["arena-discord-1556772689731915896-fly-bullet-sources", "Fly Bullet · Option from BeelStarmon’s sources"],
  ["arena-discord-1556772182607011971-asuna", "Asuna \u00b7 alternate evolution cost"],
  ["arena-discord-1556772182607011971-image-training", "Image Training \u00b7 alternate evolution cost"],
  ["arena-discord-1556772182607011971-breathing-training", "Breathing Training \u00b7 alternate evolution cost"],
  ["arena-discord-1556772182607011971-pagumon", "Pagumon \u00b7 alternate evolution cost"],
  ["arena-discord-1556702519952932885-rosemon-burst", "Rosemon \u00b7 Burst"],
  ["arena-discord-1556702519952932885-yoshino", "Yoshino \u00b7 reactive evolution"],
  ["arena-discord-1556702668754387095-machinedramon", "Machinedramon \u00b7 Chaosdramon X Fragment"],
  ["arena-discord-1556703230166175754-engage", "Chaosdramon \u00b7 Engage"],
  ["arena-discord-1556688029731528804-jesmon", "Jesmon \u00b7 Alliance order"],
  ["arena-discord-1556715328610762844-alphamon", "Alphamon \u00b7 attack restriction"],
  ["arena-discord-1556716432111304824-dantemon", "Dantemon \u00b7 seven links"],
  ["arena-discord-1556715929973424128-block-timing", "TB \u00b7 block timing"],
  ["arena-discord-1556732255148179569-drasil-turn", "King Drasil · opponent turn"],
  ["arena-discord-1556745762682183811-giant-slayer-execute", "Giant Slayer · Execute replacement"],
  ["arena-discord-1556745762682183811-holy-succession", "Giant Slayer · Holy Mode Succession"],
  ["arena-issue-4965-optional-raid", "#4965 · Raid opcional"],
  ["arena-issue-5065-lethal-attack-order", "#5065 · ataque letal com efeitos ordenados"],
  ["arena-issue-5065-opponent-turn-end", "#5065 · fim do turno do bot e compra"],
  ["arena-issue-4967-assembly-with-dna", "#4967 · Omnimon · Assembly e DNA"],
  ["arena-issue-4968-hand-trash-draw", "#4968 · Ogremon / Dobermon · descarte"],
  ["arena-issue-4969-grandgalemon-dp", "#4969 · GrandGalemon · bônus de DP"],
  ["arena-issue-4971-imperial-effect-evolution", "#4971 · Imperialdramon · evolução por efeito"],
  ["arena-issue-4972-burst-marcus-rule", "#4972 · Burst · Marcus pela Rule"],
  ["arena-issue-4973-dual-option-immunity", "#4973 · DUAL Opção · Atratusmon"],
  ["arena-issue-4974-gaiomon-reboot", "#4974 · Gaiomon · herança MetalGreymon X"],
  ["arena-issue-4977-kingetemon-continuous", "#4977 · KingEtemon · travamento de DP"],
  ["arena-issue-4978-rosemon-tamer-reaction", "#4978 · Rosemon · reação do Tamer"],
  ["arena-issue-4979-weather-detach", "#4979 · Weatherdramon · Detach"],
  ["arena-issue-5015-dantemon-attack-links", "#5015 · Dantemon · links after forced attack"],
  ["arena-issue-4981-dantemon-seven-code", "#4981 · Dantemon · #4981 / #4986 / #4987"],
  ["arena-issue-4983-feedback-form", "#4983 · Feedback · formulário"],
  ["arena-issue-4984-super-hacking-security", "#4984 · Super Hacking · segurança na lixeira"],
  ["arena-issue-4985-double-alliance", "#4985 · Double Alliance"],
  ["arena-issue-4988-examon-tamers", "#4988 · Examon · suspender Tamers"],
  ["arena-issue-4989-linked-card-labels", "#4989 · UI · cartas linkadas"],
  ["arena-issue-4990-end-of-turn-label", "#4990 · Four phases / repeated turn-end"],
  ["arena-issue-4964-burst-own-tamer", "#4964 · Burst Mode · own hand Tamer"],
  ["arena-issue-4962-seiten-ex12-assembly", "#4962 · SeitenGokuumon · EX12 Assembly"],
  ["arena-issue-4961-takato-raid-attack", "#4961 · Takato · Gallantmon attack"],
  ["arena-issue-4955-minervamon-dedigivolve", "#4955 · Minervamon · De-Digivolve"],
  ["arena-issue-4953-nokia-warp-reduction", "#4953 · Nokia · hand warp reduction"],
  ["arena-issue-4952-kotemon-piercing", "#4952 · Kotemon · breeding Piercing"],
  ["arena-issue-4951-okuwamon-inherited", "#4951 · Okuwamon · inherited Piercing"],
  ["arena-issue-4950-davis-ken-dna-sources", "#4950 · Davis & Ken · DNA sources"],
  ["arena-issue-4949-paladin-battle-comparison", "#4949 · Paladin Mode · source battle"],
  ["arena-issue-4946-slayerdramon-assembly-order", "#4946 · Slayerdramon · Assembly order"],
  ["arena-issue-4942-jesmon-double-alliance", "#4942 · Jesmon · two Alliance instances"],
  ["arena-issue-4941-candlemon-top-inheritance", "#4941 · Candlemon · inactive inherited effect"],
  ["arena-issue-4940-lilithmon-delete-cost", "#4940 · Lilithmon · Detach deletion cost"],
  ["arena-issue-4948-sukamon-blast-legality", "#4948 · KingSukamon · Blast legality"],
  ["arena-issue-4947-physical-training-reaction", "#4947 · Physical Training · Dragon Mode reaction"],
  ["arena-issue-4957-gankoomon-dual-sources", "#4957 · Gankoomon · DUAL from sources"],
  ["arena-issue-4910-diarbbitmon-dual-option", "#4910 · Diarbbitmon · Option immunity"],
  ["arena-issue-4914-blanc-dual-option", "#4914 · Blanc · DUAL Option DP reduction"],
  ["arena-issue-4905-magnamon-merciful-colors", "#4905 · Magnamon · Merciful's six granted colors"],
  ["arena-issue-4939-demon-lord-free-reduction", "#4939 · Demon Lords · free-play optional costs"],
  ["arena-issue-4954-lordknightmon-inspector", "#4954 · LordKnightmon · printed inspector"],
  ["arena-issue-4958-card-images", "#4958 · Images · mirror fallback (#4928)"],
  ["arena-issue-4943-browser-translation", "#4943 · Browser translation · live match"],
  ["arena-issue-4938-ruli-optional-reduction", "#4938 · Ruli · optional reduction"],
  ["arena-issue-4937-grademon-dual-immunity", "#4937 · EX13 Grademon · DUAL Options"],
  ["arena-issue-4937-bt20-grademon-dual-immunity", "#4937 · BT20 Grademon · DUAL Options"],
  ["arena-issue-4936-examon-repeat-barrier", "#4936 · Examon / Alphamon · repeat Barrier"],
  ["arena-issue-4935-blanc-arts-guard", "#4935 · Blanc · Guard after Arts Digivolve"],
  ["arena-issue-4933-lilamon-host", "#4933 · Lilamon · host protection"],
  ["arena-issue-4932-kentaurosmon-security", "#4932 · Kentaurosmon · security DP"],
  ["arena-issue-4931-lordknightmon-reduction", "#4931 · LordKnightmon AD1 · reduction"],
  ["arena-issue-4930-venusmon-opponent-cost", "#4930 · Venusmon · opponent protection cost"],
  ["arena-issue-4929-noir-single-target", "#4929 · Noir · one De-Digivolve target"],
  ["arena-issue-4926-battle-priority", "#4926 · Examon / Rie · battle priority"],
  ["arena-bt15-092-kari-security", "BT15-092 · Kari · placement in security"],
  ["arena-issue-4924-revelation-security-faces", "#4924 · Revelation · security card faces"],
  ["arena-issue-4923-seiten-assembly", "#4923 · SeitenGokuumon · Sagomon Assembly"],
  ["arena-issue-4921-homeros-late-arrival", "#4921 · Homeros · end-turn arrival"],
  ["arena-issue-4919-seventh-lightning-cost", "#4919 · Seventh Lightning · trash cost"],
  ["arena-issue-4918-lordknightmon-player-attack", "#4918 · LordKnightmon · player-only attack"],
  ["arena-issue-4917-biting-crush-placement", "#4917 · Biting Crush · battle placement"],
  ["arena-issue-4916-raid-target-block", "#4916 · Raid · target cannot block"],
  ["arena-issue-4915-junomon-homeros", "#4915 · Junomon · Homeros selection"],
  ["arena-issue-4913-cool-boy-proto-form", "#4913 · Cool Boy · Proto Form evolution"],
  ["arena-issue-4912-deep-savers-battle", "#4912 · Deep Savers · memory protection"],
  ["arena-issue-4911-mervamon-multiple-checks", "#4911 · Mervamon · consecutive large attacks"],
  ["arena-issue-4907-takato-end-turn", "#4907 · Takato · end-turn cost choice"],
  ["arena-github-5346-blast-dna-decision", "GitHub #5346 · Blast DNA to Omnimon target decision"],
  ["arena-bt20-ouryuken-blast-dna-counter", "BT20 Ouryuken ACE · Blast DNA Counter with duplicate hand cards"],
  ["arena-github-5323-alphamon-main-dna", "GitHub #5323 · Alphamon + Ouryumon Main DNA / paid control"],
  ["arena-github-5323-alphamon-blast-dna", "GitHub #5323 · Alphamon + hand Ouryumon Blast DNA"],
  ["arena-bt11-hades-force-target-selection", "BT11 Hades Force · escolha dos alvos"],
  ["arena-bt23-examon-partition-return", "BT23 Examon · Partition on deck return"],
  ["arena-bt23-examon-piercing-end-turn", "BT23 Examon · end-turn DNA and Piercing"],
  ["arena", "Attack steps · Counter/Blocker"],
  ["arena-field-grouping-dense", "Field grouping · late-game density, deep sources and links"],
  ["arena-match-timer", "Timer · vs bot (300s + 60s/30s)"],
  ["arena-aegiochus-dark-assembly", "Aegiochus Dark · Wizardmon Assembly"],
  ["arena-alliance-20", "Alliance · 20 Digimon"],
  ["arena-marcus-alliance", "Alliance · Marcus treated as a Digimon"],
  ["arena-bt11-analogman-redirect-timing", "BT11 Analogman · redirect timing"],
  ["arena-bt11-rina-ulforce-effect-choice", "BT11 Rina · EX13 Ulforce effect choice"],
  ["arena-bt11-rina-mailmon-suspended-subject", "BT11 Rina · Mailmon and suspended Digimon"],
  ["arena-rina-evade-unsuspend", "Rina · Evade → next-turn unsuspend"],
  ["arena-bt11-rina-ulforce-immunity", "BT11 Rina · Ulforce return vs Digimon immunity"],
  ["arena-ex12-diarbbitmon-option-trigger-timing", "EX12 Diarbbitmon · Option triggers wait for Arts"],
  ["arena-bt26-cerberusmon-breeding-arts", "BT26 Cerberusmon · Arts Digivolve in breeding"],
  ["arena-github-5301-bacchusmon-arts", "#5301 Bacchusmon · Option to Arts / decline"],
  ["arena-github-5301-bacchusmon-breeding-arts", "#5301 Bacchusmon · Arts in breeding"],
  ["arena-github-5301-bacchusmon-no-arts-base", "#5301 Bacchusmon · no legal Arts base"],
  ["arena-bt15-leviamon-x-played-subject-left", "BT15 Leviamon X · trigger survives a deleted played Digimon"],
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
  ["arena-bt24-asuna-return-play", "BT24 Asuna · return to deck, then play from trash"],
  ["arena-bt21-dogatchmon-link-attack", "BT21 DoGatchmon · link attack waits for pending effects"],
  ["arena-bt25-shutmon-link-prompt", "BT25 Shutmon · link prompt shows the link box"],
  ["arena-bt24-sonic-shot-decline-link", "BT24 Sonic Shot · decline Link after Dan & Kanan"],
  ["arena-bt26-chronomon-dm-succession", "BT26 Chronomon DM · Succession When Digivolving"],
  ["arena-bt8-digimon-emperor-breeding-memory", "BT8 Digimon Emperor · breeding memory ends turn"],
  ["arena-face-up-security", "Security · opponent face-up cards"],
  ["arena-github-5299-ravemon-bottom-security", "GitHub #5299 · Ravemon face-up bottom security"],
  ["arena-bt20-invisimon-security-count", "BT20 Invisimon · face-up security count"],
  ["arena-ex13-grademon-immunity", "EX13 Alphamon · Assembly from trash"],
  ["arena-github-5316-shoutmon-rush", "#5316 Shoutmon X2 · Rush trait requirement"],
  ["arena-github-5316-shoutmon-rush-control", "#5316 Shoutmon DX · legal inherited Rush"],
  ["arena-github-5317-shoutmon-material-save-evolved", "#5317 Shoutmon X2 · DigiXros-only names"],
  ["arena-github-5317-shoutmon-material-save-printed", "#5317 Shoutmon X2 · legal Material Save 2"],
  ["arena-bt10-taiki-x7-xros-heart", "BT10 Taiki · Shoutmon X7 Xros Heart"],
  ["arena-bt22-gabumon-eot-dna", "BT22 Gabumon · DNA no fim do turno"],
  ["arena-5292-hawkmon-craniamon-priority", "#5292 Hawkmon / Craniamon · prioridade no fim do turno"],
  ["arena-bt10-taiki-reveal-under-self", "BT10 Taiki · revelar sob este Tamer"],
  ["arena-ad1-adventure-tamers-security", "AD1 Adventure Tamers · Security plays both Tamers"],
  ["arena-lm067-gundramon-free-option", "LM-067 Gundramon · free revealed Option"],
  ["arena-diarbbitmon-dual-option-immunity", "Diarbbitmon · Eclipse Impact / DUAL immunity"],
  ["arena-taiki-digixros-any-tamer-hand", "Taiki · DigiXros from hand under any Tamer"],
  ["arena-kotone-digixros-any-tamer-effect", "Kotone · effect DigiXros under any Tamer"],
  ["arena-mervamon-trash-digixros", "Mervamon · DigiXros materials from trash"],
  ["arena-bt5-koromon-attack-draw", "BT5 Koromon · draw before security"],
  ["arena-bt21-metalgreymon-one-target-two-colors", "BT21 MetalGreymon · one target / two colors"],
  ["arena-bt21-metalgreymon-one-target-four-colors", "BT21 MetalGreymon · one target / four colors"],
  ["arena-ex7-seventh-fascination-turn", "EX7 Seventh Fascination · opponent turn end"],
  ["arena-st15-trident-arm-forced-attack-text", "ST15 Trident Arm · granted forced attack text"],
  ["arena-bt22-vademon-return-tamer", "BT22 Vademon · cost-4 Tamer return"],
  ["arena-bt22-vademon-return-ace", "BT22 Vademon · opponent ACE Overflow"],
  ["arena-bt22-shinmonzaemon-own-security", "BT22 ShinMonzaemon · own security"],
  ["arena-bt22-shinmonzaemon-opponent-security", "BT22 ShinMonzaemon · opponent security"],
  ["arena-face-down-ace-no-overflow", "Face-down ACE · no Overflow on deletion"],
  ["arena-ex11-vortex-effect-attack-block", "EX11 Vortexdramon · block after declined battle"],
  ["arena-bt17-dexdoru-exact-name", "BT17 DexDoruGreymon · exact [DoruGreymon] from trash"],
  ["arena-open-bugs-veemon-decline", "Open bugs · veemon decline"],
  ["arena-open-bugs-lavorvomon-search", "Open bugs · lavorvomon search"],
  ["arena-open-bugs-giromon-leave", "Open bugs · giromon leave"],
  ["arena-open-bugs-koromon-evolution", "Open bugs · koromon evolution"],
  ["arena-open-bugs-mega-knight-materials", "Open bugs · mega knight materials"],
  ["arena-open-bugs-marcus-attack", "Open bugs · marcus attack"],
  ["arena-open-bugs-larva-immunity", "Open bugs · larva immunity"],
  ["arena-ex2-takato-blitz-order", "EX2 Takato · granted Blitz before Gallantmon's effect"],
  ["arena-ex12-thetismon-mistymon-deletion", "EX12 Thetismon · Mistymon effect deletion before battle"],
  ["arena-ex12-thetismon-jamming-control", "EX12 Thetismon · Jamming security battle control"],
  ["arena-ex13-sampson-face-down-sources", "EX13 Richard Sampson · owner reads face-down cards"],
  ["arena-ex9-metal-mamemon-face-down-deletion", "EX9 MetalMamemon · face-down On Deletion"],
  ["arena-p240-arcturusmon-vb-routes", "P-240 Arcturusmon · [VB] digivolve and Assembly"],
  ["arena-p240-arcturusmon-ordered-placement", "P-240 Arcturusmon · order two bottom sources"],
  ["arena-ex12-proximamon-dual-siriusmon", "EX12 Proximamon · use DUAL Siriusmon from sources"],
  ["arena-ex12-siriusmon-group-placement", "EX12 Siriusmon · place two cards at one end"],
  ["arena-ex12-virus-busters-effect-attack", "EX12 Virus Busters · ordered with an effect-driven attack"],
  ["arena-ex7-seventh-fascination-trash-turn", "EX7 Seventh Fascination · trash activation"],
  ["arena-raid-after-dedigivolve", "Omnimon · pending Raid after Gladimon De-Digivolve"],
  ["arena-raid-optional-preset", "EX13 Examon · Raid Yes/No preset in effect order"],
  ["arena-preset-order-no-clicks", "EX13 Examon · preset effect order resolves in one submit"],
  ["arena-ex13-leopardmon-suspended-target", "EX13 Leopardmon · suspend an already suspended Digimon"],
  ["arena-bt24-ogremon-ulforce-unsuspend", "BT24 Ogremon · Ulforce can unsuspend by effects"],
  ["arena-bt23-king-drasil-unsuspended-cost", "BT23 King Drasil · pay the suspend cost after Ulforce unsuspends it"],
  ["arena-ex13-leopardmon-unsuspend-lock", "EX13 Leopardmon · locked Digimon can't pay the unsuspend cost"],
  ["arena-ex5-reppamon-optional-cost", "EX5 Reppamon · Yes/No security cost + two evolutions"],
  ["arena-ex13-dorimon-optional-cost", "EX13 Dorimon · decline the 1-cost unsuspend without paying"],
  ["arena-ex13-giromon-zero-dp-play", "EX13 Giromon · Gotsumon at 0 DP dies before its On Play"],
  ["arena-bt13-kurata-belphemon-play-cost", "BT13 Kurata · deleting Gizmon: AT reduces Belphemon by 6"],
  ["arena-ex10-close-sunarizamon-without-close", "EX10 Close · play Sunarizamon with no Close in hand"],
  ["arena-ex11-pyramidimon-fragment-recovery", "EX11 Pyramidimon · Fragment trash triggers its recovery"],
  ["arena-ex13-rina-suspend-lock", "EX13 Rina · locked Tamer can't pay the suspend cost"],
  ["arena-ex13-rina-modal-title", "EX13 Rina · localized heading and printed effect body"],
  ["arena-ex11-vortex-effect-attack", "EX11 Vortexdramon · retrigger after a decline in an effect attack"],
  ["arena-ex13-breakdramon-zero-security-check", "EX13 Breakdramon · Security Attack -1 attack checks no card"],
  ["arena-decoy-protect-choice", "Decoy · choose which Digimon to protect"],
  ["arena-crimson-blaze-jesmon-token", "Crimson Blaze · Jesmon token play lock"],
  ["arena-p245-kakkinmon-full-hand-suspend", "P-245 Kakkinmon · suspend with a full hand to trigger Craniamon"],
  ["arena-ex12-nezhamon-kakkinmon-engage", "EX12-019 Nezhamon + P-245 Kakkinmon · Engage before security"],
  [
    "arena-ex12-nezhamon-kakkinmon-engage-spare-blocker",
    "EX12-019 Nezhamon + P-245 Kakkinmon · spare ST5-08 pays before security",
  ],
  ["arena-p245-kakkinmon-craniamon-no-target", "P-245 Kakkinmon · Craniamon suspend trigger with no target"],
  ["arena-ex13-craniamon-dual-play-cost", "EX13 Craniamon · ignore DUAL play cost"],
  ["arena-ex13-alphamon-end-turn-attack", "EX13 Alphamon · end-of-turn Rush attack on security"],
  ["arena-bt20-dragon-gene-skip-play", "BT20 Unleash the Dragon Gene · skip the play"],
  ["arena-bt26-rosemon-option-digivolve-lock", "BT26 Rosemon Option · suspended Digimon can't digivolve"],
  ["arena-bt26-ravemon-recycled-trigger", "BT26 Ravemon · same card evolves again in the pending chain"],
  ["arena-bt26-ravemon-nested-on-deletion", "BT26 Ravemon · On Deletion after a Thomas-reduced Crowmon"],
  ["arena-github5300-yoshino-cost-payload", "GitHub #5300 · Yoshino suspension and optional evolution"],
  ["arena-github5300-keenan-cost-execute", "GitHub #5300 · Keenan suspension and mandatory Execute"],
  ["arena-bt26-yoshino-trigger-stack", "BT26 Yoshino Fujieda · one trigger per event, readable stack"],
  ["arena-bt26-yoshino-match-b3759aa7", "BT26 Yoshino Fujieda · production match b3759aa7 stack"],
  ["arena-bt22-rie-kishibe-delete-without-digivolve", "BT22 Rie Kishibe · delete without a legal LordKnightmon"],
  ["arena-bt22-rie-kishibe-legal-digivolve", "BT22 Rie Kishibe · legal LordKnightmon at 3 security (#5290)"],
  ["arena-bt24-skullbaluchimon-simultaneous-delete", "BT24 SkullBaluchimon · level 3 and level 4 deleted together"],
  ["arena-lm-gundramon-simultaneous-delete", "LM Gundramon · trash 3, then delete 3 together"],
  ["arena-bt24-fugamon-self-trash", "BT24 Fugamon · draw only when this card is trashed"],
  ["arena-bt2-kurisarimon-repeat-memory", "BT2 Kurisarimon · Diaboromon + Arata memory"],
  ["arena-github5310-okuwamon-grandis-memory", "GitHub #5310 · Okuwamon → Grandis · one memory gain"],
  ["arena-github5310-grandis-end-of-attack", "GitHub #5310 · Grandis · End of Attack timing"],
  ["arena-bt2-kurisarimon-start-main-memory", "BT2 Kurisarimon · two start-of-main token effects"],
  ["arena-ex12-metalgreymon-forced-attack-play", "EX12 MetalGreymon · play and mandatory StartMain attack"],
  ["arena-ex12-metalgreymon-forced-attack-digivolve", "EX12 MetalGreymon · digivolve and mandatory StartMain attack"],
  ["arena-ex12-metalgarurumon-trash-then-return", "EX12 MetalGarurumon · trash sources, then choose the return"],
  ["arena-bt22-palmon-cs-restack", "BT22 Palmon · [CS] restack only on a [CS] host"],
  ["arena-bt22-mirei-play-cost-floor", "BT22 Mirei Mikagura · play cost 4 or higher only"],
  ["arena-bt12-mikemon-own-battle-only", "BT12 Mikemon · memory only for its own host's battle"],
  ["arena-bt14-chuumon-security-reveal", "BT14 Chuumon · opponent reveals the Sukamon placed in security"],
  ["arena-bt20-omnimon-each-player-survivor", "BT20 Omnimon (X Antibody) · over Omekamon, one survivor per player"],
  [
    "arena-bt20-ouryuken-reduction-resumes",
    "BT20 Alphamon: Ouryuken via King Drasil or Royal Knights of the Purge vs BT26 Aegiochusmon: Holy",
  ],
  ["arena-ex13-gotsumon-blocker-search", "EX13 Gotsumon · printed Blocker search"],
  ["arena-ex13-magnamon-partition-assembly", "#5294 Magnamon · Partition + free Assembly"],
  ["arena-ex13-craniamon-assembly", "EX13 Craniamon · Assembly with printed Blocker"],
  ["arena-ex13-craniamon-weregarurumon-assembly", "EX13 Craniamon · WereGarurumon Assembly"],
  ["arena-p220-millenniummon-assembly", "P-220 Millenniummon · Assembly with different levels"],
  ["arena-ex9-kimeramon-skullgreymon-assembly", "EX9 Kimeramon · SkullGreymon as Lv.4 material"],
  ["arena-bt24-masterblimpmon-assembly", "BT24 MasterBlimpmon · alternative Assembly recipes"],
  ["arena-bt22-boltmon-assembly", "BT22 Boltmon · Assembly with different card numbers"],
  ["arena-ex13-gotsumon-promo-knightmon", "EX13 Gotsumon · promo Knightmon P-111 Blocker search"],
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
  ["arena-ex12-susanoomon-later-arrival-dp", "EX12 Susanoomon · DP on later arrival"],
  ["arena-ex13-kingsukamon-machinedramon-dp", "EX13 KingSukamon · Machinedramon becomes 3000 DP"],
  ["arena-ex13-kingsukamon-vulcanusmon-link", "EX13 KingSukamon · Vulcanusmon loses Divine Arms link"],
  ["arena-ex13-kingetemon-digivolve-rule-check", "EX13 KingEtemon · 0 DP deletion orders with When Digivolving"],
  ["arena-ex13-examon", "EX13 Examon · Lv.5 DNA + battle timing"],
  ["arena-ex13-examon-option-dp", "EX13 Examon · DP bonus excludes Options/Tamers"],
  ["arena-ex13-examon-battle-win-timing", "EX13 Examon · win-battle trigger order"],
  ["arena-discord-1557631388650315826-sukamon-dna-materials", "KingSukamon · white material rejects Examon DNA"],
  ["arena-discord-1557631388650315826-sukamon-dna-control", "KingSukamon DNA · healthy control"],
  ["arena-discord-1557790296379625482-loweemon-hosts", "Loweemon · observed three-host prompt"],
  ["arena-discord-1557790296379625482-trash-hybrids", "Duskmon / Loweemon · attack evolution from trash"],
  ["arena-discord-1557565628439724032-duskmon-dna-colors", "Duskmon DNA · changed colors persist through evolution"],
  ["arena-discord-1557565628439724032-duskmon-dna-control", "Duskmon DNA · control"],
  ["arena-discord-1557575147119054889-shakkoumon-sukamon", "Shakkoumon DNA · reported materials"],
  ["arena-discord-1557575147119054889-shakkoumon-yellow-only", "Shakkoumon DNA · yellow-only control"],
  ["arena-bt23-examon-opponent-turn-dna", "BT23 Examon · Delay DNA in opponent's turn, no attack"],
  ["arena-ex13-chirinmon-cost-choice", "EX13 Chirinmon · either-or cost choice"],
  ["arena-ex13-wisemon-witchelny-cost", "EX13 Wisemon · Witchelny cost 3 / 4"],
  ["arena-bt18-candlemon-data-selection", "BT18 Candlemon · yellow Data / Witchelny selection"],
  ["arena-bt26-monimon-optional-cost", "BT26 Monimon · optional source-trash cost"],
  ["arena-ex13-flamewizardmon-optional-cost", "EX13 FlameWizardmon · optional security cost"],
  ["arena-bt18-lucemon-optional-hand-cost", "BT18 Lucemon · optional hand cost (#5312)"],
  ["arena-bt26-cerberusmon-optional-cost", "BT26 Cerberusmon · optional hand-trash cost"],
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
  ["arena-github5306-training-use-memory", "#5306 Treadmill Training · use cost and turn pass"],
  ["arena-github5306-training-delay-paid", "#5306 Treadmill Training · Delay pays 1"],
  ["arena-github5306-training-delay-free", "#5306 Treadmill Training · Delay costs 0"],
  ["arena-github5306-training-delay-cost-choice", "#5306 Treadmill Training · printed or alternate cost"],
  ["arena-bt20-dragon-gene-delay-no-dna", "BT20-093 Unleash the Dragon Gene · Delay with no DNA"],
  ["arena-bt20-dragon-gene-security", "BT20-093 Unleash the Dragon Gene · Security hand/trash"],
  ["arena-bt13-royal-purge-delay-rush", "BT13 Royal Knights of the Purge · Delay Rush"],
  ["arena-p206-digital-gate-breeding-color", "P-206 Digital Gate Open · breeding-area colour"],
  ["arena-ex13-merciful-mode-attack-order", "EX13 Merciful Mode · match f9505ba7 attack order"],
  ["arena-ex13-merciful-repeat-barrier", "EX13 Merciful Mode · repeat inherited Barrier"],
  ["arena-st17-magnamon-merciful-colors", "ST17 Magnamon · Merciful gained colors (#4905)"],
  ["arena-ex13-gallantmon-standoff", "EX13 Gallantmon · nested leave prevention"],
  ["arena-ad1-gallantmon-deletion-attack-order", "AD1 Gallantmon · deletion watcher vs When Attacking order"],
  ["arena-bt20-cool-boy-stacked-omekamon", "BT20 Cool Boy · two copies play two Omekamon"],
  ["arena-ex10-god-grade-raising-color", "EX10 God Grade · raising-area colour"],
  ["arena-ex10-malomyotismon-trash-main", "EX10 MaloMyotismon · [Trash] [Main] activation"],
  ["arena-ex10-blastmon-digixros", "EX10 Blastmon · DigiXros with 3 materials"],
  ["arena-ex11-ryutaro-suspended", "EX11 Ryutaro · suspended activation"],
  ["arena-deusmon-sukamon-app-fusion", "Deusmon · Sukamon blocks human App Fusion"],
  ["arena-deusmon-healthy-app-fusion", "Deusmon · healthy human App Fusion"],
  ["arena-deusmon-reverse-app-fusion", "Deusmon · reverse human App Fusion"],
  ["arena-deusmon-wrong-link-app-fusion", "Deusmon · wrong linked material"],
  ["arena-deusmon-sukamon-effect-fusion", "Deusmon · Sukamon blocks Tamer fusion"],
  ["arena-deusmon-healthy-effect-fusion", "Deusmon · healthy Tamer fusion"],
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
  ["arena-bt25-ceresmon-homeros-suspend", "BT25 Ceresmon · Homeros e Succession / suspension"],
  ["arena-bt24-homeros-neptunemon-timing-choice", "BT24 Homeros · Neptunemon timing choice"],
  ["arena-p224-kotone-own-source", "P-224 Kotone · X7 das próprias fontes / own sources"],
  ["arena-kotone-digixros-pending-attack", "Kotone · DigiXros + EX6 pending attack"],
  ["arena-bt6-beelstarmon-duplicate-cost", "BT6 BeelStarmon · duplicate hand cost"],
  ["arena-bt20-saviorhuckmon-end-turn-sistermon", "BT20 SaviorHuckmon · end of turn with an Option-played Sistermon"],
  ["arena-rock-proganomon-breeding-sources", "Proganomon · battle sources exclude breeding"],
  ["arena-rock-pyramidimon-breeding-sources", "Pyramidimon · battle sources exclude breeding"],
  ["arena-rock-magneticdramon-breeding-sources", "Magneticdramon · battle sources exclude breeding"],
  ["arena-rock-gravel-hearts-tumblemon-memory", "Close → Gravel Hearts → Pyramidimon · mandatory Tumblemon memory"],
  ["arena-bt25-beelstarmon-option-trash-trigger", "BT25 BeelStarmon · unsuspend cost fires the Option's trash effect"],
  ["arena-bt20-last-guardian-omnimon-wipe", "BT20 The Last Guardian · Delay vs Omnimon (X Antibody) wipe"],
  ["arena-ex7-deputymon-option-trash-trigger", "EX7 Deputymon · trashed Option source fires its effect"],
  ["arena-bt22-leopardmon-king-drasil", "BT22 Leopardmon ACE · King Drasil simultaneous leave"],
  ["arena-bt13-king-drasil-source-count", "BT13 King Drasil · source count after an earlier play"],
  ["arena-ui-king-drasil-mandatory-order", "King Drasil · order three mandatory physical copies"],
  ["arena-ui-ex11-cool-boy-hand-selection", "EX11 Cool Boy · choose either leftmost physical hand card"],
  ["arena-bt13-omnimon-later-token-rush", "BT13 Omnimon · Rush reaches a later token"],
  ["arena-st12-blanc-rush-second-attack", "ST12 Blanc · Rush second attack after Ouryuken"],
  ["arena-bt26-zombie-plutomon-removed-trigger", "BT26 ZombiePlutomon · pending source removed by De-Digivolve"],
  ["arena-bt25-titamon-trigger-text", "BT25 Titamon · hand-trash trigger text"],
  ["arena-bt24-hyogamon-pending-trash-digivolve", "BT24 Hyogamon · pending inherited digivolve after Plutomon"],
  ["arena-ex10-darkness-bagramon-digixros-interrupt", "EX10 DarknessBagramon · DigiXros material interrupt"],
  ["arena-ex10-tactimon-digixros-material", "EX10 Tactimon · DigiXros material is not an effect"],
  ["arena-ex10-bagramon-materials-destination", "EX10 Bagramon · DigiXros materials and destination choice"],
  ["arena-hellscythe-onplay-priority", "Flame Hellscythe · MagnaAngemon priority"],
  ["arena-rizegreymon-derived-priority", "RizeGreymon X · derived effect priority"],
  ["arena-trident-derived-priority", "Trident Revolver · deletion and On Play"],
  ["arena-flashy-attack-priority", "Flashy Boss Punch · attack interruption"],
  ["arena-dominimon-security-priority", "Dominimon · security removal priority"],
  ["arena-piedmon-declined-opt", "Piedmon · declined OPT retriggers"],
  ["arena-issue-4893-seiten-evo-cost", "#4893 · SeitenGokuumon evo cost"],
  ["arena-issue-4894-jesmon-token-limit", "#4894 · Jesmon token limit"],
  ["arena-sakuyamon-maid-option-timing", "Sakuyamon: Maid Mode · Option trigger timing"],
  ["arena-jesmon-scramble-dp-blocked", "Jesmon · Red Scramble vs 5000 DP (blocked)"],
  ["arena-jesmon-scramble-dp-allowed", "Jesmon · Red Scramble vs 10000 DP (allowed)"],
  ["arena-junomon-opponent-target", "Junomon · opponent target"],
  ["arena-bt18-velgrmon-opponent-cost", "BT18 Velgrmon · opponent deletion cost"],
  ["arena-ex5-targetmon-opponent-cost", "EX5 Targetmon · opponent deletion cost"],
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
  ["arena-mobile-blast-counter-tap", "Mobile · Blast Counter tap through badges"],
  ["arena-issue-5161-larva-breeding", "#5161 \u00b7 larva-breeding"],
  ["arena-issue-5104-alter-s-sources", "#5104 \u00b7 alter-s-sources"],
  ["arena-issue-5115-melting-trash", "#5115 \u00b7 melting-trash"],
  ["arena-issue-5129-hyogamon-trash", "#5129 \u00b7 hyogamon-trash"],
  ["arena-issue-5129-goblimon-trash", "#5129 \u00b7 goblimon-trash"],
  ["arena-issue-5125-ulforce-gold", "#5125 \u00b7 ulforce-gold"],
  ["arena-issue-5122-ulforce-bt13", "#5122 \u00b7 ulforce-bt13"],
  ["arena-issue-5125-ulforce-bt11", "#5125 \u00b7 ulforce-bt11"],
  ["arena-issue-5128-craniamon", "#5128 \u00b7 craniamon"],
  ["arena-issue-5145-slayerdramon", "#5145 \u00b7 slayerdramon"],
  ["arena-issue-5146-breakdramon", "#5146 \u00b7 breakdramon"],
  ["arena-issue-5140-merciful", "#5140 \u00b7 merciful"],
  ["arena-issue-5154-dantemon", "#5154 \u00b7 dantemon"],
  ["arena-issue-5156-giant-slayer", "#5156 \u00b7 giant-slayer"],
  ["arena-github-5270-senbon", "GitHub #5270 · Senbon Dokkan sweep"],
  ["arena-github-5282-iron-slash", "GitHub #5282 · iron-slash"],
  ["arena-github-5282-minervamon", "GitHub #5282 · minervamon"],
  ["arena-github-5277-overflow-full-cost", "GitHub #5277 · full-cost Overflow control"],
  ["arena-github-5277-overflow", "GitHub #5277 · overflow"],
  ["arena-github-5276-overflow", "GitHub #5276 · overflow"],
  ["arena-github-5270-junomon", "GitHub #5270 · junomon"],
  ["arena-github-5270-hurricane", "GitHub #5270 · hurricane"],
  ["arena-github-5270-gundramon", "GitHub #5270 · gundramon"],
  ["arena-github-5160-super-hacking", "GitHub #5160 \u00b7 super-hacking"],
  ["arena-github-5162-gym-security", "GitHub #5162 \u00b7 gym-security"],
  ["arena-github-5162-gym-empty", "GitHub #5162 \u00b7 gym-empty"],
  ["arena-github-5162-gym-suppressed", "GitHub #5162 · inherited security suppression"],
  ["arena-github-5111-jesmon", "GitHub #5111 \u00b7 jesmon"],
  ["arena-github-5112-plutomon", "GitHub #5112 \u00b7 plutomon"],
  ["arena-github-5116-rizegreymon", "GitHub #5116 \u00b7 rizegreymon"],
  ["arena-github-5119-cerberusmon", "GitHub #5119 \u00b7 cerberusmon"],
  ["arena-github-5127-zephagamon-option", "GitHub #5127 \u00b7 zephagamon-option"],
  ["arena-github-5127-zephagamon-protection", "GitHub #5127 \u00b7 zephagamon-protection"],
  ["arena-github-5124-princemamemon", "GitHub #5124 \u00b7 princemamemon"],
  ["arena-github-5124-bigmamemon", "GitHub #5124 \u00b7 bigmamemon"],
  ["arena-github-5136-greymon-recovery", "GitHub #5136 \u00b7 greymon-recovery"],
  ["arena-github-5144-mastemon-infermon", "GitHub #5144 \u00b7 mastemon-infermon"],
  ["arena-github-5149-proto-form", "GitHub #5149 \u00b7 proto-form"],
  ["arena-github-5151-examon-sources", "GitHub #5151 \u00b7 examon-sources"],
  ["arena-issue-5106-chuumon-inherited", "GitHub #5106 · chuumon"],
  ["arena-issue-5139-tsunomon-inherited", "GitHub #5139 · tsunomon"],
  ["arena-issue-5141-ukkomon-moving", "GitHub #5141 · ukkomon"],
  ["arena-issue-5126-yuuki-end-turn", "GitHub #5126 · yuuki"],
  ["arena-issue-5123-ryugumon-watcher", "GitHub #5123 · ryugumon"],
  ["arena-issue-5113-weregarurumon-target", "GitHub #5113 · weregarurumon"],
  ["arena-issue-5118-candlemon-main", "GitHub #5118 · candlemon"],
  ["arena-issue-5142-bt10-087-search", "GitHub #5142 · Taiki Kudo search"],
  ["arena-issue-5155-bt12-021-search", "GitHub #5155 · Veemon search"],
  ["arena-issue-5117-bt13-048-search", "GitHub #5117 · Salamon search"],
  ["arena-issue-5148-bt24-043-search", "GitHub #5148 · Tapirmon search"],
  ["arena-issue-5132-bt24-044-search", "GitHub #5132 · Muchomon search"],
  ["arena-issue-5121-bt24-058-search", "GitHub #5121 · Blimpmon search"],
  ["arena-issue-5138-bt25-022-search", "GitHub #5138 · Lunamon search"],
  ["arena-issue-5131-bt3-093-search", "GitHub #5131 · Davis Motomiya search"],
  ["arena-issue-5108-ex12-073-search", "GitHub #5108 · Giant Meat search"],
  ["arena-issue-5137-ex13-027-search", "GitHub #5137 · Chuumon search"],
  ["arena-issue-5107-ex2-008-search", "GitHub #5107 · Guilmon search"],
  ["arena-issue-5109-ex4-038-search", "GitHub #5109 · Agumon search"],
  ["arena-issue-5135-st14-11-search", "GitHub #5135 · Ai & Mako search"],
  ["arena-issue-5132-st18-04-search", "GitHub #5132 · Pteromon search"],
  ["arena-issue-5114-st20-02-search", "GitHub #5114 · Biyomon search"],
  ["arena-issue-5152-lm-051-search", "GitHub #5152 · Alexandrite Memory Boost! search"],
  ["arena-issue-5132-lm-055-search", "GitHub #5132 · Sprint Dash Training search"],
  ["arena-issue-5182-supreme-connection-delay", "GitHub #5182 · Supreme Connection! Delay"],
  ["arena-issue-5181-sharkmon-shellmon", "GitHub #5181 · Sharkmon onto Shellmon"],
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
            aria-label={portuguese ? "Cenário" : "Scenario"}
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
        <details className="aegis-arena-live-instructions">
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
        presentationPacing={SEQUENTIAL_PACING_ENABLED ? "sequential" : "current"}
        onExit={reset}
      />
    </div>
  );
}
