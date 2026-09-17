import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function rinaShinomiyaBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const rina = permanent("demo-rina-bt2", "BT2-086", 0, 0);
  if (effect === "security-played") {
    you.battleArea.push(rina);
  } else if (effect === "reveal-vee" || effect === "filter-card-kind") {
    you.battleArea.push(rina);
    you.hand.push(card("demo-rina-bt2-added", "BT2-026", 0));
    you.deck.push(
      card("demo-rina-bt2-bottom-a", effect === "filter-card-kind" ? "BT2-002" : "BT2-022", 0),
      card("demo-rina-bt2-bottom-b", effect === "filter-card-kind" ? "BT12-101" : "BT2-023", 0),
    );
  } else {
    rina.isSuspended = effect === null || effect === "blue-attacker";
    you.battleArea.push(rina);
    const attackerId = effect === "non-blue-attacker" ? "BT1-010" : "BT2-021";
    const attacker = permanent(
      "demo-rina-bt2-attacker",
      attackerId,
      0,
      effect === null || effect === "blue-attacker" ? 5000 : 4000,
    );
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
  }
  state.players.push(you, opponent);

  const selected = effect ?? "blue-attacker";
  const descriptions: Record<string, string> = {
    "blue-attacker": "Rina suspended to give the attacking blue Digimon +1000 DP for the turn.",
    declined: "Rina's optional effect was declined, so she stayed unsuspended and gave no DP.",
    "non-blue-attacker": "The attacking Digimon was not blue, so Rina did not activate.",
    "reveal-vee": "Rina revealed 3 cards, added a Digimon with Vee in its name, and bottom-decked the other 2.",
    "filter-card-kind":
      "Only the Vee-named Digimon was eligible; the Vee-named Digi-Egg and Option went to deck bottom.",
    "security-played": "Rina's Security effect played her without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-086",
        effectKey: `BT2-086/${selected}`,
        description: descriptions[selected]!,
        timing:
          selected === "security-played"
            ? "Security"
            : selected.startsWith("reveal") || selected === "filter-card-kind"
              ? "OnPlay"
              : "YourTurn",
      },
    ],
  };
}
