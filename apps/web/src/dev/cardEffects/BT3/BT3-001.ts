import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function poromonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-poromon-host", "BT1-016", 0, 4000);
  host.stack.push(card("demo-poromon-source", "BT3-001", 0));
  host.isSuspended = true;
  you.battleArea.push(host);
  const first = permanent("demo-poromon-low-a", "BT1-011", 1, 1000);
  const second = permanent("demo-poromon-low-b", "BT1-011", 1, 1000);
  const tooLarge = permanent("demo-poromon-large", "BT1-010", 1, 2000);
  if (effect === "resolved") {
    opponent.battleArea.push(first, tooLarge);
    opponent.trash.push(card("demo-poromon-deleted", "BT1-011", 1));
  } else if (effect === "no-target") opponent.battleArea.push(tooLarge);
  else opponent.battleArea.push(first, second, tooLarge);
  state.players.push(you, opponent);
  if (effect === null || effect === "choose-target") {
    return {
      state,
      decision: {
        decisionId: "demo-poromon-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 opposing Digimon with 1000 DP or less",
        sourceCardId: "BT3-001",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId, tooLarge.permanentId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: "[When Attacking] Delete 1 of your opponent's Digimon with 1000 DP or less.",
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
        sourceCardId: "BT3-001",
        effectKey: `BT3-001/${effect}`,
        description:
          effect === "no-target"
            ? "Poromon found no opposing Digimon with 1000 DP or less, so nothing was deleted."
            : "Poromon's inherited When Attacking effect deleted exactly one selected opposing 1000 DP Digimon.",
        timing: "WhenAttacking",
      },
    ],
  };
}
