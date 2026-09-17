import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function argomonMegaBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "digisorption" ? 3 : effect === "declined" ? 0 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const argomon = permanent("demo-argomon-mega-bt2", "BT2-050", 0, 11000);
  you.battleArea.push(argomon);

  if (effect === "digisorption" || effect === "declined") {
    const payer = permanent("demo-argomon-mega-bt2-payer", "BT2-043", 0, 1000);
    payer.isSuspended = effect === "digisorption";
    you.battleArea.push(payer);
  } else {
    const first = permanent("demo-argomon-mega-bt2-first", "BT1-010", 0, 2000);
    const second = permanent("demo-argomon-mega-bt2-second", "BT1-011", 0, 2000);
    const tamer = permanent("demo-argomon-mega-bt2-tamer", "BT1-085", 0, 0);
    first.isSuspended = true;
    second.isSuspended = true;
    tamer.isSuspended = true;
    you.battleArea.push(first, second, tamer);
    if (effect === "security-attack") {
      argomon.isSuspended = true;
      opponent.securityCount = 2;
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    digisorption: "Digisorption -3 suspended another Digimon and reduced Argomon's 5-memory evolution cost to 2.",
    declined: "Digisorption was declined, so the other Digimon stayed ready and Argomon paid its full evolution cost.",
    "security-attack":
      "Two other suspended Digimon granted Security Attack +2, so Argomon checked 3 security cards total; the suspended Tamer did not count.",
    "opponent-turn": "Argomon gained no additional security checks during the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-050",
        effectKey:
          effect === "digisorption" || effect === "declined" ? "BT2-050/digisorption" : "BT2-050/security-attack",
        description: descriptions[effect] ?? "Argomon's effect state is displayed.",
        timing: effect === "digisorption" || effect === "declined" ? "WhenDigivolving" : "YourTurn",
      },
    ],
  };
}
