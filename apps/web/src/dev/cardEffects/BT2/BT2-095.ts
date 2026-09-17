import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function riverOfPowerBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const own = permanent("demo-river-power-own", "BT2-021", 0, 3000);
  you.battleArea.push(own);
  const first = permanent("demo-river-power-first", "BT2-033", 1, 3000, [
    { instanceId: "demo-river-power-source", cardId: "BT2-001" },
  ]);
  const second = permanent("demo-river-power-second", "BT2-021", 1, 3000);
  const third = permanent("demo-river-power-third", "BT2-067", 1, 2000);
  const levelFour = permanent("demo-river-power-level-four", "BT2-071", 1, 4000);
  if (effect === "returned-three") {
    opponent.hand.push(
      card("demo-river-power-returned-a", "BT2-033", 1),
      card("demo-river-power-returned-b", "BT2-021", 1),
      card("demo-river-power-returned-c", "BT2-067", 1),
    );
    opponent.trash.push(card("demo-river-power-trashed-source", "BT2-001", 1));
    opponent.battleArea.push(levelFour);
    you.trash.push(card("demo-river-power-option", "BT2-095", 0));
  } else {
    opponent.battleArea.push(first, second, third, levelFour);
    if (effect === "returned-none") you.trash.push(card("demo-river-power-option", "BT2-095", 0));
  }
  state.players.push(you, opponent);

  const effectText =
    "[Main] Return up to 3 of your opponent's level 3 Digimon to their hand. Trash all of the digivolution cards of those Digimon.";
  if (effect === null || effect === "choose-up-to-three") {
    return {
      state,
      decision: {
        decisionId: "demo-river-power-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Return up to 3 opposing level 3 Digimon",
        sourceCardId: "BT2-095",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId, third.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId, third.permanentId, levelFour.permanentId],
          min: 0,
          max: 3,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "returned-three":
      "River of Power returned 3 opposing level 3 Digimon, trashed only their sources, and left the level 4 and own Digimon in play.",
    "returned-none": "River of Power returned no Digimon, which is legal because the effect says up to 3.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-095",
        effectKey: `BT2-095/${effect}`,
        description: descriptions[effect]!,
        timing: "Main",
      },
    ],
  };
}
