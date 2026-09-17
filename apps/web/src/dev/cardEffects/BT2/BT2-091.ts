import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function volcanicFlareBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const below = permanent("demo-volcanic-flare-below", "BT2-067", 1, 2000);
  const boundary = permanent("demo-volcanic-flare-boundary", "BT2-071", 1, 4000);
  const above = permanent("demo-volcanic-flare-above", "BT2-045", 1, 5000);
  if (effect === null || effect === "choose-target") {
    you.battleArea.push(permanent("demo-volcanic-flare-own", "BT2-009", 0, 4000));
    opponent.battleArea.push(below, boundary, above);
  } else if (effect === "above-boundary") {
    opponent.battleArea.push(above);
    you.trash.push(card("demo-volcanic-flare-option", "BT2-091", 0));
  } else {
    opponent.trash.push(card("demo-volcanic-flare-deleted", "BT2-071", 1));
    if (effect === "main-deletion") you.trash.push(card("demo-volcanic-flare-option", "BT2-091", 0));
  }
  state.players.push(you, opponent);

  const effectText = "[Main] Delete 1 of your opponent's Digimon with 4000 DP or less.";
  if (effect === null || effect === "choose-target") {
    return {
      state,
      decision: {
        decisionId: "demo-volcanic-flare-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Delete 1 opposing Digimon with 4000 DP or less",
        sourceCardId: "BT2-091",
        options: {
          candidateInstanceIds: [below.permanentId, boundary.permanentId],
          visibleInstanceIds: [below.permanentId, boundary.permanentId, above.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "main-deletion": "Volcanic Flare deleted an opposing Digimon at the exact 4000 DP boundary.",
    "above-boundary": "The only opposing Digimon had 5000 DP, so Volcanic Flare could not delete it.",
    "security-deletion": "Volcanic Flare's Security effect activated its Main effect and deleted the 4000 DP Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-091",
        effectKey: `BT2-091/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-deletion" ? "Security" : "Main",
      },
    ],
  };
}
