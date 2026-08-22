import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-053.js";
import "../index.js";

describe("BT26-053 Wolvermon", () => {
  it("encodes Blocker and the All Turns Once Per Turn target-switch cost/use route", () => {
    expect(digivolutionRequirementsFor("BT26-053")).toContainEqual({ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true });
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "TrashDigivolution", fromTop: false }, { kind: "UseOptionWithoutCost", from: ["hand"], payCost: false }] }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "None", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent" }] });
  });

  it("publicly pays the target-switch trigger with a face-down Tamer card and uses the Glowing Dawn Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "BT26-053" }] },
          { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
        ],
        hand: [{ card: "BT26-031", as: "option" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { subjectPermanentId: s.perm("host").permanentId });

    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT26-031");
  });
});
