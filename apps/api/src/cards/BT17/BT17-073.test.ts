import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-073.js";
import "./index.js";

describe("BT17-073 DexDorugoramon", () => {
  it("replaces deletion of your Dorugoramon with optional self digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.isFromTrash);
    expect(effect?.trigger).toBe("AllTurns");
    expect(effect?.actions).toEqual([
      expect.objectContaining({
        kind: "Replacement",
        event: "wouldBeDeleted",
        sourceFilter: expect.objectContaining({
          controller: "mine",
          nameOrTrait: [{ tokens: ["Dorugoramon"], match: "name" }],
        }),
        actions: [
          expect.objectContaining({
            kind: "Prevent",
            cost: expect.objectContaining({ kind: "digivolveSelf" }),
            optional: true,
          }),
        ],
      }),
    ]);
  });

  it("de-digivolves three levels and conditionally deletes lowest-level Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 3,
      stopAtLevel: 3,
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "anyOf" },
      target: { filter: { controller: "opponent", superlative: "lowestLevel" } },
    });
  });

  it("unsuspends itself once per turn when another Digimon is deleted", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
    expect(irNode(effect?.actions[0])?.sourceFilter).not.toHaveProperty("controller");
    expect(irNode(effect?.actions[0])?.sourceFilter).not.toHaveProperty("controllerDefault");
  });

  it("unsuspends when an opponent's Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-073", suspended: true, as: "dexDorugoramon" }] },
        1: { battleArea: [{ card: "BT17-063", as: "opposingDigimon" }] },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("opposingDigimon").permanentId], "byEffect");
    await settle(() => !s.perm("dexDorugoramon").isSuspended);

    expect(s.perm("dexDorugoramon").isSuspended).toBe(false);
  });
});
