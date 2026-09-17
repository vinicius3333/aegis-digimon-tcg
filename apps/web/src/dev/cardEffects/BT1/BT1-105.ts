import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function blastFireDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] Change the original DP of 1 of your opponent's Digimon to 3000 until the end of your opponent's next turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "expired" ? 7 : 5;
  state.turnSeat = effect === "expired" ? 0 : effect === null ? 0 : 1;
  state.memory = effect === null ? 4 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-blast-color", "BT1-047", 0, 6000));
  if (effect !== "q973-deleted" && effect !== "security-trashed") {
    const target =
      effect === "q976-digivolved"
        ? permanent("demo-blast-target", "ST1-11", 1, 3000, [{ instanceId: "demo-blast-old-top", cardId: "ST1-09" }])
        : permanent(
            "demo-blast-target",
            "ST3-07",
            1,
            effect === "q974-plus"
              ? 6000
              : effect === "q975-existing"
                ? 4000
                : effect === "expired"
                  ? 6000
                  : effect === null
                    ? 6000
                    : 3000,
          );
    if (effect !== null && effect !== "expired") target.baseDP = 3000;
    opponent.battleArea.push(target);
  }
  if (effect === null) {
    you.hand.push(card("demo-blast-option", "BT1-105", 0));
    you.handCount = 1;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-blast-security", "BT1-105", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-blast-option", "BT1-105", 0));
    if (effect === "q973-deleted") opponent.trash.push(card("demo-blast-deleted", "ST3-07", 1));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    changed: "Blast Fire changed only the selected Digimon's original DP to 3000 (Q972).",
    "q973-deleted":
      "After Blast Fire changed the original DP to 3000, a later -4000 DP effect deleted the Digimon at 0 DP (Q973).",
    "q974-plus": "A later +3000 DP modifier was added to the changed 3000 original DP for 6000 total DP (Q974).",
    "q975-existing":
      "An existing +1000 DP modifier remained and was added to the changed 3000 original DP for 4000 total DP (Q975).",
    "q976-digivolved": "After digivolving, the same permanent was still treated as having 3000 original DP (Q976).",
    expired:
      "Blast Fire's original-DP override expired after the opponent's next turn and the printed DP applied again.",
    "security-trashed": "Blast Fire has no Security effect and was simply trashed after the security check.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-105",
        effectKey: effect === "security-trashed" ? "BT1-105/no-security-effect" : "BT1-105/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
