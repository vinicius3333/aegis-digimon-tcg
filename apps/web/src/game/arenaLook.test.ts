import { CardInstance, Permanent, PlayerState, getCardDefinition } from "@aegis/shared";
import { expect, it } from "vitest";
import { mainCardColor } from "./arenaLook";

function card(cardId: string): CardInstance {
  return Object.assign(new CardInstance(), { instanceId: cardId, cardId });
}

it("picks the color the visible cards print most often", () => {
  const player = new PlayerState();
  const agumon = new Permanent();
  agumon.topCard = card("ST1-03");
  player.battleArea.push(agumon);
  player.trash.push(card("ST1-07"), card("ST2-03"));
  expect(getCardDefinition("ST1-03")?.colors[0]).toBe("Red");
  expect(mainCardColor(player)).toBe("Red");
});

it("reads a zone this client cannot see as empty", () => {
  const opponent = { battleArea: [], trash: [], breeding: undefined, hand: undefined } as unknown as PlayerState;
  expect(mainCardColor(opponent)).toBeUndefined();
});
