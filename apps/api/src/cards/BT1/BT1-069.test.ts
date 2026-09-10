import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-069.js";

describe("BT1-069 Ogremon", () => {
  it("matches the catalog and exact Jamming IR contract", () => {
    expect(getCardDefinition("BT1-069")).toMatchObject({
      cardId: "BT1-069",
      set: "BT1",
      nameEn: "Ogremon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Demon"],
      effectText: "＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)",
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-069",
      nameJp: "オーガモン",
    });
    expect(getCardDefinition("BT1-069")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-069")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }],
      coverage: "full",
      residual: [],
    });
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-069", as: "digimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Jamming")).toBe(true);
  });

  it("survives a battle against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-069", as: "attacker", dp: 4000 }] },
      1: { security: ["BT1-019"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
  });

  it("does not grant Jamming while it is a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "host", under: ["BT1-069", "BT1-075"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("retains Jamming after a legal green level 3 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "BT1-069", as: "ogremon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ogremon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-064"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("evolutionDraw").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-069", as: "ogremon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
