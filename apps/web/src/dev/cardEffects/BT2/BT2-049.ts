import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function puppetmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "next-unsuspend" ? Phase.Active : Phase.Main;
  state.turnCount = 6;
  state.turnSeat = effect === "next-unsuspend" ? 1 : 0;
  state.memory = effect === "attack-memory" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const puppetmon = permanent("demo-puppetmon-bt2", "BT2-049", 0, 10000);
  you.battleArea.push(puppetmon);

  if (effect === "on-play" || effect === "next-unsuspend") {
    const chosen = permanent("demo-puppetmon-bt2-chosen", "BT1-070", 1, 4000);
    const other = permanent("demo-puppetmon-bt2-other", "BT2-044", 1, 6000);
    const ready = permanent("demo-puppetmon-bt2-ready", "BT2-043", 1, 1000);
    const tamer = permanent("demo-puppetmon-bt2-tamer", "BT1-085", 1, 0);
    chosen.isSuspended = true;
    other.isSuspended = true;
    tamer.isSuspended = effect === "on-play";
    opponent.battleArea.push(chosen, other, ready, tamer);
  } else if (effect === "attack-memory") {
    puppetmon.isSuspended = true;
    opponent.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play": "Puppetmon suspended one opposing Digimon and restricted every opposing Digimon from unsuspending.",
    "next-unsuspend":
      "Q1019-Q1021: both suspended Digimon stayed suspended; the ready Digimon stayed ready and the Tamer unsuspended normally.",
    "attack-memory": "Puppetmon gained 1 memory when attacking.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-049",
        effectKey: effect === "attack-memory" ? "BT2-049/when-attacking" : "BT2-049/on-play",
        description: descriptions[effect] ?? "Puppetmon's effect state is displayed.",
        timing: effect === "attack-memory" ? "WhenAttacking" : "OnPlay",
      },
    ],
  };
}
