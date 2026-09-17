import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function rustTyrannomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const rust = permanent("demo-rusttyrannomon-bt2", "BT2-051", 0, 11000);
  const tamer = permanent("demo-rusttyrannomon-bt2-tamer", effect === "no-green-tamer" ? "BT1-085" : "BT1-089", 0, 0);
  you.battleArea.push(rust, tamer);

  const defender = permanent(
    "demo-rusttyrannomon-bt2-defender",
    effect === "q1022" ? "BT2-050" : "BT1-010",
    1,
    effect === "q1022" ? 12000 : 2000,
  );
  opponent.battleArea.push(defender);
  if (effect === "battle-win") {
    rust.isSuspended = true;
    opponent.trash.push(defender.topCard);
    opponent.battleArea.length = 0;
    const other = permanent("demo-rusttyrannomon-bt2-other", "BT1-011", 1, 2000);
    other.isSuspended = true;
    opponent.battleArea.push(other);
  } else if (effect === "q1022") {
    you.trash.push(rust.topCard);
    you.battleArea.shift();
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    eligible: "With a green Tamer in play, RustTyrannomon may attack an opposing unsuspended Digimon.",
    "battle-win": "RustTyrannomon deleted the target in battle, survived, and suspended another opposing Digimon.",
    q1022: "Q1022: the attacked Digimon remained unsuspended during battle and defeated RustTyrannomon.",
    "no-green-tamer": "A red Tamer does not satisfy the condition, so RustTyrannomon cannot attack a ready Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-051",
        effectKey: effect === "battle-win" ? "BT2-051/after-battle" : "BT2-051/attack-ready",
        description: descriptions[effect] ?? "RustTyrannomon's effect state is displayed.",
        timing: "YourTurn",
      },
    ],
  };
}
