import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-094.js";

describe("BT15-094", () => {
  it("suspends any level 6 or lower Digimon and gives an Insectoid +3000 DP", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { levelComparison: { op: "lte", value: 6 } } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] } },
    });
  });
  it("activates main and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }],
    }));

  it("naturally suspends an opposing level-6 Digimon and buffs a selected Insectoid", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-088", as: "source" },
            { card: "BT15-047", as: "insectoid", dp: 5000 },
          ],
          hand: [{ card: "BT15-094", as: "option" }],
        },
        1: { battleArea: [{ card: "BT15-052", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && s.perm("insectoid").currentDP === 8000);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("insectoid").currentDP).toBe(8000);
    expect(s.perm("source").topCard.cardId).toBe("BT1-088");
  });
});
