import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function ragnaLoardmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "declined" ? 0 : 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-ragnaloardmon", "BT3-019", 0, 14000);
  host.keywords.push("SecurityAttack", "Reboot");
  if (effect !== "declined") host.stack.push(card("demo-ragnaloardmon-material", "BT3-016", 0));
  you.battleArea.push(host);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-019",
        effectKey: `BT3-019/${effect ?? "resolved"}`,
        description:
          effect === "declined"
            ? "RagnaLoardmon's optional Legend-Arms placement was declined; no memory was gained."
            : "RagnaLoardmon placed Durandamon under itself, gained 3 memory, and has Security Attack +1 and Reboot.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
