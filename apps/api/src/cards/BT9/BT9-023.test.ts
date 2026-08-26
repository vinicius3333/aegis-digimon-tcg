import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-023.js";

describe("BT9-023 KausGammamon", () => {
  it("matches its catalog, full IR, and the Gammamon-only alternate evolution", () => {
    expect(getCardDefinition("BT9-023")).toMatchObject({
      cardId: "BT9-023",
      nameEn: "KausGammamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Dragonkin"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          actions: [{ kind: "Restrict", restriction: "cantBeBlocked", duration: "permanent" }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Gammamon"], cost: 2, isAlternate: true }],
    });
  });

  it("cannot be blocked only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-023", as: "kaus" }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("kaus"), "cantBeBlocked")).toBe(true);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("kaus"), "cantBeBlocked")).toBe(false);
  });

  it("uses the 2-cost alternate route from Gammamon but rejects another red rookie", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [
          { card: "BT8-008", as: "gammamon" },
          { card: "BT9-023", as: "kaus" },
        ],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gammamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("gammamon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("kaus").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("kaus").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-001", "BT8-008"]);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [{ card: "BT1-009", as: "notGammamon" }, { card: "BT9-023", as: "kaus" }],
      },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("egg").permanentId,
        instanceId: invalid.inst("notGammamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => invalid.perm("egg").topCard.instanceId === invalid.inst("notGammamon").instanceId);
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("egg").permanentId,
        instanceId: invalid.inst("kaus").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
