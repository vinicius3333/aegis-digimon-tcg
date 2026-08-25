import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-096.js";

describe("BT23-096 Comet Hammer", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-096")).toMatchObject({
      cardId: "BT23-096",
      nameEn: "Comet Hammer",
      colors: ["Black"],
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

  it("pays Delay and de-digivolves up to four cards from a realistic opposing stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-096", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: ["BT23-010", "BT23-006", "BT23-005", "BT23-001"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      subjectPermanentId: s.perm("attacker").permanentId,
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("target").topCard?.cardId).toBe("BT23-001");
  });

  it("activates Delay when a CS Digimon attacks and de-digivolves in that window", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions).toHaveLength(1);
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 4 });
  });

  it("keeps the Main and Security de-digivolve-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
