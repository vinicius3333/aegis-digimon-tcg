import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function rayOfVictoryBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const own = permanent("demo-ray-victory-own", "BT2-021", 0, 3000);
  own.isSuspended = effect === "no-blue-tamer" || effect === "non-blue-tamer";
  you.battleArea.push(own);
  if (effect !== "no-blue-tamer") {
    you.battleArea.push(permanent("demo-ray-victory-tamer", effect === "non-blue-tamer" ? "BT2-084" : "BT2-085", 0, 0));
  }
  if (effect === "level-six-remains") {
    opponent.battleArea.push(permanent("demo-ray-victory-level-six", "BT2-032", 1, 12000));
  } else {
    opponent.hand.push(card("demo-ray-victory-returned", "BT2-045", 1));
    if (effect === null || effect === "returned-and-unsuspended" || effect === "security-full-effect") {
      opponent.trash.push(card("demo-ray-victory-source", "BT2-001", 1));
    }
  }
  if (effect !== "security-full-effect") you.trash.push(card("demo-ray-victory-option", "BT2-096", 0));
  state.players.push(you, opponent);

  const selected = effect ?? "returned-and-unsuspended";
  const descriptions: Record<string, string> = {
    "returned-and-unsuspended":
      "The Ray of Victory returned the level 5 Digimon, trashed only its source, then the blue Tamer enabled an unsuspend.",
    "level-six-remains":
      "The level 6 Digimon was ineligible, but the blue-Tamer Then clause still unsuspended an own Digimon.",
    "no-blue-tamer": "The target returned to hand, but without a blue Tamer the own Digimon remained suspended.",
    "non-blue-tamer": "A red Tamer did not satisfy the blue-Tamer condition, so the own Digimon remained suspended.",
    "security-full-effect":
      "Security activated the full Main effect: return, source disposal, and blue-Tamer unsuspend.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-096",
        effectKey: `BT2-096/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-full-effect" ? "Security" : "Main",
      },
    ],
  };
}
