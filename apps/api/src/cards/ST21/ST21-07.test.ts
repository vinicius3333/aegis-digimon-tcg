import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-07", () => {
  it("requires trashing one Adventure card before drawing two", () => {
    expect(getCardDefinition("ST21-07")?.effectText).toContain("By trashing 1 card");
    const a = runtimeCompiledCard("ST21-07")?.effects.find((x) => x.trigger === "OnPlay")?.actions[0];
    expect(a).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { count: 1 } },
    });
  });
  it("gives the host permanent inherited DP", () => {
    const e = runtimeCompiledCard("ST21-07")?.effects.find((x) => x.isInherited);
    expect(e).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { isSelf: true } }],
    });
  });

  it("pays the exact ADVENTURE hand cost and draws two cards on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST21-07", as: "palmon" },
            { card: "ST21-14", as: "cost" },
          ],
          deck: [
            { card: "BT1-001", as: "drawOne" },
            { card: "BT1-002", as: "drawTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === costId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
  });
});
