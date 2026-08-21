import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-022.js";

describe("BT14-022", () => it("when attacking trashes one opposing source and returns a source-less level-five-or-lower Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ actions: [{ kind: "TrashDigivolution", amount: 1 }, { kind: "Return", to: "hand", target: { filter: { digivolutionCards: "none", levelComparison: { op: "lte", value: 5 } } } }] })));

it("trashes one opposing source, then returns a source-less low-level Digimon", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-022", as: "gesomon" }], security: ["BT1-001"] },
    1: { battleArea: [{ card: "BT1-015", as: "sourced", under: ["BT1-001"] }, { card: "BT14-010", as: "returnable" }] },
  }, { autoSelectCards: true });
  s.state.turnSeat = 0;
  s.state.memory = 10;
  const gesomon = s.perm("gesomon");
  const sourcedId = s.perm("sourced").permanentId;
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gesomon.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-010"));
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === sourcedId)).toBe(false);
  expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-015")).toBe(true);
});
