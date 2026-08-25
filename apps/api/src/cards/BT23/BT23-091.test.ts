import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-091.js";

describe("BT23-091 Wolkenapalm", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-091")).toMatchObject({
      cardId: "BT23-091",
      nameEn: "Wolkenapalm",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toBe("field");
  });

  it("pays intrinsic Delay on a CS attack and deletes only a lowest-DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-091", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT23-101", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const lowestId = s.perm("lowest").permanentId;
    const higherId = s.perm("higher").permanentId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      subjectPermanentId: s.perm("attacker").permanentId,
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([higherId]);
  });

  it("activates Delay in the CS attack window and deletes only a lowest-DP Digimon", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(turn.actions[0].actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
  });
  it("keeps lowest-DP deletion in Main and Security", () => {
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && !entry.keywords) as any;
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestDP" } },
      });
      if (trigger === "Main" || trigger === "Security")
        expect(effect.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    }
  });
});
