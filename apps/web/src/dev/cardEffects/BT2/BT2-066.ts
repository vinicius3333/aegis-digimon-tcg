import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function machinedramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "blocked" || effect === "eligible" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const machinedramon = permanent("demo-machinedramon-bt2", "BT2-066", 0, 11000);
  machinedramon.keywords.push("Blocker");
  you.battleArea.push(machinedramon);

  if (effect === "eligible" || effect === "blocked") {
    const attacker = permanent("demo-machinedramon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") machinedramon.isSuspended = true;
  } else if (effect === "level-three-stop") {
    opponent.battleArea.push(permanent("demo-machinedramon-bt2-rookie", "BT1-010", 1, 2000));
    opponent.trash.push(card("demo-machinedramon-bt2-trashed", "BT1-017", 1));
  } else {
    opponent.battleArea.push(
      permanent("demo-machinedramon-bt2-target-a", "BT1-017", 1, 4000, [
        { instanceId: "demo-machinedramon-bt2-a-source", cardId: "BT1-010" },
      ]),
    );
    opponent.battleArea.push(
      permanent("demo-machinedramon-bt2-target-b", "BT1-036", 1, 4000, [
        { instanceId: "demo-machinedramon-bt2-b-source", cardId: "BT1-029" },
      ]),
    );
    opponent.trash.push(
      card("demo-machinedramon-bt2-a-trash-1", "BT1-023", 1),
      card("demo-machinedramon-bt2-a-trash-2", "BT1-084", 1),
      card("demo-machinedramon-bt2-b-trash-1", "BT1-041", 1),
      card("demo-machinedramon-bt2-b-trash-2", "BT1-084", 1),
    );
  }
  state.players.push(you, opponent);

  if (effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [machinedramon.permanentId],
        },
      ],
    };
  }
  const selected = effect ?? "de-digivolved-two";
  const descriptions: Record<string, string> = {
    "de-digivolved-two": "Machinedramon's On Play effect de-digivolved 2 opposing Digimon by 2 cards each.",
    "level-three-stop": "De-Digivolve stopped after the opposing Digimon became level 3.",
    blocked: "Machinedramon suspended to block, redirected the attack, and protected security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-066",
        effectKey: `BT2-066/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "blocked" ? "OpponentsTurn" : "OnPlay",
      },
    ],
  };
}
