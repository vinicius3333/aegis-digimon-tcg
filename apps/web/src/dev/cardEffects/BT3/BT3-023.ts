import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function angemonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-bt3-026-host", "BT3-026", 0, 6000);
  host.stack.push(card("demo-bt3-023-inherited", "BT3-023", 0));
  const target = permanent("demo-bt3-023-target", "BT1-019", 1, 4000);
  if (effect !== "empty") target.stack.push(card("demo-bt3-023-bottom", "BT1-010", 1));
  you.battleArea.push(host);
  opponent.battleArea.push(target);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-023",
        effectKey: `BT3-023/${effect ?? "resolved"}`,
        description:
          effect === "empty"
            ? "Angemon's inherited effect found no opposing digivolution card to trash."
            : "Angemon's inherited effect trashed the bottom digivolution card of the opposing Digimon.",
        timing: "WhenAttacking",
      },
    ],
  };
}
