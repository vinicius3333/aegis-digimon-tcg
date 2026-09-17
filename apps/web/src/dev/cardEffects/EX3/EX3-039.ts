import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function coredramonDemo(effect: string | null): CardEffectsFixture {
  const inherited = "[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 1;
  state.memory = -1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "coredramon-opponent");
  const attacker = permanent("demo-coredramon-attacker", "BT1-028", 1, 2000);
  attacker.isSuspended = true;
  opponent.battleArea.push(attacker);

  if (effect === "inherited" || effect === "inherited-negative") {
    const eligible = effect === "inherited";
    const host = permanent("demo-coredramon-host", eligible ? "EX3-020" : "BT1-084", 0, eligible ? 7000 : 15000, [
      { instanceId: "demo-coredramon-inherited-source", cardId: "EX3-039" },
    ]);
    if (eligible) host.grantedKeywords.push("Blocker");
    you.battleArea.push(host);
    state.players.push(you, opponent);
    return {
      state,
      events: eligible
        ? [
            {
              kind: "effectTriggered",
              seat: 0,
              sourceCardId: "EX3-039",
              effectKey: "EX3-039/inherited-blocker",
              description: `Wingdramon tem Dramon no nome e recebeu Blocker de Coredramon. ${inherited}`,
              timing: "AllTurns",
            },
            {
              kind: "blockWindowOpened",
              attackerPermanentId: attacker.permanentId,
              eligibleBlockerIds: [host.permanentId],
            },
          ]
        : [
            {
              kind: "effectTriggered",
              seat: 0,
              sourceCardId: "EX3-039",
              effectKey: "EX3-039/inherited-blocker",
              description: `Omnimon não tem Dramon nem Examon no nome; Coredramon não concedeu Blocker. ${inherited}`,
              timing: "AllTurns",
            },
          ],
    };
  }

  if (effect === "promoted") {
    const wingdramon = permanent("demo-coredramon-promoted", "EX3-020", 0, 7000, [
      { instanceId: "demo-coredramon-promoted-source", cardId: "EX3-039" },
    ]);
    wingdramon.grantedKeywords.push("Blocker");
    you.battleArea.push(wingdramon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-039",
          effectKey: "EX3-039/armor-purge-promoted-blocker",
          description: `Após Armor Purge, Wingdramon ficou no topo com Coredramon como fonte e passou a ter Blocker. ${inherited}`,
          timing: "AllTurns",
        },
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [wingdramon.permanentId],
        },
      ],
    };
  }

  const coredramon = permanent("demo-coredramon", "EX3-039", 0, 6000);
  coredramon.keywords.push("Blocker");
  if (effect === "blocked") coredramon.isSuspended = true;
  you.battleArea.push(coredramon);
  if (effect === "declined") you.securityCount = 4;
  state.players.push(you, opponent);

  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: coredramon.permanentId }] };
  }
  if (effect === "declined") {
    return {
      state,
      events: [
        { kind: "blockDeclined", attackerPermanentId: attacker.permanentId },
        { kind: "securityChecked", seat: 0, revealedCardId: "BT1-010", resolution: "battle" },
      ],
    };
  }
  return {
    state,
    events: [
      {
        kind: "blockWindowOpened",
        attackerPermanentId: attacker.permanentId,
        eligibleBlockerIds: [coredramon.permanentId],
      },
    ],
  };
}
