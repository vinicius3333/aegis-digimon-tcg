import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function jazarichmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "jazarichmon-opponent");
  const effectText =
    "[On Play] De-Digivolve 1 1 of your opponent's Digimon. Then, you may play 1 [Hina Kurihara] from your hand without paying the cost.";

  if (effect === "inherited") {
    const host = permanent("demo-jazarichmon-host", "EX3-053", 0, 12000, [
      { instanceId: "demo-jazarichmon-source", cardId: "EX3-052" },
    ]);
    host.grantedKeywords.push("SecurityAttack");
    you.battleArea.push(host);
    opponent.securityCount = 3;
    state.players.push(you, opponent);
    return { state };
  }

  you.battleArea.push(permanent("demo-jazarichmon", "EX3-052", 0, 7000));
  const hina = card("demo-jazarichmon-hina", "EX3-065", 0);
  const firstTarget = permanent("demo-jazarichmon-first", "EX3-053", 1, 12000, [
    { instanceId: "demo-jazarichmon-first-source", cardId: "EX3-049" },
  ]);
  const secondTarget = permanent("demo-jazarichmon-second", "EX3-053", 1, 12000, [
    { instanceId: "demo-jazarichmon-second-bottom", cardId: "EX3-048" },
    { instanceId: "demo-jazarichmon-second-source", cardId: "EX3-049" },
  ]);
  const levelThree = permanent("demo-jazarichmon-level-three", "EX3-046", 1, 2000);

  if (step === "hina" || step === "resolved") {
    firstTarget.topCard = card("demo-jazarichmon-promoted", "EX3-049", 1);
    firstTarget.currentDP = 4000;
    firstTarget.baseDP = 4000;
    firstTarget.stack.length = 0;
    opponent.battleArea.push(firstTarget, secondTarget, levelThree);
    if (step === "resolved") you.battleArea.push(permanent("demo-jazarichmon-hina-played", "EX3-065", 0, 0));
    else you.hand.push(hina);
    state.players.push(you, opponent);
    return {
      state,
      ...(step === "hina"
        ? {
            decision: {
              decisionId: "demo-jazarichmon-hina-optional",
              seat: 0 as const,
              kind: "optional" as const,
              promptText: "Jogar Hina Kurihara da sua mão sem pagar o custo?",
              sourceCardId: "EX3-052",
              options: { timing: "OnPlay", effectText },
            },
          }
        : {
            events: [
              {
                kind: "cardsMoved" as const,
                instanceIds: [hina.instanceId],
                from: "hand",
                to: "battleArea",
              },
            ],
          }),
    };
  }

  you.hand.push(hina);
  opponent.battleArea.push(firstTarget, secondTarget, levelThree);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-jazarichmon-de-digivolve",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon do oponente para receber De-Digivolve 1",
      sourceCardId: "EX3-052",
      options: {
        candidateInstanceIds: [firstTarget.permanentId, secondTarget.permanentId],
        visibleInstanceIds: [firstTarget.permanentId, secondTarget.permanentId, levelThree.permanentId],
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText,
      },
    },
  };
}
