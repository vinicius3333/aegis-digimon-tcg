import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function puppetPummelBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const ownFirst = permanent("demo-puppet-pummel-own-a", "BT2-042", 0, 3000);
  const ownSecond = permanent("demo-puppet-pummel-own-b", "BT2-043", 0, 1000);
  const oppFirst = permanent("demo-puppet-pummel-opp-a", "BT2-045", 1, 5000);
  const oppSecond = permanent("demo-puppet-pummel-opp-b", "BT2-046", 1, 6000);
  if (effect !== "no-own-digimon") you.battleArea.push(ownFirst, ownSecond);
  if (effect !== "no-opponent-digimon") opponent.battleArea.push(oppFirst, oppSecond);
  if (effect === "resolved-both") {
    oppSecond.isSuspended = true;
    ownSecond.currentDP = ownSecond.baseDP + 2000;
  } else if (effect === "no-opponent-digimon") {
    ownFirst.currentDP = ownFirst.baseDP + 2000;
  } else if (effect === "no-own-digimon") {
    oppFirst.isSuspended = true;
  }
  if (effect !== null && effect !== "choose-opponent" && effect !== "choose-own") {
    you.trash.push(card("demo-puppet-pummel-option", "BT2-100", 0));
  }
  state.players.push(you, opponent);

  const effectText = "[Main] Suspend 1 of your opponent's Digimon. Then 1 of your Digimon gets +2000 DP for the turn.";
  if (effect === null || effect === "choose-opponent") {
    return {
      state,
      decision: {
        decisionId: "demo-puppet-pummel-suspend",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Suspend 1 opposing Digimon",
        sourceCardId: "BT2-100",
        options: {
          candidateInstanceIds: [oppFirst.permanentId, oppSecond.permanentId],
          visibleInstanceIds: [oppFirst.permanentId, oppSecond.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }
  if (effect === "choose-own") {
    oppSecond.isSuspended = true;
    return {
      state,
      decision: {
        decisionId: "demo-puppet-pummel-boost",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Give 1 of your Digimon +2000 DP",
        sourceCardId: "BT2-100",
        options: {
          candidateInstanceIds: [ownFirst.permanentId, ownSecond.permanentId],
          visibleInstanceIds: [ownFirst.permanentId, ownSecond.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "resolved-both": "Puppet Pummel suspended exactly 1 opposing Digimon, then gave exactly 1 own Digimon +2000 DP.",
    "no-opponent-digimon": "With no opposing Digimon to suspend, the Then clause still gave an own Digimon +2000 DP.",
    "no-own-digimon": "With no own Digimon to boost, Puppet Pummel still suspended an opposing Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-100",
        effectKey: `BT2-100/${effect}`,
        description: descriptions[effect]!,
        timing: "Main",
      },
    ],
  };
}
