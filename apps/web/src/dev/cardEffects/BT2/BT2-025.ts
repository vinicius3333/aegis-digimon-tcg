import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function ikkakumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-ikkakumon-bt2-host", "BT2-029", 0, 7000, [
    { instanceId: "demo-ikkakumon-bt2-source", cardId: "BT2-025" },
  ]);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "trashed-top-source") {
    opponent.battleArea.push(
      permanent("demo-ikkakumon-bt2-target", "BT2-034", 1, 6000, [
        { instanceId: "demo-ikkakumon-bt2-bottom-source", cardId: "BT1-010" },
      ]),
      permanent("demo-ikkakumon-bt2-source-less", "BT1-012", 1, 3000),
    );
    opponent.trash.push(card("demo-ikkakumon-bt2-top-source", "BT1-011", 1));
  } else if (effect === "no-target") {
    opponent.battleArea.push(permanent("demo-ikkakumon-bt2-source-less", "BT1-012", 1, 3000));
  }
  opponent.securityCount = effect === null ? 5 : 4;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "trashed-top-source":
      "Ikkakumon trashed only the top digivolution card from the selected opposing Digimon; its bottom source remained.",
    "no-target":
      "No opposing Digimon had digivolution cards, so Ikkakumon's inherited effect resolved and the attack continued.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-025",
        effectKey: "BT2-025/trash-top-source",
        description: descriptions[effect] ?? "BT2-025 Ikkakumon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}
