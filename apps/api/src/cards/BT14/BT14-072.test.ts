import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-072.js";

describe("BT14-072", () =>
  it("returns a purple Dark Animal from trash to hand, then trashes a hand card on play and attack", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: {
              filter: { zone: "trash", colors: ["Purple"], nameOrTrait: [{ tokens: ["Dark Animal"], match: "trait" }] },
            },
          },
          { kind: "Trash", target: { filter: { zone: "hand" } } },
        ],
      });
  }));

it("returns a purple Dark Animal and then trashes a hand card on play", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT14-072", as: "fangmon" },
          { card: "BT1-001", as: "discard" },
        ],
        trash: [{ card: "BT14-071", as: "returned" }],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fangmon").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001"));
  expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-071")).toBe(true);
  expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
});
