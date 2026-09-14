// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { createArenaDemoState } from "./ArenaDemo";

afterEach(() => window.history.replaceState(null, "", "/dev/arena"));

it("loads the requested Royal Base board through the demo URL with three public security cards", () => {
  window.history.replaceState(null, "", "/dev/arena?scenario=security");
  const state = createArenaDemoState();
  const own = state.players[0]!;
  expect(state.memory).toBe(6);
  expect(own.securityCount).toBe(5);
  expect(own.security.map((card) => card.cardId)).toEqual(["", "", "BT19-045", "BT18-044", "P-181"]);
  expect(own.security.filter((card) => card.faceUp)).toHaveLength(3);
  expect(own.battleArea[0]?.currentDP).toBe(3000);
  expect(own.hand).toHaveLength(6);
  expect(state.players[1]?.battleArea[0]?.topCard.cardId).toBe("BT19-070");
  expect(state.players[1]?.hand).toHaveLength(0);
});
