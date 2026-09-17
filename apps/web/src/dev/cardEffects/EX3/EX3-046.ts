import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function commandramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 1;
  state.memory = -2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const plainDecoy = permanent("demo-commandramon-plain", "EX3-046", 0, 2000);
  const stackedDecoy = permanent("demo-commandramon-stacked", "EX3-046", 0, 2000, [
    { instanceId: "demo-commandramon-source", cardId: "EX3-002" },
  ]);
  const protectedDigimon = permanent("demo-commandramon-protected", "EX3-049", 0, 4000);
  opponent.battleArea.push(permanent("demo-commandramon-opponent", "EX3-053", 1, 12000));
  opponent.handCount = 5;

  if (effect === "protected") {
    you.battleArea.push(plainDecoy, protectedDigimon);
    you.trash.push(stackedDecoy.topCard, ...stackedDecoy.stack);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: [stackedDecoy.topCard.instanceId, ...stackedDecoy.stack.map(({ instanceId }) => instanceId)],
          from: "battleArea",
          to: "trash",
        },
      ],
    };
  }

  if (effect === "declined") {
    you.battleArea.push(plainDecoy, stackedDecoy);
    you.trash.push(protectedDigimon.topCard);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: [protectedDigimon.topCard.instanceId],
          from: "battleArea",
          to: "trash",
        },
      ],
    };
  }

  you.battleArea.push(plainDecoy, stackedDecoy, protectedDigimon);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-commandramon-decoy",
      seat: 0,
      kind: "selectCards",
      promptText: "＜Decoy＞: excluir este Digimon para impedir que o outro Digimon seja excluído?",
      sourceCardId: "EX3-046",
      options: {
        candidateInstanceIds: [plainDecoy.topCard.instanceId, stackedDecoy.topCard.instanceId],
        min: 0,
        max: 1,
        timing: "Static",
        effectText:
          "＜Decoy ([D-Brigade])＞ (When one of your other Digimon with [D-Brigade] in its traits would be deleted by an opponent's effect, you may delete this Digimon to prevent that deletion.)",
      },
    },
  };
}
