import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function toropiamonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving = "[When Digivolving] If this Digimon is suspended, suspend 1 of your opponent's Digimon.";
  const inherited =
    "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const toropiamon = permanent("demo-toropiamon", "EX3-042", 0, 7000, [
    { instanceId: "demo-toropiamon-base", cardId: "BT1-072" },
  ]);
  const elecmon = permanent("demo-toropiamon-elecmon", "BT1-028", 1, 3000);
  const gabumon = permanent("demo-toropiamon-gabumon", "BT1-029", 1, 1000);
  const gomamon = permanent("demo-toropiamon-gomamon", "BT1-030", 1, 3000);
  opponent.handCount = 5;

  if (effect === "inactive") {
    you.battleArea.push(toropiamon);
    opponent.battleArea.push(elecmon);
    state.players.push(you, opponent);
    return { state };
  }

  if (effect === "evade") {
    const host = permanent("demo-toropiamon-evade-host", "EX3-041", 0, 7000, [
      { instanceId: "demo-toropiamon-inherited", cardId: "EX3-042" },
    ]);
    host.isSuspended = true;
    elecmon.isSuspended = true;
    you.battleArea.push(host);
    opponent.battleArea.push(elecmon, gabumon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-042",
          effectKey: "EX3-042/q3416-evade",
          description: "Evade suspendeu Groundramon, então Toropiamon suspendeu Elecmon.",
          timing: "YourTurn",
        },
      ],
    };
  }

  const source =
    effect === "inherited"
      ? permanent("demo-toropiamon-host", "EX3-041", 0, 7000, [
          { instanceId: "demo-toropiamon-source", cardId: "EX3-042" },
        ])
      : toropiamon;
  const ally = permanent("demo-toropiamon-pomumon", "EX3-038", 0, 2000);
  if (effect === "inherited") ally.isSuspended = true;
  else source.isSuspended = true;
  gabumon.isSuspended = true;
  you.battleArea.push(source, ally);
  opponent.battleArea.push(elecmon, gomamon, gabumon);
  state.players.push(you, opponent);

  return {
    state,
    decision: {
      decisionId: effect === "inherited" ? "demo-toropiamon-inherited" : "demo-toropiamon-digivolving",
      seat: 0,
      kind: "chooseTargets",
      promptText:
        effect === "inherited"
          ? "Um efeito suspendeu seu Digimon. Escolha 1 Digimon ativo do oponente para suspender"
          : "Toropiamon digievoluiu suspensa. Escolha 1 Digimon ativo do oponente para suspender",
      sourceCardId: "EX3-042",
      options: {
        candidateInstanceIds: [elecmon.topCard.instanceId, gomamon.topCard.instanceId],
        visibleInstanceIds: [elecmon.topCard.instanceId, gomamon.topCard.instanceId, gabumon.topCard.instanceId],
        min: 1,
        max: 1,
        timing: effect === "inherited" ? "YourTurn" : "WhenDigivolving",
        effectText: effect === "inherited" ? inherited : whenDigivolving,
      },
    },
  };
}
