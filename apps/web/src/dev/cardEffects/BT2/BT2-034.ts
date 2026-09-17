import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function salamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) you.battleArea.push(permanent("demo-salamon-bt2", "BT2-034", 0, 2000));
  you.trash.push(card("demo-salamon-bt2-deleted", "BT2-034", 0));
  you.securityCount = effect === "recover" || effect === "q1009" ? 4 : 4;
  if (effect === "recover" || effect === "q1009") {
    you.security.push(card("demo-salamon-bt2-recovered", "BT1-013", 0));
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    recover: "Salamon was deleted at 3 security and recovered the top card of the deck, reaching 4 security.",
    "four-security": "Salamon was deleted at 4 security, so its conditional recovery did not activate.",
    q1009:
      "Q1009: two Salamon were deleted together at 3 security; the first recovered to 4, then the second condition failed.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-034",
        effectKey: "BT2-034/on-deletion-recovery",
        description: descriptions[effect] ?? "Salamon's conditional On Deletion recovery is displayed.",
        timing: "On Deletion",
      },
    ],
  };
}
