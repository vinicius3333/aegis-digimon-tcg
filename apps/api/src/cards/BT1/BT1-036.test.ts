import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-036.js";

describe("BT1-036 Garurumon", () => {
  it("matches the catalog and exact On Play IR", () => {
    expect(getCardDefinition("BT1-036")).toMatchObject({
      cardId: "BT1-036",
      set: "BT1",
      nameEn: "Garurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      effectText: "[On Play] Unsuspend 1 of your Digimon.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-036",
      nameJp: "ガルルモン",
    });
    expect(getCardDefinition("BT1-036")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-036")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("unsuspends one of your Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-036", as: "garurumon" }],
          battleArea: [{ card: "BT1-029", as: "target", dp: 2000, suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("only unsuspends your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-036", as: "garurumon" }],
          battleArea: [{ card: "BT1-029", as: "target", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-029", as: "opponentTarget", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
  });

  it("allows a Digimon that attacked to attack again after it is unsuspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-036", as: "garurumon" }],
          battleArea: [{ card: "BT1-029", as: "attacker", dp: 20000 }],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("attacker").permanentId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    await settle(() => s.state.players[1]!.security.length === 1 && !combat.isAttacking);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("does not activate On Play when Garurumon digivolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-029", as: "base" },
          { card: "BT1-029", as: "target", suspended: true },
        ],
        hand: [{ card: "BT1-036", as: "garurumon" }],
        deck: [{ card: "BT1-030", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("garurumon").instanceId);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("digivolves from a blue level 3 for 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-036", as: "garurumon" }],
        deck: [{ card: "BT1-030", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("garurumon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-030");
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT1-036", as: "garurumon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
