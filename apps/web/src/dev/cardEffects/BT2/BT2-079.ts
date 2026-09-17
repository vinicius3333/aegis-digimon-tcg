import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function venomMyotismonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-suspended" || effect === "two-suspended" || effect === "own-suspended" ? 1 : 0;
  state.memory = effect === "opponent-suspended" ? -1 : effect === "two-suspended" ? -2 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const venomMyotismon = permanent("demo-venommyotismon-bt2", "BT2-079", 0, 12000);
  venomMyotismon.keywords.push("SecurityAttack+1");
  venomMyotismon.isSuspended = effect === null || effect === "double-check";
  you.battleArea.push(venomMyotismon);
  if (effect === null || effect === "double-check") {
    opponent.securityCount = 1;
  } else if (effect === "own-suspended") {
    const own = permanent("demo-venommyotismon-bt2-own", "BT2-068", 0, 1000);
    own.isSuspended = true;
    you.battleArea.push(own);
  } else {
    const first = permanent("demo-venommyotismon-bt2-first", "BT1-010", 1, 2000);
    first.isSuspended = true;
    opponent.battleArea.push(first);
    if (effect === "two-suspended") {
      const second = permanent("demo-venommyotismon-bt2-second", "BT1-011", 1, 3000);
      second.isSuspended = true;
      opponent.battleArea.push(second);
    }
  }
  state.players.push(you, opponent);

  const selected = effect ?? "double-check";
  const descriptions: Record<string, string> = {
    "double-check": "Security Attack +1 made VenomMyotismon check 2 security cards in one attack.",
    "opponent-suspended": "An opposing Digimon became suspended on its turn, so VenomMyotismon gained 1 memory.",
    "two-suspended":
      "Two opposing Digimon became suspended in separate events, so VenomMyotismon gained 2 memory total.",
    "own-suspended": "Suspending VenomMyotismon's controller's Digimon did not gain memory.",
    "controller-turn":
      "An opposing Digimon became suspended during VenomMyotismon's controller's turn, so no memory was gained.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-079",
        effectKey: `BT2-079/${selected}`,
        description: descriptions[selected]!,
        timing:
          selected === "double-check" ? "WhenAttacking" : selected === "controller-turn" ? "YourTurn" : "OpponentsTurn",
      },
    ],
  };
}
