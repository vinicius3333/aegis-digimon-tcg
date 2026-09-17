import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function piedmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "retaliation-battle") {
    you.trash.push(card("demo-piedmon-bt2-deleted", "BT2-080", 0));
    opponent.trash.push(card("demo-piedmon-bt2-retaliated", "BT1-084", 1));
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT2-080",
          effectKey: "BT2-080/retaliation-battle",
          description: "Piedmon lost the battle and deleted the opposing Digimon with Retaliation.",
          timing: "AfterBattle",
        },
      ],
    };
  }

  const piedmon = permanent("demo-piedmon-bt2", "BT2-080", 0, 10000);
  piedmon.keywords.push("Retaliation");
  you.battleArea.push(piedmon);
  const eligibleRookie = card("demo-piedmon-bt2-rookie", "BT2-067", 0);
  const eligibleOnPlay = card("demo-piedmon-bt2-on-play", "ST6-04", 0);
  const eligibleChampion = card("demo-piedmon-bt2-champion", "BT2-071", 0);
  const ineligibleLevel = card("demo-piedmon-bt2-level-five", "BT2-075", 0);
  const ineligibleColor = card("demo-piedmon-bt2-yellow", "BT2-034", 0);
  const option = card("demo-piedmon-bt2-option", "ST6-15", 0);
  if (effect === "played-two" || effect === "suppressed-on-play") {
    you.battleArea.push(permanent("demo-piedmon-bt2-played-a", "ST6-04", 0, 2000));
    you.battleArea.push(permanent("demo-piedmon-bt2-played-b", "BT2-071", 0, 4000));
    if (effect === "suppressed-on-play") you.trash.push(option);
  } else {
    you.trash.push(eligibleRookie, eligibleOnPlay, eligibleChampion, ineligibleLevel, ineligibleColor, option);
  }
  state.players.push(you, opponent);

  const effectText =
    "[On Play] You may play up to 2 level 4 or lower purple Digimon cards from your trash without paying their memory costs. Their On Play effects don't activate.";
  if (effect === null || effect === "choose-up-to-two") {
    return {
      state,
      decision: {
        decisionId: "demo-piedmon-bt2-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Play up to 2 purple level 4 or lower Digimon",
        sourceCardId: "BT2-080",
        options: {
          candidateInstanceIds: [eligibleRookie.instanceId, eligibleOnPlay.instanceId, eligibleChampion.instanceId],
          visibleInstanceIds: [
            eligibleRookie.instanceId,
            eligibleOnPlay.instanceId,
            eligibleChampion.instanceId,
            ineligibleLevel.instanceId,
            ineligibleColor.instanceId,
            option.instanceId,
          ],
          min: 0,
          max: 2,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "played-two": "Piedmon played 2 eligible purple Digimon from trash without paying their costs.",
    "suppressed-on-play":
      "Dracmon was played by Piedmon, but its On Play effect was suppressed and the Option remained in trash.",
    declined: "Piedmon's optional On Play effect was declined, so every candidate remained in trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-080",
        effectKey: `BT2-080/${effect}`,
        description: descriptions[effect]!,
        timing: "OnPlay",
      },
    ],
  };
}
