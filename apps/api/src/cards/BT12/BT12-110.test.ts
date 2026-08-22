import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-110.js";

describe("BT12-110 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-110");
    expect(module?.cardId).toBe("BT12-110");
    const source = {
      instanceId: "source-110",
      cardId: "BT12-110",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });

  it("registers its printed Security activation", () => {
    const module = getEffectModule("BT12-110");
    const source = { instanceId: "source-110", cardId: "BT12-110", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("activates from trash when Beelzemon (X Antibody) digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-085", as: "beelzemon-x" }],
          trash: [{ card: "BT12-110", as: "cluster" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("beelzemon-x").permanentId,
    });

    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-110")).toBe(false);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT12-110")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });
});
