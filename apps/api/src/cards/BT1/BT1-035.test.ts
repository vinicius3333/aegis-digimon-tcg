import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-035.js";

describe("BT1-035 Leomon", () => {
  it("matches the catalog and exact On Deletion IR", () => {
    expect(getCardDefinition("BT1-035")).toMatchObject({
      cardId: "BT1-035",
      set: "BT1",
      nameEn: "Leomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText: "[On Deletion] Gain 2 memory.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-035",
      nameJp: "レオモン",
    });
    expect(getCardDefinition("BT1-035")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-035")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [{ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 2 }] }],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 2 memory when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-035", as: "leomon", dp: 1000, suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("leomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === -2);
    expect(s.state.memory).toBe(-2);
  });

  it("does not gain memory when another Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-035", as: "leomon" }] },
      1: { battleArea: [{ card: "BT1-016", as: "other" }] },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("digivolves from a blue level 3 for 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-035", as: "leomon" }],
        deck: [{ card: "BT1-030", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("leomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-030");
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT1-035", as: "leomon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
