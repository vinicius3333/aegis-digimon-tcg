import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gallantmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "watchers" ? -1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-gallantmon-bt2", "BT2-020", 0, 11000));
  if (effect === "digivolve-delete" || effect === "no-red-tamer" || effect === "dp-too-high") {
    you.battleArea.push(
      permanent("demo-gallantmon-bt2-tamer", effect === "no-red-tamer" ? "BT1-086" : "BT1-085", 0, 0),
    );
    if (effect === "digivolve-delete") {
      opponent.trash.push(card("demo-gallantmon-bt2-deleted", "BT2-047", 1));
    } else {
      opponent.battleArea.push(
        permanent("demo-gallantmon-bt2-target", "BT2-047", 1, effect === "dp-too-high" ? 6001 : 6000),
      );
    }
  } else if (effect === "trash-twenty") {
    opponent.securityCount = 1;
    for (let index = 0; index < 22; index += 1) {
      opponent.trash.push(card(`demo-gallantmon-bt2-trash-${index}`, "BT1-010", 1));
    }
  } else if (effect === "q999-no-security-skill") {
    opponent.securityCount = 0;
    opponent.deckCount = 1;
    opponent.trash.push(card("demo-gallantmon-bt2-holy-wave", "BT1-107", 1));
    for (let index = 0; index < 10; index += 1) {
      opponent.trash.push(card(`demo-gallantmon-bt2-q999-trash-${index}`, "BT1-010", 1));
    }
  } else if (effect === "q1000-lethal") {
    const attacker = you.battleArea[0];
    if (attacker) attacker.isSuspended = true;
    opponent.securityCount = 0;
    state.gameOver = true;
    state.winnerSeat = 0;
  } else if (effect === "watchers") {
    const kari = permanent("demo-gallantmon-bt2-kari", "BT4-097", 1, 0);
    kari.isSuspended = true;
    opponent.battleArea.push(permanent("demo-gallantmon-bt2-dandevimon", "BT4-088", 1, 12000), kari);
    opponent.securityCount = 1;
    you.securityCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "digivolve-delete": "With an allied red Tamer, Gallantmon deleted an opposing Digimon at the 6000 DP boundary.",
    "no-red-tamer":
      "The allied Tamer was blue, so Gallantmon's conditional When Digivolving deletion did not activate.",
    "dp-too-high": "The opposing Digimon had 6001 DP, so it was outside Gallantmon's deletion range.",
    "trash-twenty": "With 20 cards in the opponent's trash, Gallantmon directly trashed 2 of their security cards.",
    "q999-no-security-skill":
      "Gallantmon directly trashed Holy Wave from security without activating its Security effect (Q999).",
    "q1000-lethal":
      "Gallantmon trashed the opponent's last security, then its unblocked player attack continued and won the game (Q1000).",
    watchers:
      "Gallantmon's direct security trash triggered DanDevimon and Kari security-removal watchers; Kari suspended for 1 memory (Q1239/Q1251).",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-020",
        effectKey:
          effect.startsWith("digivolve") || effect === "no-red-tamer" || effect === "dp-too-high"
            ? "BT2-020/red-tamer-delete"
            : "BT2-020/trash-security",
        description: descriptions[effect] ?? "BT2-020 Gallantmon resolved.",
        timing:
          effect.startsWith("digivolve") || effect === "no-red-tamer" || effect === "dp-too-high"
            ? "When Digivolving"
            : "When Attacking",
      },
    ],
  };
}
