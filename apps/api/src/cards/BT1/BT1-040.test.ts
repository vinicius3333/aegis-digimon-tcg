import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT1-040.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT1-040 WereGarurumon", () => {
  it("matches the catalog and exact delayed-memory IR", () => {
    expect(getCardDefinition("BT1-040")).toMatchObject({
      cardId: "BT1-040",
      set: "BT1",
      nameEn: "WereGarurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText: "[When Attacking] Gain 3 memory. At end of turn， lose 3 memory.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-040",
      nameJp: "ワーガルルモン",
    });
    expect(getCardDefinition("BT1-040")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-040")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            { kind: "GainMemory", amount: 3 },
            { kind: "GainMemory", amount: -3, at: "endOfTurn" },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-040", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("still loses 3 memory at the real turn end after being deleted in that attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-084", as: "target", dp: 20000, suspended: true }] },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const turn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[0]!.battleArea.length === 0);
    await turn;
    expect(s.state.memory).toBe(-6);
  });

  it("digivolves legally from blue level 4, draws, and retains the source card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "base" }],
        hand: [{ card: "BT1-040", as: "weregarurumon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("weregarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("weregarurumon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-037"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("rejects evolution from a red level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "BT1-040", as: "weregarurumon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("weregarurumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
