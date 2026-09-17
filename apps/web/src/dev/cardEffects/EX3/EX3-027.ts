import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function agumonInheritedDemo(effect: string | null): CardEffectsFixture {
  const inherited =
    "[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place [Trial of the Four Great Dragons] in your battle area, ＜Draw 1＞.";
  const mode = effect ?? "dragon";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "next-turn" ? 9 : 8;
  state.turnSeat = mode === "opponent-turn" ? 1 : 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "agumon-opponent");
  const firstHost = permanent("demo-agumon-host-one", "BT1-050", 0, 6000, [
    { instanceId: "demo-agumon-source-one", cardId: "EX3-027" },
  ]);
  const secondHost = permanent("demo-agumon-host-two", "BT1-051", 0, 7000, [
    { instanceId: "demo-agumon-source-two", cardId: "EX3-027" },
  ]);
  const dragon = permanent("demo-agumon-dragon", "EX3-035", 0, 11000);
  const trial = permanent("demo-agumon-trial", "EX3-069", 0, 0);
  const unrelated = permanent("demo-agumon-unrelated", "BT1-029", 0, 2000);
  you.battleArea.push(firstHost);

  let draws = 1;
  let description: string;
  if (mode === "trial") {
    you.battleArea.push(trial);
    description =
      "Trial of the Four Great Dragons foi colocada na área de batalha e o efeito herdado de Agumon comprou 1 carta.";
  } else if (mode === "dragon-then-trial") {
    you.battleArea.push(dragon, trial);
    description =
      "Goldramon foi jogado e ativou o efeito herdado de Agumon primeiro. Trial foi colocada depois, mas a cota compartilhada de Once Per Turn já havia comprado 1 carta.";
  } else if (mode === "trial-then-dragon") {
    you.battleArea.push(trial, dragon);
    description =
      "Trial foi colocada e ativou o efeito herdado de Agumon primeiro. Goldramon foi jogado depois, mas a cota compartilhada de Once Per Turn já havia comprado 1 carta.";
  } else if (mode === "two-copies") {
    you.battleArea.push(secondHost, dragon);
    draws = 2;
    description =
      "Duas cópias herdadas de Agumon responderam independentemente ao mesmo Goldramon e compraram 2 cartas.";
  } else if (mode === "next-turn") {
    you.battleArea.push(dragon);
    draws = 2;
    description =
      "Após a troca de turno, o Once Per Turn de Agumon foi renovado e um novo Four Great Dragons permitiu a segunda compra.";
  } else if (mode === "opponent-turn") {
    you.battleArea.push(dragon);
    draws = 0;
    description = "Goldramon foi jogado no turno do oponente; o efeito Your Turn herdado de Agumon não comprou carta.";
  } else if (mode === "unrelated") {
    you.battleArea.push(unrelated);
    draws = 0;
    description = "Gabumon não possui Four Great Dragons; o efeito herdado de Agumon não comprou carta.";
  } else if (mode === "empty-deck") {
    you.battleArea.push(dragon);
    draws = 0;
    description =
      "Goldramon ativou o efeito herdado de Agumon, mas o baralho estava vazio e nenhuma carta foi comprada.";
  } else {
    you.battleArea.push(dragon);
    description = "Goldramon foi jogado no seu turno e o efeito herdado de Agumon comprou 1 carta.";
  }

  for (let index = 0; index < draws; index += 1) {
    you.hand.push(card(`demo-agumon-draw-${index}`, index === 0 ? "BT1-049" : "BT1-048", 0));
  }
  you.handCount = draws;
  you.deckCount = mode === "empty-deck" ? 0 : 36 - draws;
  opponent.handCount = 5;
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-027",
        effectKey: `EX3-027/${mode}`,
        description: `${description} ${inherited}`,
        timing: "YourTurn",
      },
    ],
  };
}
