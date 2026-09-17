import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function clavisAngemonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const source = permanent("demo-bt3-042-clavis", "BT3-042", 0, 10000);
  const target = permanent("demo-bt3-042-target", "BT3-040", 1, effect === "resolved" ? 1000 : 7000);
  if (effect === "resolved")
    you.security.push(
      card("demo-bt3-042-security-1", "BT1-011", 0),
      card("demo-bt3-042-security-2", "BT1-012", 0),
      card("demo-bt3-042-security-3", "BT1-013", 0),
    );
  else
    you.security.push(
      card("demo-bt3-042-security-1", "BT1-011", 0),
      card("demo-bt3-042-security-2", "BT1-012", 0),
      card("demo-bt3-042-security-3", "BT1-013", 0),
      card("demo-bt3-042-security-4", "BT1-014", 0),
    );
  you.battleArea.push(source);
  opponent.battleArea.push(target);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-042",
        effectKey: `BT3-042/${effect ?? "resolved"}`,
        description:
          effect === "resolved"
            ? "ClavisAngemon gave one opposing Digimon -6000 DP for the turn at 3 security."
            : "ClavisAngemon's -6000 DP effect was inactive because you had more than 3 security cards.",
        timing: "WhenAttacking",
      },
    ],
  };
}
