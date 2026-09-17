import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function beelzemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "shortcut-resolved" ? 1 : 5;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  for (let index = 0; index < 10; index += 1) {
    you.trash.push(card(`demo-beelzemon-trash-${index}`, index % 2 === 0 ? "BT2-067" : "BT2-071", 0));
  }
  if (effect === null || effect === "shortcut-ready") {
    you.battleArea.push(permanent("demo-beelzemon-impmon", "BT2-068", 0, 1000));
    you.hand.push(card("demo-beelzemon-hand", "BT2-111", 0));
  } else {
    const beelzemon = permanent("demo-beelzemon-evolved", "BT2-111", 0, 11000);
    beelzemon.stack.push(card("demo-beelzemon-impmon-source", "BT2-068", 0));
    you.battleArea.push(beelzemon);
  }
  if (effect === "delete-target") {
    const first = permanent("demo-beelzemon-delete-a", "BT2-013", 1, 4000);
    const second = permanent("demo-beelzemon-delete-b", "BT2-044", 1, 4000);
    const levelFive = permanent("demo-beelzemon-level-five", "BT2-046", 1, 7000);
    opponent.battleArea.push(first, second, levelFive);
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-beelzemon-delete-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 opposing level 4 or lower Digimon",
        sourceCardId: "BT2-111",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId, levelFive.permanentId],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: "[When Digivolving] Delete 1 of your opponent's level 4 or lower Digimon.",
        },
      },
    };
  }
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-111",
        effectKey: `BT2-111/${effect ?? "shortcut-ready"}`,
        description:
          effect === "shortcut-resolved"
            ? "With 10 cards in trash, Impmon digivolved into Beelzemon for exactly 4 memory while ignoring normal requirements."
            : "Ten cards in trash enable the exact-name Impmon battle-area shortcut into Beelzemon for 4 memory.",
        timing: "YourTurn",
      },
    ],
  };
}
