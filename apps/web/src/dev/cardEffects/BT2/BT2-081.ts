import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function metalGarurumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const metalGarurumon = permanent("demo-metalgarurumon-bt2", "BT2-081", 0, 11000);
  metalGarurumon.isSuspended = true;
  you.battleArea.push(metalGarurumon);
  const eligible = card("demo-metalgarurumon-bt2-eligible", "BT2-067", 0);
  const dracmon = card("demo-metalgarurumon-bt2-dracmon", "ST6-04", 0);
  const levelFour = card("demo-metalgarurumon-bt2-level-four", "BT2-071", 0);
  const yellow = card("demo-metalgarurumon-bt2-yellow", "BT2-034", 0);
  const option = card("demo-metalgarurumon-bt2-option", "ST6-15", 0);
  if (effect === "played-level-three") {
    you.battleArea.push(permanent("demo-metalgarurumon-bt2-played", "BT2-067", 0, 2000));
  } else if (effect === "suppressed-on-play") {
    you.battleArea.push(permanent("demo-metalgarurumon-bt2-played", "ST6-04", 0, 2000));
    you.trash.push(option);
  } else {
    you.trash.push(eligible, dracmon, levelFour, yellow, option);
  }
  state.players.push(you, opponent);

  const effectText =
    "[When Attacking] You may play 1 purple level 3 Digimon card from your trash without paying its memory cost. Any [On Play] effects on Digimon played with this effect don't activate.";
  if (effect === null || effect === "choose-level-three") {
    return {
      state,
      decision: {
        decisionId: "demo-metalgarurumon-bt2-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Play 1 purple level 3 Digimon",
        sourceCardId: "BT2-081",
        options: {
          candidateInstanceIds: [eligible.instanceId, dracmon.instanceId],
          visibleInstanceIds: [
            eligible.instanceId,
            dracmon.instanceId,
            levelFour.instanceId,
            yellow.instanceId,
            option.instanceId,
          ],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "played-level-three": "MetalGarurumon played a purple level 3 Digimon from trash without paying its cost.",
    "suppressed-on-play": "Dracmon was played, but its On Play effect was suppressed and the Option remained in trash.",
    declined: "MetalGarurumon's optional When Attacking effect was declined, so every card remained in trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-081",
        effectKey: `BT2-081/${effect}`,
        description: descriptions[effect]!,
        timing: "WhenAttacking",
      },
    ],
  };
}
