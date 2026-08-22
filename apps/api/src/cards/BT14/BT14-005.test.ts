import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-005.js";

describe("BT14-005", () => it("inherits once-per-turn +2000 DP by returning three D-Brigade or DigiPolice cards from trash to deck top", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: 2000, cost: { kind: "return", target: { count: 3 }, raw: expect.stringContaining("D-Brigade") } }] })));

it("returns three matching trash cards to the deck top and gains +2000 DP once", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT14-007", as: "host", under: ["BT14-005"] }],
        trash: ["BT14-056", "BT14-058", "BT14-060"],
      },
      1: { security: ["BT1-001"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  const host = s.perm("host");
  const before = host.currentDP;
  s.state.memory = 10;
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  await settle(() => host.currentDP === before + 2000);

  expect(host.currentDP).toBe(before + 2000);
  expect(s.state.players[0]!.trash).toHaveLength(0);
  expect(s.state.players[0]!.deck.slice(0, 3).map((card) => card.cardId)).toEqual(["BT14-060", "BT14-058", "BT14-056"]);
});
