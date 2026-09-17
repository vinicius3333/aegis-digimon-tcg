import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function mattIshidaPurpleBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "above-threshold" ? 4 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-matt-purple-bt2", "BT2-090", 0, 0));
  const purpleDigimon = card("demo-matt-purple-bt2-digimon", "BT2-067", 0);
  const purpleOption = card("demo-matt-purple-bt2-option", "ST6-15", 0);
  const redDigimon = card("demo-matt-purple-bt2-red", "BT1-010", 0);
  const redOption = card("demo-matt-purple-bt2-red-option", "BT2-091", 0);
  if (effect === "recovered-digimon" || effect === "security-played") {
    you.hand.push(purpleDigimon);
  } else if (effect === "recovered-option") {
    you.hand.push(purpleOption);
  } else if (effect === "choose-trash-card") {
    you.trash.push(purpleDigimon, purpleOption, redDigimon, redOption);
  }
  state.players.push(you, opponent);

  const effectText = "[On Play] Return 1 purple Digimon card or purple Option card from your trash to your hand.";
  if (effect === "choose-trash-card") {
    return {
      state,
      decision: {
        decisionId: "demo-matt-purple-bt2-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Return 1 purple Digimon or Option card",
        sourceCardId: "BT2-090",
        options: {
          candidateInstanceIds: [purpleDigimon.instanceId, purpleOption.instanceId],
          visibleInstanceIds: [
            purpleDigimon.instanceId,
            purpleOption.instanceId,
            redDigimon.instanceId,
            redOption.instanceId,
          ],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const selected = effect ?? "memory-set";
  const descriptions: Record<string, string> = {
    "memory-set": "At 2 or less memory, Matt set the controller's memory to 3 at turn start.",
    "above-threshold": "Memory was already above 2, so Matt did not lower it.",
    "recovered-digimon": "Matt returned 1 purple Digimon card from trash to hand.",
    "recovered-option": "Matt returned 1 purple Option card from trash to hand.",
    "security-played":
      "Matt's Security effect played him for free, then his On Play effect recovered a purple Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-090",
        effectKey: `BT2-090/${selected}`,
        description: descriptions[selected]!,
        timing:
          selected === "security-played" ? "Security" : selected.startsWith("recovered") ? "OnPlay" : "StartOfYourTurn",
      },
    ],
  };
}
