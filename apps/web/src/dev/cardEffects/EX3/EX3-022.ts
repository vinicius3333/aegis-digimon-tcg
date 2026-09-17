import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function megaSeadramonDemo(effect: string | null): CardEffectsFixture {
  const main =
    "[When Attacking] You may play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.";
  const inherited =
    "[When Attacking][Once Per Turn] You may play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.";
  const mode = effect ?? "attack";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "reset" ? 9 : 8;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "megaseadramon-opponent");
  const mega = permanent("demo-megaseadramon", "EX3-022", 0, 7000);
  mega.isSuspended = true;
  const blueHost = permanent("demo-megaseadramon-blue-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-mega-first-blue-three", cardId: "BT1-029" },
    { instanceId: "demo-mega-invalid-blue-four", cardId: "EX3-019" },
    { instanceId: "demo-mega-second-blue-three", cardId: "BT1-030" },
    { instanceId: "demo-mega-invalid-red-three", cardId: "BT1-009" },
  ]);
  const redHost = permanent("demo-megaseadramon-red-host", "BT1-010", 0, 3000, [
    { instanceId: "demo-mega-blue-under-red", cardId: "BT1-031" },
  ]);
  const inheritedHost = permanent("demo-megaseadramon-inherited-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-mega-inherited-source", cardId: "EX3-022" },
  ]);
  if (["inherited", "inherited-opt", "reset", "two-copies", "hand-negative", "other-attacker"].includes(mode)) {
    inheritedHost.isSuspended = true;
    if (mode === "two-copies") inheritedHost.stack.push(card("demo-mega-second-inherited-source", "EX3-022", 0));
    you.battleArea.push(inheritedHost, blueHost, redHost);
  } else you.battleArea.push(mega, blueHost, redHost);
  state.players.push(you, opponent);

  if (mode === "attack" || mode === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-megaseadramon-optional",
        seat: 0,
        kind: "optional",
        promptText:
          "MegaSeadramon atacou. Jogar gratuitamente 1 Digimon azul de nível 3 das fontes de um Digimon azul?",
        sourceCardId: "EX3-022",
        options: { timing: "WhenAttacking", effectText: main },
      },
    };
  }
  if (mode === "source-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-megaseadramon-source-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Digimon azul de nível 3 das fontes de um dos seus Digimon azuis para jogar sem custo.",
        sourceCardId: "EX3-022",
        options: {
          candidateInstanceIds: ["demo-mega-first-blue-three", "demo-mega-second-blue-three"],
          visibleInstanceIds: [...blueHost.stack, ...redHost.stack].map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: main,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    const played = blueHost.stack.find(({ instanceId }) => instanceId === "demo-mega-first-blue-three")!;
    blueHost.stack.splice(blueHost.stack.indexOf(played), 1);
    you.battleArea.push(permanent("demo-mega-played", played.cardId, 0, 2000));
    description = "MegaSeadramon atacou e jogou Gabumon das fontes como um novo Digimon, sem pagar custo.";
  } else if (mode === "declined")
    description = "MegaSeadramon atacou, mas a ação opcional foi recusada; todas as fontes permaneceram no lugar.";
  else if (mode === "main-second-attack")
    description =
      "MegaSeadramon realizou um segundo ataque no mesmo turno e seu efeito principal, que não é Once Per Turn, ofereceu outro play.";
  else if (mode === "inherited")
    description = "No primeiro ataque, o efeito herdado de MegaSeadramon jogou 1 Digimon azul de nível 3 das fontes.";
  else if (mode === "inherited-opt")
    description =
      "No segundo ataque do turno, o efeito herdado de MegaSeadramon já estava usado e não abriu outra escolha.";
  else if (mode === "reset")
    description = "No turno seguinte, o Once Per Turn herdado de MegaSeadramon foi renovado e pôde ativar novamente.";
  else if (mode === "two-copies")
    description =
      "Duas cópias herdadas de MegaSeadramon ativaram no primeiro ataque e jogaram duas fontes; ambas ficaram usadas até o fim do turno.";
  else if (mode === "hand-negative")
    description = "Um Digimon jogado da mão não altera nem aciona o efeito de ataque herdado de MegaSeadramon.";
  else
    description =
      "Outro Digimon atacou; o efeito herdado só pertence ao Digimon cuja pilha contém MegaSeadramon e não ativou.";
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-022",
        effectKey: `EX3-022/${mode}`,
        description: `${description} ${mode.startsWith("inherited") || ["reset", "two-copies", "hand-negative", "other-attacker"].includes(mode) ? inherited : main}`,
        timing: "WhenAttacking",
      },
    ],
  };
}
