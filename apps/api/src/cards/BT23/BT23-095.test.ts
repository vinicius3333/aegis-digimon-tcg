import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-095.js";

describe("BT23-095 Crescent Leaf", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-095")).toMatchObject({
      cardId: "BT23-095",
      nameEn: "Crescent Leaf",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toEqual(["battleArea", "breedingArea"]);
  });

  it("pays Delay and returns only a suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspended", suspended: true },
            { card: "BT1-010", as: "active" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const returnedId = s.perm("suspended").topCard!.instanceId;
    const activeId = s.perm("active").topCard!.instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      subjectPermanentId: s.perm("attacker").permanentId,
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.deck[0]?.instanceId).toBe(returnedId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === activeId)).toBe(true);
  });

  it("keeps return nested in Delay and Main/Security return-then-place", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions).toEqual([expect.objectContaining({ kind: "Return", to: "deckBottom" })]);
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.actions).toMatchObject([{ kind: "Return", to: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }]);
    }
  });
});
