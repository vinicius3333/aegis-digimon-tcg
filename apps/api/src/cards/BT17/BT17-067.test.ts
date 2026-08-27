import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-067.js";
import "./index.js";

describe("BT17-067 DexDoruGreymon", () => {
  it("installs the Trash replacement that digivolves a DoruGreymon before deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          target: { filter: { nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] } },
          digivolveFromTrash: true,
        },
      ],
    });
  });

  it("keeps the inherited end-of-attack deletion once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        { kind: "SelectBind", target: { bindAs: "chosenDigimon", upTo: true } },
        { kind: "Delete", target: { fromSelectionRef: "chosenDigimon" } },
        {
          kind: "Delete",
          target: { filter: { relativeTo: { attr: "level", op: "lte", selectionRef: "chosenDigimon" } } },
        },
      ],
    });
  });

  it("replaces only the draw with play-cost deletion when the condition is met", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Trash" });
    expect(compiled.effects?.[1]?.actions?.[0]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "not", condition: { kind: "anyOf" } },
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { playCostLte: 6 } },
      condition: { kind: "anyOf" },
    });
  });

  it("uses the DoruGreymon route, mandates the hand trash, and deletes instead of drawing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-061", as: "doruGreymon" }],
          hand: [
            { card: "BT17-067", as: "dexDoruGreymon" },
            { card: "BT1-001", as: "discarded" },
          ],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("doruGreymon").permanentId,
        instanceId: s.inst("dexDoruGreymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.perm("doruGreymon").topCard.cardId).toBe("BT17-067");
  });
});
