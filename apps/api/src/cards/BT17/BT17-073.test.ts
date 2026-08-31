import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
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
        sourceFilter: { zone: "trash", controller: "mine" },
        target: {
          filter: expect.objectContaining({
            controller: "mine",
            nameOrTrait: [{ tokens: ["Dorugoramon"], match: "name" }],
          }),
        },
        mode: "prevent",
        digivolveFromTrash: true,
        optional: true,
        abortOnDecline: true,
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

  it("unsuspends after an opponent's Digimon is deleted in a natural battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-073", suspended: true, as: "dexDorugoramon" }] },
        1: { battleArea: [{ card: "BT17-064", dp: 1000, as: "opposingDigimon" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opposingDigimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dexDorugoramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("dexDorugoramon").isSuspended);

    expect(s.perm("dexDorugoramon").isSuspended).toBe(false);
  });

  it("digivolves from trash to prevent a natural Dorugoramon deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-064", dp: 10000, suspended: true, as: "dorugoramon" }],
          trash: [{ card: "BT17-073", as: "dexDorugoramon" }],
        },
        1: { battleArea: [{ card: "BT17-072", dp: 13000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dorugoramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-073"));

    expect(s.perm("dorugoramon").topCard.cardId).toBe("BT17-073");
    expect(s.perm("dorugoramon").stack.some((card) => card.cardId === "BT16-064")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-073")).toBe(false);
  });
});
