import { AppFusionRoute, GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function appFusionDemo(): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "app-fusion-demo";
  state.phase = Phase.Main;
  state.turnCount = 1;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "App Fusion tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-dokamon-host", "BT23-016", 0, 3000);
  const material = card("demo-perorimon-link", "BT23-039", 0);
  host.linked.push(material);
  you.battleArea.push(host);
  const result = card("demo-dosukomon-result", "BT23-021", 0);
  const route = new AppFusionRoute();
  route.hostPermanentId = host.permanentId;
  route.linkedInstanceId = material.instanceId;
  route.projectedCost = 0;
  result.appFusionRoutes.push(route);
  you.hand.push(result);
  you.handCount = you.hand.length;
  opponent.battleArea.push(permanent("demo-training-target", "BT1-009", 1, 3000));
  state.players.push(you, opponent);
  return { state, sessionId: you.sessionId };
}
