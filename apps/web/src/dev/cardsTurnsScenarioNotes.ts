export const CARDS_TURNS_SCENARIO_NOTES = {
  "arena-github-5373-targetmon-assembly": {
    en: "Play KingSukamon with Assembly. Select both Sukamon and Targetmon from trash. Decline the optional rewrite. All three cards become sources and the play costs 3.",
    ptBR: "Jogue KingSukamon com Assembly. Selecione os dois Sukamon e Targetmon do lixo. Recuse a alteração opcional. As três cartas viram fontes e o custo é 3.",
  },
  "arena-github-5376-patamon-angemon": {
    en: "At the start of Main, choose either Angemon from security for Patamon. Put Angemon from hand into security. Evolution is free, security returns to three cards, and Patamon's inherited effect gains 1 memory.",
    ptBR: "No início da Main, escolha um dos Angemon da segurança para Patamon. Coloque Angemon da mão na segurança. A evolução é gratuita, a segurança volta a três cartas e o herdado de Patamon ganha 1 memória.",
  },
  "arena-github-5402-dedigi-main": {
    en: "End your turn. The opponent can use Ultimate Flare to expose Dracomon X. On your next Main phase, resolve Davis & Ken and evolve Dracomon X into Coredramon from hand without paying the cost.",
    ptBR: "Encerre o turno. O oponente pode usar Ultimate Flare para expor Dracomon X. Na próxima Main, resolva Davis & Ken e evolua Dracomon X para Coredramon da mão sem pagar o custo.",
  },
  "arena-github-5404-knightmon-aura": {
    en: "End your turn. During the opponent's turn, Knightmon grants DarkKnightmon Reboot and Blocker. DarkKnightmon has neither grant during your turn; the unrelated Agumon gains neither keyword.",
    ptBR: "Encerre o turno. No turno do oponente, Knightmon concede Reboot e Blocker a DarkKnightmon. Os bônus não se aplicam no seu turno nem ao Agumon sem texto Knightmon.",
  },
  "arena-github-5405-material-save": {
    en: "Attack the opponent's suspended Digimon with DarkKnightmon. On deletion, select SkullKnightmon for Material Save under your Tamer, then accept DarkKnightmon's On Deletion to play that same SkullKnightmon free.",
    ptBR: "Ataque o Digimon suspenso do oponente com DarkKnightmon. Na deleção, salve SkullKnightmon sob o Tamer com Material Save e aceite o On Deletion de DarkKnightmon para jogar o mesmo SkullKnightmon gratuitamente.",
  },
  "arena-github-5406-craniamon-suspend": {
    en: "Attack with Craniamon and accept its suspension effect. Both opponent Agumon tied at the lowest play cost are deleted; the more expensive Digimon survives.",
    ptBR: "Ataque com Craniamon e aceite o efeito ao suspender. Os dois Agumon empatados no menor custo são deletados; o Digimon mais caro permanece.",
  },
  "arena-github-5407-kakkinmon-opponent-end": {
    en: "End your turn and decline Kakkinmon. At the opponent's turn end, accept Kakkinmon and suspend Craniamon. Draw 1, then accept Craniamon to delete both lowest-cost Agumon.",
    ptBR: "Encerre o seu turno e recuse Kakkinmon. No fim do turno adversário, aceite Kakkinmon e suspenda Craniamon. Compre 1 e aceite Craniamon para deletar os dois Agumon de menor custo.",
  },
  "arena-github-5414-kakkinmon-opponent-end": {
    en: "Decline Kakkinmon at your own turn end, then accept it at the opponent's turn end. Select your unsuspended Craniamon for the cost, draw 1 and resolve the tied lowest-cost deletion before your next turn begins.",
    ptBR: "Recuse Kakkinmon no fim do seu turno e aceite no fim do turno adversário. Selecione Craniamon não suspenso para pagar o custo, compre 1 e resolva a deleção empatada antes do próximo turno.",
  },
  "arena-github-5413-psychemon-assembly": {
    en: "With opponent Psychemon in play, Assembly KingSukamon using two Sukamon and Targetmon. The materials still move under KingSukamon, but its printed play cost 7 is paid in full.",
    ptBR: "Com Psychemon adversário em campo, faça Assembly de KingSukamon com dois Sukamon e Targetmon. Os materiais vão sob KingSukamon, mas o custo impresso 7 é pago integralmente.",
  },
  "arena-github-5413-psychemon-digixros": {
    en: "With opponent Psychemon in play, DigiXros DarkKnightmon using SkullKnightmon and DeadlyAxemon. The materials still move under DarkKnightmon, but its printed play cost 8 is paid in full. Decline its optional deletion.",
    ptBR: "Com Psychemon adversário em campo, faça DigiXros de DarkKnightmon com SkullKnightmon e DeadlyAxemon. Os materiais vão sob DarkKnightmon, mas o custo impresso 8 é pago integralmente. Recuse a deleção opcional.",
  },
  "arena-github-5415-egg-breeding": {
    en: "Digivolve Bebydomon in breeding into Dracomon X. Its printed level-2 evolution costs 1. Bebydomon's inherited When Attacking effect does not activate in breeding.",
    ptBR: "Evolua Bebydomon na criação para Dracomon X. A evolução impressa de nível 2 custa 1. O herdado When Attacking de Bebydomon não ativa na criação.",
  },
} as const;
export const CARDS_TURNS_SCENARIO_OPTIONS = (
  Object.keys(CARDS_TURNS_SCENARIO_NOTES) as (keyof typeof CARDS_TURNS_SCENARIO_NOTES)[]
).map(
  (value) => [value, `GitHub ${value.replace("arena-github-", "").replaceAll("-", " ")}`] as [typeof value, string],
);
