import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-082.js";
import { compiled } from "./EX2-015.js";

describe("EX2-015 Seasarmon", () => {
  it("matches the catalog and compiles its printed keyword", () => {
    expect(getCardDefinition("EX2-015")).toMatchObject({
      cardId: "EX2-015",
      nameEn: "Seasarmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      effectText: "＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "Static",
          actions: [],
          keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "seasarmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(true);
  });

  it("survives a losing battle against a Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-015", as: "seasarmon" }] },
      1: { security: ["BT1-082"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seasarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("is deleted when it loses a battle against a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-015", as: "seasarmon" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 11000, suspended: true, as: "opponent" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seasarmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX2-015")).toBe(true);
  });

  it("retains Jamming after a legal blue level-3 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-013", as: "base" }],
        hand: [{ card: "EX2-015", as: "evolution" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-013"]);
    expect(s.perm("base").topCard.cardId).toBe("EX2-015");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("rejects evolution from a non-blue level-3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX2-015", as: "evolution" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX2-015")).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
