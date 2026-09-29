import type { arenaEn } from "./arena.en";

export const arenaPtBR: Record<keyof typeof arenaEn, string> = {
  "redesign.arena.look.open": "Visual da arena",
  "redesign.arena.look.title": "Visual da arena",
  "redesign.arena.look.description": "Cores do tabuleiro e cenário. As mudanças aparecem no tabuleiro na hora.",

  "redesign.arena.badge.stackTitle": "Pilha de digivolução",
  "redesign.arena.badge.stack": "{count} cartas de digivolução sob este Digimon.",
  "redesign.arena.badge.dpTitle": "{dp} DP",
  "redesign.arena.badge.dpUp": "DP impresso {base}, aumentado em {amount} por efeitos.",
  "redesign.arena.badge.dpDown": "DP impresso {base}, reduzido em {amount} por efeitos.",
  "redesign.arena.badge.dpChanged": "Efeitos mudaram o DP deste Digimon.",
  "redesign.arena.badge.moreTitle": "Mais efeitos neste Digimon",
  "redesign.arena.badge.keywordsMore": "Mais {count} palavras-chave. Abra a carta para ler todas.",

  "redesign.arena.restriction.immuneToOpponentEffects": "Os efeitos do oponente não afetam este Digimon.",
  "redesign.arena.restriction.immuneToOpponentDigimonEffects":
    "Os efeitos dos Digimon do oponente não afetam este Digimon.",
  "redesign.arena.restriction.immuneToOpponentOptionEffects":
    "Os efeitos das cartas de Opção do oponente não afetam este Digimon.",
  "redesign.arena.restriction.immuneToOpponentTamerEffects":
    "Os efeitos dos Tamers do oponente não afetam este Digimon.",
  "redesign.arena.restriction.protectedFromDpReduction": "Os efeitos do oponente não podem reduzir o DP deste Digimon.",
  "redesign.arena.restriction.protectedFromDeDigivolve":
    "Os efeitos do oponente não podem descartar cartas do topo deste Digimon.",
  "redesign.arena.restriction.protectedFromEffectDeletion": "Os efeitos do oponente não podem deletar este Digimon.",
  "redesign.arena.restriction.protectedFromEffectReturn":
    "Os efeitos do oponente não podem devolver este Digimon para a mão ou para o deck.",
  "redesign.arena.restriction.attacksAtStartOfMainPhase":
    "Um efeito faz este Digimon atacar no início da fase principal, se puder.",
  "redesign.arena.restriction.cannotAttack": "Um efeito impede este Digimon de atacar.",
  "redesign.arena.restriction.cannotBlock": "Um efeito impede este Digimon de bloquear.",
  "redesign.arena.restriction.cannotSuspend": "Um efeito impede este Digimon de ser suspenso.",
  "redesign.arena.restriction.cannotUnsuspend": "Um efeito mantém este Digimon suspenso na fase de ativação.",
  "redesign.arena.restriction.cannotActivateWhenDigivolving":
    "Um efeito impede que os efeitos [When Digivolving] deste Digimon sejam ativados.",

  "redesign.arena.keyword.Blocker":
    "Quando um Digimon do oponente ataca, você pode suspender este Digimon para forçar o oponente a atacá-lo no lugar.",
  "redesign.arena.keyword.SecurityAttackUp": "Este Digimon verifica {count} carta(s) de segurança a mais.",
  "redesign.arena.keyword.SecurityAttackDown": "Este Digimon verifica {count} carta(s) de segurança a menos.",
  "redesign.arena.keyword.SecurityAttack": "Muda quantas cartas de segurança este Digimon verifica ao atacar.",
  "redesign.arena.keyword.Recovery": "Coloque as X carta(s) do topo do seu deck no topo da sua pilha de segurança.",
  "redesign.arena.keyword.Piercing":
    "Quando este Digimon ataca, deleta um Digimon do oponente e sobrevive à batalha, ele faz as verificações de segurança que faria normalmente.",
  "redesign.arena.keyword.Draw": "Compre X carta(s) do seu deck.",
  "redesign.arena.keyword.Jamming": "Este Digimon não pode ser deletado em batalhas contra Digimon de Segurança.",
  "redesign.arena.keyword.Digisorption":
    "Quando um dos seus Digimon digivolve nesta carta a partir da sua mão, você pode suspender 1 dos seus Digimon para reduzir o custo de digivolução em X.",
  "redesign.arena.keyword.Reboot": "Reative este Digimon durante a fase de ativação do oponente.",
  "redesign.arena.keyword.DeDigivolve":
    "Descarte até X cartas do topo de um Digimon do oponente. Se ele não tiver cartas de digivolução, ou virar um Digimon de nível 3, você não pode descartar mais cartas.",
  "redesign.arena.keyword.Retaliation":
    "Quando este Digimon é deletado após perder uma batalha, delete o Digimon com que ele batalhava.",
  "redesign.arena.keyword.DigiBurst": "Descarte X cartas de digivolução deste Digimon para ativar o efeito seguinte.",
  "redesign.arena.keyword.Rush": "Este Digimon pode atacar no turno em que entra em jogo.",
  "redesign.arena.keyword.Blitz": "Este Digimon pode atacar quando o oponente tem 1 ou mais de memória.",
  "redesign.arena.keyword.Delay":
    "Descarte esta carta da sua área de batalha para ativar o efeito seguinte. Não é possível ativá-lo no turno em que a carta entra em jogo.",
  "redesign.arena.keyword.Decoy":
    "Quando outro dos seus Digimon do tipo indicado seria deletado por um efeito do oponente, você pode deletar este Digimon para impedir essa deleção.",
  "redesign.arena.keyword.ArmorPurge":
    "Quando este Digimon seria deletado, você pode descartar a carta do topo dele para impedir essa deleção.",
  "redesign.arena.keyword.Engage": "No fim do seu turno, este Digimon pode atacar.",
  "redesign.arena.keyword.unlisted": "Impressa nesta carta. Abra a carta para ler o efeito completo.",

  "redesign.arena.details.keywords": "Palavras-chave",
};
