import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function groundramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const endTurnDna =
    "[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.";
  const inherited = "[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "blocker" ? 1 : 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "groundramon-opponent");
  const groundramon = permanent("demo-groundramon", "EX3-041", 0, 7000, [
    { instanceId: "demo-groundramon-coredramon", cardId: "EX3-039" },
  ]);
  groundramon.keywords.push("Blocker");
  const slayerOne = permanent("demo-slayerdramon-one", "EX3-024", 0, 12000, [
    { instanceId: "demo-slayerdramon-one-source", cardId: "EX3-018" },
  ]);
  const slayerTwo = permanent("demo-slayerdramon-two", "EX3-024", 0, 12000, [
    { instanceId: "demo-slayerdramon-two-source-a", cardId: "EX3-018" },
    { instanceId: "demo-slayerdramon-two-source-b", cardId: "EX3-019" },
  ]);
  const breakdramon = permanent("demo-groundramon-breakdramon", "EX3-044", 0, 12000);

  if (effect === "resolved") {
    const examon = permanent("demo-groundramon-examon", "EX3-074", 0, 15000, [
      groundramon.topCard,
      ...groundramon.stack,
      slayerTwo.topCard,
      ...slayerTwo.stack,
    ]);
    you.battleArea.push(examon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-041",
          effectKey: "EX3-041/end-turn-dna",
          description: "Groundramon e Slayerdramon DNA digievoluíram em Examon.",
          timing: "EndOfYourTurn",
        },
      ],
    };
  }

  if (effect === "blocker") {
    const attacker = permanent("demo-groundramon-attacker", "BT1-028", 1, 2000);
    attacker.isSuspended = true;
    you.battleArea.push(groundramon);
    opponent.battleArea.push(attacker);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [groundramon.permanentId],
        },
      ],
    };
  }

  if (effect === "inherited" || effect === "inherited-negative") {
    const hasEligibleName = effect === "inherited";
    const host = permanent(
      "demo-groundramon-inherited-host",
      hasEligibleName ? "EX3-074" : "BT1-084",
      0,
      hasEligibleName ? 15000 : 10000,
      [{ instanceId: "demo-groundramon-inherited-source", cardId: "EX3-041" }],
    );
    if (hasEligibleName) host.grantedKeywords.push("Blocker");
    you.battleArea.push(host);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-041",
          effectKey: "EX3-041/inherited-blocker",
          description: hasEligibleName
            ? "Examon tem Examon no nome e recebeu Blocker de Groundramon."
            : "Omnimon não tem Dramon nem Examon no nome; Groundramon não concedeu Blocker.",
          timing: "AllTurns",
        },
      ],
    };
  }

  you.battleArea.push(groundramon, slayerOne, slayerTwo, breakdramon);
  you.hand.push(
    card("demo-examon-one", "EX3-074", 0),
    card("demo-examon-two", "EX3-074", 0),
    card("demo-imperialdramon", "EX3-063", 0),
    card("demo-breakdramon-hand", "EX3-044", 0),
  );
  you.handCount = you.hand.length;
  state.players.push(you, opponent);

  if (effect === "dna" && step === "partner") {
    return {
      state,
      decision: {
        decisionId: "demo-groundramon-dna-partner",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha outro Digimon com Dramon no nome para DNA digievoluir com Groundramon",
        sourceCardId: "EX3-041",
        options: {
          candidateInstanceIds: [slayerOne.permanentId, slayerTwo.permanentId],
          visibleInstanceIds: [slayerOne.permanentId, slayerTwo.permanentId, breakdramon.permanentId],
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurnDna,
        },
      },
    };
  }

  if (effect === "dna" && step === "result") {
    return {
      state,
      decision: {
        decisionId: "demo-groundramon-dna-result",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha um Examon compatível da sua mão",
        sourceCardId: "EX3-041",
        options: {
          candidateInstanceIds: ["demo-examon-one", "demo-examon-two"],
          visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurnDna,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-groundramon-dna-optional",
      seat: 0,
      kind: "optional",
      promptText: "DNA digievoluir Groundramon no fim do seu turno?",
      sourceCardId: "EX3-041",
      options: { timing: "EndOfYourTurn", effectText: effect === "inherited-text" ? inherited : endTurnDna },
    },
  };
}
