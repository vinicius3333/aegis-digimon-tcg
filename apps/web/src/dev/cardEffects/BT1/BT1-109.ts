import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function smashedPotatoesDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] For the turn, the next time one of your green Digimon digivolves from level 5 to level 6, decrease the digivolution cost by 4.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 6 : effect === "consumed-once" ? 6 : 4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const evolved = effect === "q978-free" || effect === "q980-effect" || effect === "q1736-persisted";
  you.battleArea.push(
    permanent(
      "demo-potatoes-base",
      evolved ? (effect === "q980-effect" ? "BT9-055" : "BT1-080") : "BT1-075",
      0,
      evolved ? 12000 : 9000,
      evolved ? [{ instanceId: "demo-potatoes-old-top", cardId: "BT1-075" }] : [],
    ),
  );
  if (effect === "q979-breeding") {
    const breeding = permanent("demo-potatoes-breeding", "BT1-083", 0, 11000, [
      { instanceId: "demo-potatoes-breeding-base", cardId: "BT1-075" },
    ]);
    breeding.inBreeding = true;
    you.breeding = breeding;
    you.battleArea[0] = permanent("demo-potatoes-base", "BT9-055", 0, 12000, [
      { instanceId: "demo-potatoes-battle-base", cardId: "BT1-075" },
    ]);
  }
  if (effect === "consumed-once") {
    you.battleArea[0] = permanent("demo-potatoes-first", "BT1-080", 0, 12000, [
      { instanceId: "demo-potatoes-first-base", cardId: "BT1-075" },
    ]);
    you.battleArea.push(
      permanent("demo-potatoes-second", "BT1-080", 0, 12000, [
        { instanceId: "demo-potatoes-second-base", cardId: "BT1-075" },
      ]),
    );
  }
  if (effect === "q1736-persisted") {
    const shivamon = permanent("demo-potatoes-shivamon", "BT8-057", 1, 12000);
    shivamon.isSuspended = true;
    opponent.battleArea.push(shivamon);
    you.hand.push(card("demo-potatoes-blocked-option", "BT1-108", 0));
    you.handCount = 1;
  }
  if (effect === null) {
    you.hand.push(card("demo-potatoes-option", "BT1-109", 0), card("demo-potatoes-evolution", "BT1-080", 0));
    you.handCount = 2;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-potatoes-security", "BT1-109", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-potatoes-option", "BT1-109", 0));
    if (effect === "armed" || effect === "expired") {
      you.hand.push(card("demo-potatoes-evolution", "BT1-080", 0));
      you.handCount = 1;
    }
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    armed:
      "Smashed Potatoes armed a -4 cost adjustment for the next eligible green level-5-to-6 digivolution this turn.",
    "q978-free": "A printed cost-2 level 6 digivolution was reduced by 4 to 0 without gaining memory (Q978).",
    "q979-breeding":
      "The breeding-area digivolution paid full cost and did not consume the adjustment; the later battle-area digivolution was free (Q979).",
    "q980-effect": "An effect-driven X Antibody digivolution consumed the adjustment and was reduced to cost 0 (Q980).",
    "q1736-persisted":
      "After Shivamon became suspended and prohibited new Option uses, the already-resolved Smashed Potatoes adjustment still made the digivolution free (Q1736).",
    "consumed-once":
      "Only the first eligible digivolution was free; the second paid its printed cost after the adjustment was consumed.",
    expired: "The unused Smashed Potatoes adjustment expired at the end of the turn.",
    "security-trashed": "Smashed Potatoes has no Security effect and was simply trashed after the check.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-109",
        effectKey: effect === "security-trashed" ? "BT1-109/no-security-effect" : "BT1-109/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
