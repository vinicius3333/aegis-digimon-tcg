import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-032.js";

describe("BT1-032 Frigimon", () => {
  it("matches the catalog and exact Jamming IR", () => {
    expect(getCardDefinition("BT1-032")).toMatchObject({
      cardId: "BT1-032",
      nameEn: "Frigimon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Ice-Snow"],
      effectText: "＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)",
    });
    expect(getCardDefinition("BT1-032")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-032")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }],
      coverage: "full",
      residual: [],
    });
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-032", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Jamming")).toBe(true);
  });

  it("survives a battle against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "attacker" }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
  });

  it("can still be deleted by a stronger Digimon in an ordinary battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-081", as: "defender", suspended: true }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  });

  it("digivolves from a blue level 3 for 2 memory and retains Jamming", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-032", as: "frigimon" }],
        deck: [{ card: "BT1-026", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("frigimon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT1-032", as: "frigimon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
