import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function rosemonDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Opponent's Turn] When an opponent's Digimon attacks a player, if this Digimon is suspended, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const rosemon = permanent("demo-rosemon", "BT1-082", 0, 11000);
  rosemon.isSuspended = effect !== "became-unsuspended";
  you.battleArea.push(rosemon);
  const attacker = permanent("demo-rosemon-attacker", "BT1-016", 1, 5000);
  const blocker = permanent("demo-rosemon-blocker", "BT1-072", 1, 6000);
  attacker.isSuspended = true;
  blocker.keywords.push("Blocker");
  if (effect === "resolved" || effect === "became-suspended") blocker.isSuspended = true;
  opponent.battleArea.push(attacker, blocker);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "became-unsuspended") return { state };
  if (effect === "resolved" || effect === "became-suspended") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-082",
          effectKey: "BT1-082/suspend-opponent-digimon",
          description:
            effect === "became-suspended"
              ? "Rosemon became suspended before activation, so its controller suspended the opposing Blocker."
              : "Rosemon's controller chose and suspended the opposing Digimon with Blocker.",
          timing: "Opponent's Turn",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-rosemon-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1 of your opponent's Digimon to suspend.",
      sourceCardId: "BT1-082",
      options: {
        candidateInstanceIds: [attacker.topCard.instanceId, blocker.topCard.instanceId],
        visibleInstanceIds: [attacker.topCard.instanceId, blocker.topCard.instanceId],
        min: 1,
        max: 1,
        timing: "Opponent's Turn",
        effectText,
      },
    },
  };
}
