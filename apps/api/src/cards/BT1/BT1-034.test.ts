import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-034.js";

describe("BT1-034 Ikkakumon", () => {
  it("matches the catalog and exact inherited blocker restriction IR", () => {
    expect(getCardDefinition("BT1-034")).toMatchObject({
      cardId: "BT1-034",
      set: "BT1",
      nameEn: "Ikkakumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Sea Beast"],
      inheritedEffectText:
        "[Your Turn] This Digimon can't be blocked by your opponent's Digimon with no digivolution cards.",
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-034",
      nameJp: "イッカクモン",
    });
    expect(getCardDefinition("BT1-034")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-034")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "Restrict",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              restriction: "cantBeBlockedByNoDigivolution",
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("cannot be blocked by a Digimon with no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "attacker", dp: 1000, under: ["BT1-034"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }], security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("can still be blocked by a Digimon with a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "attacker", dp: 1000, under: ["BT1-034"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", under: ["BT1-066"] }], security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("only restricts blocking during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-038", as: "attacker", under: ["BT1-034"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("attacker"), "cantBeBlockedByNoDigivolution")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("attacker"), "cantBeBlockedByNoDigivolution")).toBe(false);
  });

  it("digivolves from a blue level 3 for 2 memory and retains the restriction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-034", as: "ikkakumon" }],
        deck: [{ card: "BT1-030", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-030");
    // The inherited text is active when BT1-034 is under a host, not while it
    // is the top card of the just-evolved Digimon.
    expect(observe(s.engine).hasRestriction(s.perm("base"), "cantBeBlockedByNoDigivolution")).toBe(false);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT1-034", as: "ikkakumon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
