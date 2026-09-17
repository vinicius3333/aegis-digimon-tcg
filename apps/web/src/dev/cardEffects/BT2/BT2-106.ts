import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function infinityCannonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const target = permanent("demo-infinity-cannon-target", effect === "resolved" ? "BT2-052" : "BT2-083", 1, 3000);
  if (effect !== "resolved") {
    target.stack.push(
      card("demo-infinity-source-3", "BT2-052", 1),
      card("demo-infinity-source-4", "BT2-056", 1),
      card("demo-infinity-source-5", "BT2-060", 1),
      card("demo-infinity-source-6", "BT2-064", 1),
    );
  }
  const other = permanent("demo-infinity-cannon-other", "BT2-046", 1, 7000);
  other.stack.push(card("demo-infinity-other-source", "BT2-044", 1));
  opponent.battleArea.push(target, other);
  if (effect === "resolved") {
    for (const [index, cardId] of ["BT2-083", "BT2-064", "BT2-060", "BT2-056"].entries()) {
      opponent.trash.push(card(`demo-infinity-trashed-${index}`, cardId, 1));
    }
  }
  state.players.push(you, opponent);
  if (effect === null || effect === "choose-main") {
    return {
      state,
      decision: {
        decisionId: "demo-infinity-cannon-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon to De-Digivolve 4",
        sourceCardId: "BT2-106",
        options: {
          candidateInstanceIds: [target.permanentId, other.permanentId],
          visibleInstanceIds: [target.permanentId, other.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText: "[Main] De-Digivolve 4 on 1 of your opponent's Digimon.",
        },
      },
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-106",
        effectKey: `BT2-106/${effect}`,
        description:
          "Infinity Cannon trashed four cards from the selected stack and stopped when it became a level 3 Digimon.",
        timing: effect === "security" ? "Security" : "Main",
      },
    ],
  };
}
