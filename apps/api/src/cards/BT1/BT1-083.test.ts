import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-083.js";

describe("BT1-083 GranKuwagamon", () => {
  it("matches the catalog contract", () => {
    expect(getCardDefinition("BT1-083")).toMatchObject({
      cardId: "BT1-083",
      set: "BT1",
      nameEn: "GranKuwagamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Free"],
      types: ["Insectoid"],
      rarity: "SR",
      maxCountInDeck: 4,
      imageId: "BT1-083",
      nameJp: "グランクワガーモン",
    });
    expect(getCardDefinition("BT1-083")?.effectText).toContain("Your Turn");
    expect(getCardDefinition("BT1-083")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-083")?.securityEffectText).toBeUndefined();
  });

  it("digivolves from a green level 5 for 4 memory, draws, and preserves its source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-076", as: "base" }],
        hand: [{ card: "BT1-083", as: "gran" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gran").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gran").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-076"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("rejects evolution from a non-green level 5", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "redBase" }], hand: [{ card: "BT1-083", as: "gran" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("gran").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("has Piercing and gets +4000 DP on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-083", as: "digimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
    expect(s.perm("digimon").currentDP).toBe(15000);
  });

  it("keeps Piercing but loses the +4000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-083", as: "digimon" }] } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("digimon"))).toBe(true);
    expect(s.perm("digimon").currentDP).toBe(11000);
  });

  it("uses Piercing after deleting an opposing Digimon in battle and surviving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-083", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "defender", suspended: true }],
        security: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not grant either printed effect while GranKuwagamon is a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-057", as: "host", under: ["BT1-083"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
