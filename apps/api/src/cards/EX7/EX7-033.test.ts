import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-033.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-033 Monochromon", () => {
  it("matches the catalog, complete IR, alternate evolution, and exclusive registration", () => {
    expect(getCardDefinition("EX7-033")).toMatchObject({
      cardId: "EX7-033",
      nameEn: "Monochromon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 1 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Ankylosaur", "NSp", "Dinosaur"],
      effectText: "[Digivolve]Lv.3 w/[NSp] trait: Cost 1 \n\n[Rule] Trait: Has the [Dinosaur] type.",
      inheritedEffectText: "＜Piercing＞.",
    });
    expect(digivolutionRequirementsFor("EX7-033")).toContainEqual({
      level: 3,
      traits: ["NSp"],
      cost: 1,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "trait",
              tokens: ["Dinosaur"],
            },
          ],
        },
        {
          trigger: "Static",
          actions: [],
          isInherited: true,
          keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, traits: ["NSp"], cost: 1, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-033")).toBe(true);
  });

  it("exposes the Dinosaur rule trait and inherited Piercing on a live stack", async () => {
    const source = setupEngine({ 0: { battleArea: [{ card: "EX7-033", as: "source" }] } });
    await source.ready();
    expect(observe(source.engine).hasEffectiveTrait(source.perm("source"), "Dinosaur")).toBe(true);

    const host = setupEngine({ 0: { battleArea: [{ card: "BT11-053", as: "host", under: ["EX7-033"] }] } });
    await host.ready();
    expect(observe(host.engine).hasPierce(host.perm("host"))).toBe(true);
  });

  it("uses inherited Piercing after winning a battle against an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-053", as: "host", dp: 7000, under: ["EX7-033"] }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 3000, suspended: true }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("evolves from a non-green NSp level 3 for 1 with exact draw and stack identity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "base" }],
        hand: [{ card: "EX7-033", as: "mono" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const monoId = s.inst("mono").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: monoId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === monoId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("rejects a non-green non-NSp level 3 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX7-033", as: "mono" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mono").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.cardId).toBe("BT1-014");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
