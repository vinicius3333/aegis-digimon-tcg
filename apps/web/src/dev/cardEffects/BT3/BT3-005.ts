import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function kakkinmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "level-seven" ? 1 : 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent(
    "demo-kakkinmon-host",
    effect === "level-seven" ? "BT1-084" : "BT3-111",
    0,
    effect === "level-seven" ? 15000 : 12000,
  );
  host.stack.push(card("demo-kakkinmon-source", "BT3-005", 0));
  host.isSuspended = true;
  you.battleArea.push(host);
  opponent.securityCount = 1;
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-005",
        effectKey: `BT3-005/${effect ?? "level-seven"}`,
        description:
          effect === "level-seven"
            ? "Kakkinmon saw its level 7 host attack and gained 1 memory."
            : "Kakkinmon saw a level 6 host attack, so its level 7 condition was false and no memory was gained.",
        timing: "WhenAttacking",
      },
    ],
  };
}
