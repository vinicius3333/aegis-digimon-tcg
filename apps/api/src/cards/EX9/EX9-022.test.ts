import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-022.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX9-022", () => {
  it("has Training and inherits a permanent -3000 DP effect against all opposing Digimon during your turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifySecurityDP",
      controller: "opponent",
      amount: -3000,
      duration: "permanent",
    });
  });

  it("reduces opposing Security Digimon DP without affecting an opposing battle-area Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", under: ["EX9-022"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-010", as: "battle" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const battle = s.perm("battle");

    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(battle.currentDP).toBe(battle.baseDP);
  });

  it("activates Training publicly and places the unrevealed deck card at stack bottom", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-022", as: "source", under: ["EX9-004"] }], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(source) as Array<{ effectKey: string; instanceId: string }>;
    expect(effect?.instanceId).toBe(source.topCard.instanceId);
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: effect!.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(source.isSuspended).toBe(true);
    expect(source.stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-004"]);
    expect(source.stack[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
