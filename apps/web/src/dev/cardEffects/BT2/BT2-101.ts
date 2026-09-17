import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function cherryBlastBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const own = permanent("demo-cherry-blast-own", "BT2-046", 0, 6000);
  const below = permanent("demo-cherry-blast-below", "BT2-045", 1, 5000);
  const boundary = permanent("demo-cherry-blast-boundary", "BT2-046", 1, 6000);
  const above = permanent("demo-cherry-blast-above", "BT1-021", 1, 7000);
  below.isSuspended = true;
  boundary.isSuspended = true;
  you.battleArea.push(own);
  opponent.battleArea.push(below, boundary, above);
  if (effect !== "security-main") you.trash.push(card("demo-cherry-blast-option", "BT2-101", 0));
  state.players.push(you, opponent);

  const selected = effect ?? "main-boundaries";
  const descriptions: Record<string, string> = {
    "main-boundaries":
      "Cherry Blast suspended every opposing Digimon at 6000 DP or less, while the 7000 DP opponent and own 6000 DP Digimon stayed unsuspended.",
    "security-main": "Security activated Main with the same all-target 6000 DP boundary.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-101",
        effectKey: `BT2-101/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-main" ? "Security" : "Main",
      },
    ],
  };
}
