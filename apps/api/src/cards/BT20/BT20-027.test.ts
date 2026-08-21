import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-027.js";
import "../index.js";

describe("BT20-027 Slayerdramon", () => {
  it("encodes every printed clause in executable IR without residuals", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Wingdramon", "Groundramon"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Piercing" }] });
    expect(compiled.effects.filter((effect) => ["OnPlay", "WhenDigivolving"].includes(effect.trigger))).toHaveLength(2);
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          mode: "prevent",
          affectsAll: true,
          leaveCause: "otherThanBattle",
          cost: { kind: "suspend", target: { isSelf: true } },
        },
      ],
    });
  });

  it("on play trashes exactly 3 cards from one opposing stack, then deletes a stackless Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-027", as: "slayerdramon" }] },
        1: {
          battleArea: [
            { card: "BT1-012", as: "stacked", under: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"] },
            { card: "BT1-010", as: "bare" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    const stacked = s.perm("stacked");
    const bare = s.perm("bare");
    preferred.push(stacked.permanentId, bare.permanentId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("slayerdramon").instanceId }).ok).toBe(true);
    await settle(
      () =>
        s.perm("stacked").stack.length === 1 &&
        !s.state.players[1]!.battleArea.some((card) => card.permanentId === bare.permanentId),
    );

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-010")).toHaveLength(4);
  });

  it("does not delete a Digimon that retains a digivolution card after trashing 3", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-027", as: "slayerdramon" }] },
        1: { battleArea: [{ card: "BT1-012", as: "stacked", under: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const stackedId = s.perm("stacked").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("slayerdramon").instanceId }).ok).toBe(true);
    await settle(() => s.perm("stacked").stack.length === 1);

    expect(s.state.players[1]!.battleArea.some((card) => card.permanentId === stackedId)).toBe(true);
    expect(s.perm("stacked").stack).toHaveLength(1);
  });
});
