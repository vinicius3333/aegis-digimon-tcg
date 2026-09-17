import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function exTyrannomonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "extyrannomon-opponent");
  const exTyrannomon = permanent(
    "demo-extyrannomon",
    "EX3-060",
    0,
    9000,
    effect === "no-sources" ? [] : [{ instanceId: "demo-darktyrannomon-source", cardId: "EX3-059" }],
  );
  exTyrannomon.keywords.push("Blocker");
  you.battleArea.push(exTyrannomon);

  if (effect === "no-sources") {
    state.turnSeat = 0;
    state.players.push(you, opponent);
    return { state };
  }

  state.turnSeat = 1;
  const attacker = permanent("demo-attacking-elecmon", "BT1-028", 1, 2000);
  attacker.isSuspended = true;
  opponent.battleArea.push(attacker);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "blockWindowOpened",
        attackerPermanentId: attacker.permanentId,
        eligibleBlockerIds: [exTyrannomon.permanentId],
      },
    ],
  };
}
