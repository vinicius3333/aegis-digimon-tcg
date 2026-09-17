import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function nyaromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "owner-turn" ? 0 : 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hostCount = effect === "stacked" ? 2 : 1;
  for (let index = 0; index < hostCount; index += 1) {
    const host = permanent(`demo-nyaromon-host-${index}`, "BT2-034", 0, 3000, [
      { instanceId: `demo-nyaromon-source-${index}`, cardId: "BT2-003" },
    ]);
    host.isSuspended = effect !== "active-host";
    you.battleArea.push(host);
  }
  you.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "On the opponent's turn, suspended Nyaromon's host gave all of its owner's Security Digimon +1000 DP.",
    "active-host": "Nyaromon's host was active, so its conditional Security DP aura stayed inactive.",
    "owner-turn": "Nyaromon's Security DP aura stayed inactive during its owner's turn, even with a suspended host.",
    stacked: "Two suspended hosts with Nyaromon each contributed +1000 DP, for +2000 DP to their Security Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-003",
        effectKey: "BT2-003/opponent-turn-security-dp",
        description: descriptions[effect] ?? "BT2-003 Nyaromon resolved.",
        timing: "Opponent's Turn",
      },
    ],
  };
}
