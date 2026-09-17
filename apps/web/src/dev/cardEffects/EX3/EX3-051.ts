import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function tankdramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "tankdramon-opponent");

  if (effect === "inherited") {
    const host = permanent("demo-tankdramon-host", "EX3-054", 0, 12000, [
      { instanceId: "demo-tankdramon-source", cardId: "EX3-051" },
    ]);
    const attacker = permanent("demo-tankdramon-attacker", "EX3-049", 0, 4000);
    attacker.isSuspended = true;
    you.battleArea.push(host, attacker);
    const revealed = [
      { instanceId: "demo-tankdramon-commandramon", cardId: "BT4-063" },
      { instanceId: "demo-tankdramon-inherited-filler", cardId: "BT1-010" },
    ];
    if (step === "declined") {
      you.trash.push(...revealed.map(({ instanceId, cardId }) => card(instanceId, cardId, 0)));
      state.players.push(you, opponent);
      return {
        state,
        events: [
          {
            kind: "cardsMoved",
            instanceIds: revealed.map(({ instanceId }) => instanceId),
            from: "deck",
            to: "trash",
          },
        ],
      };
    }
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-tankdramon-inherited-reveal",
        seat: 0,
        kind: "selectCards",
        promptText: "Você pode jogar 1 Commandramon revelado sem pagar o custo",
        sourceCardId: "EX3-051",
        options: {
          candidateInstanceIds: [revealed[0]!.instanceId],
          visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
          visibleCards: revealed,
          min: 0,
          max: 1,
          timing: "YourTurn",
          effectText:
            "[Your Turn] [Once Per Turn] When one of your Digimon with [D-Brigade] in its traits attacks, reveal the top 2 cards of your deck. You may play 1 [Commandramon] among them without paying the cost. Trash the rest.",
        },
      },
    };
  }

  you.battleArea.push(
    permanent("demo-tankdramon", "EX3-051", 0, 7000, [{ instanceId: "demo-tankdramon-base", cardId: "EX3-049" }]),
  );
  const revealed = [
    { instanceId: "demo-tankdramon-sealsdramon", cardId: "EX3-049" },
    { instanceId: "demo-tankdramon-too-expensive", cardId: "EX3-051" },
    { instanceId: "demo-tankdramon-hina", cardId: "EX3-065" },
  ];
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-tankdramon-when-digivolving",
      seat: 0,
      kind: "selectCards",
      promptText: "Você pode jogar 1 Digimon D-Brigade com custo de jogo 5 ou menos",
      sourceCardId: "EX3-051",
      options: {
        candidateInstanceIds: [revealed[0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 0,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] Reveal the top 3 cards of your deck. You may play 1 Digimon card with [D-Brigade] in its traits and a play cost of 5 or less among them without paying the cost. Trash the rest.",
      },
    },
  };
}
