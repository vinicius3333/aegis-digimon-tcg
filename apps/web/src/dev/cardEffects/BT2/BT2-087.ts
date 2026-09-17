import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function kariKamiyaBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "four-security" || effect === "security-played" ? 0 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-kari-bt2", "BT2-087", 0, 0));
  you.securityCount = effect === "four-security" ? 4 : effect === "zero-security" ? 0 : 3;
  state.players.push(you, opponent);

  const selected = effect ?? "three-security";
  const descriptions: Record<string, string> = {
    "three-security": "Kari saw exactly 3 security cards at the start of the turn and gained 1 memory.",
    "zero-security": "Kari saw 0 security cards at the start of the turn and gained 1 memory.",
    "four-security": "Kari saw 4 security cards, so the 3-or-fewer condition failed and no memory was gained.",
    "security-played": "Kari's Security effect played her without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-087",
        effectKey: `BT2-087/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-played" ? "Security" : "StartOfYourTurn",
      },
    ],
  };
}
