import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function arcticBlizzardBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "no-own-digimon" && effect !== "security-to-hand") {
    you.battleArea.push(
      permanent("demo-arctic-blizzard-own", "BT1-009", 0, effect === "trashed-and-boosted" ? 5000 : 3000),
    );
  } else if (effect === "no-own-digimon") {
    you.battleArea.push(permanent("demo-arctic-blizzard-tamer", "BT2-085", 0, 0));
  }
  const sourced = permanent("demo-arctic-blizzard-sourced", "BT1-057", 1, 5000, [
    { instanceId: "demo-arctic-blizzard-source", cardId: "BT1-029" },
  ]);
  const sourceLess = permanent("demo-arctic-blizzard-source-less", "BT1-057", 1, 5000);
  if (effect === null || effect === "choose-host") {
    opponent.battleArea.push(sourced, sourceLess);
  } else if (effect === "trashed-and-boosted" || effect === "no-own-digimon") {
    opponent.battleArea.push(sourceLess);
    opponent.trash.push(card("demo-arctic-blizzard-trashed", "BT1-029", 1));
  } else if (effect === "no-opponent-sources") {
    opponent.battleArea.push(sourceLess);
  } else if (effect === "security-to-hand") {
    you.hand.push(card("demo-arctic-blizzard-security", "BT2-094", 0));
  }
  if (effect !== null && effect !== "choose-host" && effect !== "security-to-hand") {
    you.trash.push(card("demo-arctic-blizzard-option", "BT2-094", 0));
  }
  state.players.push(you, opponent);

  const effectText =
    "[Main] Choose 1 digivolution card of 1 of your opponent's Digimon and trash it. Then, 1 of your Digimon gets +2000 DP for the turn.";
  if (effect === null || effect === "choose-host") {
    return {
      state,
      decision: {
        decisionId: "demo-arctic-blizzard-host-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose an opposing Digimon with a digivolution card",
        sourceCardId: "BT2-094",
        options: {
          candidateInstanceIds: [sourced.permanentId],
          visibleInstanceIds: [sourced.permanentId, sourceLess.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "trashed-and-boosted": "Arctic Blizzard trashed the chosen opposing source, then gave 1 own Digimon +2000 DP.",
    "no-opponent-sources": "With no opposing source to trash, the Then clause still gave 1 own Digimon +2000 DP.",
    "no-own-digimon": "The opposing source was still trashed even though no own Digimon could receive the DP bonus.",
    "security-to-hand": "Arctic Blizzard's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-094",
        effectKey: `BT2-094/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-to-hand" ? "Security" : "Main",
      },
    ],
  };
}
