import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function radiationBladeBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired-next-turn" ? 8 : 7;
  state.turnSeat = effect === "expired-next-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const first = permanent("demo-radiation-blade-first", "BT2-009", 0, 4000);
  const second = permanent("demo-radiation-blade-second", "BT2-010", 0, 3000);
  const third = permanent("demo-radiation-blade-third", "BT2-011", 0, 3000);
  const opposing = permanent("demo-radiation-blade-opposing", "BT2-011", 1, 3000);
  if (effect === "two-selected") {
    first.keywords.push("SecurityAttack+1");
    second.keywords.push("SecurityAttack+1");
  }
  you.battleArea.push(first, second, third);
  opponent.battleArea.push(opposing);
  if (effect !== null && effect !== "choose-up-to-two") {
    you.trash.push(card("demo-radiation-blade-option", "BT2-092", 0));
  }
  state.players.push(you, opponent);

  const effectText = "[Main] Up to 2 of your Digimon gain Security Attack +1 for the turn.";
  if (effect === null || effect === "choose-up-to-two") {
    return {
      state,
      decision: {
        decisionId: "demo-radiation-blade-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose up to 2 of your Digimon",
        sourceCardId: "BT2-092",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId, third.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId, third.permanentId, opposing.permanentId],
          min: 0,
          max: 2,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "two-selected": "Exactly 2 selected Digimon gained Security Attack +1; the third did not.",
    "selected-none": "Radiation Blade selected no Digimon, which is legal because the text says up to 2.",
    "expired-next-turn": "The for-the-turn Security Attack +1 grants expired when the turn ended.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-092",
        effectKey: `BT2-092/${effect}`,
        description: descriptions[effect]!,
        timing: "Main",
      },
    ],
  };
}
