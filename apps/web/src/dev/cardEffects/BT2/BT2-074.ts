import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function devimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "effect-deletion") {
    you.trash.push(card("demo-devimon-bt2-deleted", "BT2-074", 0));
    opponent.battleArea.push(permanent("demo-devimon-bt2-survivor", "BT1-084", 1, 15000));
  } else {
    if (effect === "inherited-battle") {
      you.trash.push(card("demo-devimon-bt2-source", "BT2-074", 0), card("demo-devimon-bt2-host", "BT2-075", 0));
    } else {
      you.trash.push(card("demo-devimon-bt2-source", "BT2-074", 0));
    }
    opponent.trash.push(card("demo-devimon-bt2-retaliated", "BT1-084", 1));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "printed-battle";
  const descriptions: Record<string, string> = {
    "printed-battle": "Devimon lost the battle and deleted the opposing Digimon with printed Retaliation.",
    "inherited-battle": "Devimon's inherited Retaliation deleted the Digimon that defeated its host in battle.",
    "effect-deletion": "Devimon was deleted by an effect, so Retaliation did not delete the opposing Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-074",
        effectKey: `BT2-074/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "effect-deletion" ? "OnDeletion" : "AfterBattle",
      },
    ],
  };
}
