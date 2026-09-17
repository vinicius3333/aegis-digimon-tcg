import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function majiramonDemo(effect: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] 1 of your opponent's Digimon gains ＜Security Attack -2＞ (This Digimon checks 2 fewer security cards) until the end of your opponent's turn. If you have a Digimon with [Four Sovereigns] in its traits in play, gain 2 memory.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired" ? 9 : 8;
  state.turnSeat = effect === "active" ? 1 : 0;
  state.memory =
    effect === "active" || effect === "expired" ? 0 : effect === "four-sovereigns" || effect === "no-target" ? 5 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "majiramon-opponent");
  const majiramon = permanent("demo-majiramon", "EX3-032", 0, 7000);
  const azulongmon = permanent("demo-majiramon-azulongmon", "EX3-025", 0, 12000);
  const elecmon = permanent("demo-majiramon-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-majiramon-gabumon", "BT1-029", 1, 2000, [
    { instanceId: "demo-majiramon-gabumon-source", cardId: "BT1-003" },
  ]);
  you.battleArea.push(majiramon);

  if (effect === "four-sovereigns" || effect === "no-target") you.battleArea.push(azulongmon);
  if (effect !== "no-target") opponent.battleArea.push(elecmon, gabumon);
  state.players.push(you, opponent);

  if (!effect) {
    state.turnSeat = 0;
    state.memory = 3;
    return {
      state,
      decision: {
        decisionId: "demo-majiramon-security-attack-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon do oponente para receber Security Attack -2",
        sourceCardId: "EX3-032",
        options: {
          candidateInstanceIds: [elecmon.permanentId, gabumon.permanentId],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    resolved:
      "Majiramon escolheu Elecmon: ele recebeu Security Attack -2 até o fim do turno do oponente. Sem Four Sovereigns em jogo, não ganhou memória; após pagar 7, a memória ficou em 3.",
    "no-sovereign":
      "Sem Four Sovereigns em jogo, Majiramon aplicou Security Attack -2 a Elecmon, mas não ganhou 2 de memória; após pagar 7, a memória ficou em 3.",
    "four-sovereigns":
      "Com Azulongmon, um Four Sovereigns, em jogo, Majiramon aplicou Security Attack -2 a Elecmon e ganhou 2 de memória; após pagar 7, a memória ficou em 5.",
    "no-target":
      "Não havia Digimon do oponente para receber Security Attack -2. O efeito não abriu uma escolha impossível, mas Azulongmon ainda permitiu ganhar 2 de memória; a memória ficou em 5.",
    active:
      "Durante o turno do oponente, Elecmon continua com Security Attack -2 por Majiramon; a redução só termina ao fim deste turno.",
    expired:
      "O turno do oponente terminou; o Security Attack -2 concedido por Majiramon expirou e Elecmon voltou ao valor normal.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-032",
        effectKey: `EX3-032/${effect}`,
        description: `${descriptions[effect] ?? descriptions.resolved} ${onPlay}`,
        timing: "OnPlay",
      },
    ],
  };
}
