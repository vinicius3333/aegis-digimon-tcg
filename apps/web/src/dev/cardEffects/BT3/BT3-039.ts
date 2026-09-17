import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function angewomonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-bt3-040-host", "BT3-040", 0, 7000);
  host.stack.push(card("demo-bt3-039-inherited", "BT3-039", 0));
  const target = permanent("demo-bt3-039-target", "BT2-020", 1, 6000);
  target.keywords.push("SecurityAttack");
  you.battleArea.push(host);
  opponent.battleArea.push(target);
  if (effect === "resolved") you.battleArea.push(permanent("demo-bt3-039-rookie", "BT3-032", 0, 4000));
  else
    you.security.push(
      card("demo-bt3-039-security", "BT1-001", 0),
      card("demo-bt3-039-security-2", "BT1-002", 0),
      card("demo-bt3-039-security-3", "BT1-003", 0),
      card("demo-bt3-039-security-4", "BT1-004", 0),
    );
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-039",
        effectKey: `BT3-039/${effect ?? "resolved"}`,
        description:
          effect === "declined"
            ? "Angewomon's inherited optional play was declined; the opponent's Security Attack -2 remains until the next opponent turn ends."
            : "Angewomon applied Security Attack -2 and played a yellow level 3 Digimon for free at 3 security.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
