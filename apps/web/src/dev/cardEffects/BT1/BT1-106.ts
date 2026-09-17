import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function polyphonyDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] 1 of your opponent's Digimon gets -7000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 5 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-polyphony-color", "BT1-047", 0, 6000));
  if (effect !== "deleted" && effect !== "security-trashed") {
    opponent.battleArea.push(permanent("demo-polyphony-target", "BT10-028", 1, effect === "reduced" ? 5000 : 12000));
  }
  if (effect === null) {
    you.hand.push(card("demo-polyphony-option", "BT1-106", 0));
    you.handCount = 1;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-polyphony-security", "BT1-106", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-polyphony-option", "BT1-106", 0));
    if (effect === "deleted") opponent.trash.push(card("demo-polyphony-deleted", "BT1-016", 1));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    reduced: "Symphony No.1 <Polyphony> gave exactly 1 opposing 12000 DP Digimon -7000 DP for 5000 DP.",
    deleted: "The -7000 DP modifier reduced a 7000 DP Digimon to 0 DP and deleted it.",
    expired: "The -7000 DP modifier expired at the end of the turn and the Digimon returned to its printed 12000 DP.",
    "security-trashed": "Symphony No.1 <Polyphony> has no Security effect and was simply trashed after the check.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-106",
        effectKey: effect === "security-trashed" ? "BT1-106/no-security-effect" : "BT1-106/dp-minus",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
