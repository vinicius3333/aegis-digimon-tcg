import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function lillymonDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[When Attacking] Suspend 1 of your opponent's Digimon without ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-lillymon-host", "BT1-081", 0, 10000, [
    { instanceId: "demo-lillymon-source", cardId: "BT1-079" },
  ]);
  attacker.isSuspended = true;
  you.battleArea.push(attacker);
  const eligible = permanent("demo-lillymon-eligible", "BT1-016", 1, 5000);
  const blocker = permanent("demo-lillymon-blocker", "BT1-072", 1, 6000);
  blocker.keywords.push("Blocker");
  if (effect === "resolved") eligible.isSuspended = true;
  opponent.battleArea.push(eligible, blocker);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-079",
          effectKey: "BT1-079/suspend",
          description: "Lillymon's inherited effect suspended the opposing Digimon without Blocker.",
          timing: "When Attacking",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-lillymon-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1 opposing Digimon without Blocker to suspend.",
      sourceCardId: "BT1-079",
      options: {
        candidateInstanceIds: [eligible.topCard.instanceId],
        visibleInstanceIds: [eligible.topCard.instanceId, blocker.topCard.instanceId],
        min: 1,
        max: 1,
        timing: "WhenAttacking",
        effectText,
      },
    },
  };
}
