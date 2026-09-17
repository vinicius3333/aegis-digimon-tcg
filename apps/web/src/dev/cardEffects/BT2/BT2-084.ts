import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function soraTakenouchiBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const sora = permanent("demo-sora-bt2", "BT2-084", 0, 0);
  if (effect === "security-played") {
    you.battleArea.push(sora);
  } else {
    sora.isSuspended = effect === null || effect === "player-attack" || effect === "blocked-after-declaration";
    you.battleArea.push(sora);
    const attackerId = effect === "non-red-attacker" ? "BT2-020" : "BT1-010";
    const attacker = permanent(
      "demo-sora-bt2-attacker",
      attackerId,
      0,
      effect === null || effect === "player-attack" || effect === "blocked-after-declaration" ? 6000 : 4000,
    );
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
    if (effect === "digimon-target" || effect === "blocked-after-declaration") {
      const target = permanent("demo-sora-bt2-target", "BT1-011", 1, 3000);
      target.isSuspended = true;
      opponent.battleArea.push(target);
    }
  }
  state.players.push(you, opponent);

  const selected = effect ?? "player-attack";
  const descriptions: Record<string, string> = {
    "player-attack": "Sora suspended to give the attacking red Digimon +2000 DP for the turn.",
    "blocked-after-declaration":
      "The attack was declared against the player, so the +2000 DP remained after Blocker changed the target.",
    "digimon-target": "The red Digimon attacked another Digimon, so Sora did not activate.",
    "non-red-attacker": "The attacking Digimon was not red, so Sora did not activate.",
    declined: "Sora's optional effect was declined, so she stayed unsuspended and gave no DP.",
    "security-played": "Sora's Security effect played her without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-084",
        effectKey: `BT2-084/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-played" ? "Security" : "YourTurn",
      },
    ],
  };
}
