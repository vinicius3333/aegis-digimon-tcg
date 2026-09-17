import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function wizardmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "retaliation-battle") {
    you.battleArea.push(permanent("demo-wizardmon-bt2-yellow", "BT2-034", 0, 4000));
    you.hand.push(card("demo-wizardmon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
    you.trash.push(card("demo-wizardmon-bt2-deleted", "BT2-071", 0));
    opponent.trash.push(card("demo-wizardmon-bt2-retaliated", "BT1-084", 1));
  } else {
    const wizardmon = permanent("demo-wizardmon-bt2", "BT2-071", 0, 4000);
    if (effect === null || effect === "active") wizardmon.keywords.push("Retaliation");
    you.battleArea.push(wizardmon);
    if (effect === null || effect === "active")
      you.battleArea.push(permanent("demo-wizardmon-bt2-yellow", "BT2-034", 0, 4000));
    if (effect === "opponent-yellow")
      opponent.battleArea.push(permanent("demo-wizardmon-bt2-opponent-yellow", "BT2-034", 1, 4000));
    if (effect === "removed-yellow") you.trash.push(card("demo-wizardmon-bt2-removed-yellow", "BT2-034", 0));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "active";
  const descriptions: Record<string, string> = {
    active: "Wizardmon has Retaliation while its controller has a yellow Digimon in play.",
    "opponent-yellow": "An opponent's yellow Digimon does not satisfy Wizardmon's Retaliation condition.",
    "removed-yellow": "Wizardmon lost Retaliation after its controller's yellow Digimon left play.",
    "retaliation-battle":
      "Wizardmon lost the battle, deleted the opposing Digimon with Retaliation, and drew 1 on deletion.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-071",
        effectKey: `BT2-071/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "retaliation-battle" ? "OnDeletion" : "AllTurns",
      },
    ],
  };
}
