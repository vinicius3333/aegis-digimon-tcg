import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function nightRaidBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const eligible = card("demo-night-raid-eligible", "ST6-04", 0);
  const otherEligible = card("demo-night-raid-other", "BT2-067", 0);
  const ineligible = card("demo-night-raid-level-four", "BT2-071", 0);
  if (effect === "resolved" || effect === "security") {
    you.battleArea.push(permanent("demo-night-raid-revived", "ST6-04", 0, 2000));
    you.trash.push(card("demo-night-raid-unreturned-option", "ST6-15", 0), ineligible);
  } else {
    you.trash.push(eligible, otherEligible, ineligible);
  }
  state.players.push(you, opponent);
  if (effect === null || effect === "choose-main") {
    return {
      state,
      decision: {
        decisionId: "demo-night-raid-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Play 1 purple level 3 Digimon card from your trash",
        sourceCardId: "BT2-108",
        options: {
          candidateInstanceIds: [eligible.instanceId, otherEligible.instanceId],
          visibleInstanceIds: [eligible.instanceId, otherEligible.instanceId, ineligible.instanceId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText:
            "Play 1 purple level 3 Digimon card from your trash without paying its memory cost. Its On Play effects don't activate.",
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
        sourceCardId: "BT2-108",
        effectKey: `BT2-108/${effect}`,
        description:
          "Night Raid played Dracmon from trash for free while atomically suppressing its On Play effect; the Option stayed in trash.",
        timing: effect === "security" ? "Security" : "Main",
      },
    ],
  };
}
