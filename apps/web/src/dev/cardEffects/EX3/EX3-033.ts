import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function aeroVeedramonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";
  const ownBlocker =
    "[Opponent's Turn] While you have a Digimon with [Four Great Dragons] in its traits in play, or [Trial of the Four Great Dragons] is in your battle area, this Digimon gains ＜Blocker＞.";
  const inherited = "[Opponent's Turn] All of your Digimon with [Four Great Dragons] in their traits gain ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = ["self-dragon", "self-trial", "blocker", "inherited", "inherited-blocker"].includes(effect ?? "")
    ? 1
    : 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "aeroveedramon-opponent");
  const firstTrial = card("demo-aeroveedramon-trial-one", "EX3-069", 0);
  const secondTrial = card("demo-aeroveedramon-trial-two", "EX3-069", 0);
  const filler = card("demo-aeroveedramon-filler", "BT1-010", 0);
  const aero = permanent("demo-aeroveedramon", "EX3-033", 0, 7000, [
    { instanceId: "demo-aeroveedramon-base", cardId: "EX3-031" },
  ]);

  if (["self-dragon", "self-trial", "self-negative", "blocker"].includes(effect ?? "")) {
    if (effect === "self-dragon") you.battleArea.push(permanent("demo-aero-goldramon", "EX3-035", 0, 11000));
    if (effect === "self-trial") you.battleArea.push(permanent("demo-aero-trial", "EX3-069", 0, 0));
    if (effect !== "self-negative") aero.grantedKeywords.push("Blocker");
    you.battleArea.unshift(aero);
    if (effect === "blocker") {
      const attacker = permanent("demo-aero-attacker", "BT1-028", 1, 2000);
      attacker.isSuspended = true;
      opponent.battleArea.push(attacker);
    }
    state.players.push(you, opponent);
    if (effect === "blocker") {
      return {
        state,
        events: [
          {
            kind: "blockWindowOpened",
            attackerPermanentId: "demo-aero-attacker",
            eligibleBlockerIds: [aero.permanentId],
          },
        ],
      };
    }
    const enabledBy = effect === "self-dragon" ? "Goldramon, um Four Great Dragons" : "Trial of the Four Great Dragons";
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-033",
          effectKey: `EX3-033/${effect}`,
          description:
            effect === "self-negative"
              ? `No próprio turno e sem Four Great Dragons ou Trial, AeroVeedramon não recebeu Blocker. ${ownBlocker}`
              : `${enabledBy} está em jogo no turno do oponente; AeroVeedramon recebeu Blocker. ${ownBlocker}`,
          timing: "OpponentsTurn",
        },
      ],
    };
  }

  if (["inherited", "inherited-negative", "inherited-blocker"].includes(effect ?? "")) {
    const host = permanent("demo-aero-inherited-host", "BT1-053", 0, 6000, [
      { instanceId: "demo-aero-inherited-source", cardId: "EX3-033" },
    ]);
    const goldramon = permanent("demo-aero-inherited-goldramon", "EX3-035", 0, 11000);
    const magnadramon = permanent("demo-aero-inherited-magnadramon", "EX3-036", 0, 12000);
    const unrelated = permanent("demo-aero-inherited-unrelated", "BT1-010", 0, 3000);
    if (effect === "inherited" || effect === "inherited-blocker") {
      goldramon.grantedKeywords.push("Blocker");
      magnadramon.grantedKeywords.push("Blocker");
    }
    if (effect === "inherited-blocker") {
      const attacker = permanent("demo-aero-inherited-attacker", "EX3-035", 1, 11000);
      attacker.isSuspended = true;
      you.battleArea.push(host, magnadramon, unrelated);
      opponent.battleArea.push(attacker);
      state.players.push(you, opponent);
      return {
        state,
        events: [
          {
            kind: "effectTriggered",
            seat: 0,
            sourceCardId: "EX3-033",
            effectKey: "EX3-033/inherited-blocker",
            description: `O efeito herdado de AeroVeedramon deu Blocker somente a Magnadramon, o Four Great Dragons aliado. ${inherited}`,
            timing: "OpponentsTurn",
          },
          {
            kind: "blockWindowOpened",
            attackerPermanentId: attacker.permanentId,
            eligibleBlockerIds: [magnadramon.permanentId],
          },
        ],
      };
    }
    you.battleArea.push(host, goldramon, magnadramon, unrelated);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-033",
          effectKey: `EX3-033/${effect}`,
          description:
            effect === "inherited"
              ? `No turno do oponente, o efeito herdado de AeroVeedramon deu Blocker a Goldramon e Magnadramon; o host e Agumon não são Four Great Dragons. ${inherited}`
              : `No próprio turno, o efeito herdado de AeroVeedramon não deu Blocker aos Four Great Dragons. ${inherited}`,
          timing: "OpponentsTurn",
        },
      ],
    };
  }

  you.battleArea.push(aero);
  if (effect === "accepted") {
    const placed = permanent("demo-aero-accepted-trial", "EX3-069", 0, 0);
    placed.topCard.instanceId = firstTrial.instanceId;
    you.battleArea.push(placed);
    you.hand.push(secondTrial, filler);
  } else if (effect === "existing-trial") {
    you.battleArea.push(permanent("demo-aero-existing-trial", "EX3-069", 0, 0));
    you.hand.push(firstTrial);
  } else if (effect !== "no-trial-hand") {
    you.hand.push(firstTrial, secondTrial, filler);
  } else {
    you.hand.push(filler);
  }
  you.handCount = you.hand.length;
  state.players.push(you, opponent);

  if (["accepted", "declined", "existing-trial", "no-trial-hand"].includes(effect ?? "")) {
    const descriptions: Record<string, string> = {
      accepted:
        "AeroVeedramon colocou 1 Trial of the Four Great Dragons na área de batalha sem jogar a Option, ativar Main ou comprar uma carta.",
      declined: "A colocação opcional foi recusada; as duas cópias de Trial permaneceram na mão.",
      "existing-trial":
        "Já havia uma Trial of the Four Great Dragons em jogo; AeroVeedramon não abriu a ação opcional.",
      "no-trial-hand": "Não havia Trial of the Four Great Dragons na mão; AeroVeedramon não abriu uma ação impossível.",
    };
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-033",
          effectKey: `EX3-033/${effect}`,
          description: `${descriptions[effect!]} ${whenDigivolving}`,
          timing: "WhenDigivolving",
        },
      ],
    };
  }
  if (effect === "trial-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-aeroveedramon-trial-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Trial of the Four Great Dragons para colocar na área de batalha",
        sourceCardId: "EX3-033",
        options: {
          candidateInstanceIds: [firstTrial.instanceId, secondTrial.instanceId],
          visibleInstanceIds: [firstTrial.instanceId, secondTrial.instanceId, filler.instanceId],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }
  return {
    state,
    decision: {
      decisionId: "demo-aeroveedramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Colocar 1 Trial of the Four Great Dragons da mão na área de batalha?",
      sourceCardId: "EX3-033",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving },
    },
  };
}
