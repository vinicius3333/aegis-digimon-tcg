import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-053.js";
import "../index.js";

describe("BT26-053 Wolvermon", () => {
  it("encodes Blocker and the All Turns Once Per Turn target-switch cost/use route", () => {
    expect(digivolutionRequirementsFor("BT26-053")).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "CostGatedBlock",
              cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
              actions: [{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: false }],
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "None",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent" }],
    });
  });

  it("publicly pays the target-switch trigger with a face-down Tamer card and uses the Glowing Dawn Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "P-236", as: "option" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("P-236");
  });

  it("doesn't use the Option when the exact face-down bottom cost can't be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceUp", faceUp: true }] },
          ],
          hand: [{ card: "P-236", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("P-236");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain("BT1-010");
  });
});
