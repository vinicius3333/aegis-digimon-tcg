import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-042.js";

/**
 * Fixture identities used across the behavioral cases.
 * - BT23-038 FunBeemon: Lv.3 with both [Royal Base] and [CS] traits — a legal alternate source.
 * - BT23-083 Fei: a Tamer WITHOUT the [Royal Base] trait whose printed text names [Royal Base].
 *   This is the Q5303 positive: "in its text" spans name, traits and effect text.
 * - BT23-084 Erika Mishima: a Tamer with neither the trait nor the words in its text.
 * - BT1-009 Monodramon: a red Lv.3 with no [Royal Base]/[CS] trait — the illegal source.
 */

describe("BT23-042 Waspmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-042")).toMatchObject({
      cardId: "BT23-042",
      nameEn: "Waspmon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "CS", "Insectoid"],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Royal Base", "CS"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("grants +1000 DP to all Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isSecurity) as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("may play a Royal Base-in-text Tamer from hand when you have at most one Tamer", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Royal Base"], match: "text" }] },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      condition: {
        kind: "permanentCount",
        op: "lte",
        value: 1,
        filter: { controllerDefault: "mine", kind: ["Tamer"] },
      },
      optional: true,
    });
  });

  it("inherits +1000 DP during all turns", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  // Both the printed Green/Black Lv.3 EvoCost (3) and the alternate [Royal Base]/[CS]
  // requirement (2) match BT23-038, so the intent must name which path it pays.
  // BT23-037 is CS-only and reduces its own CS digivolution cost by 1 (2 - 1 = 1).
  it.each([
    ["BT23-038", true, 1],
    ["BT23-038", false, 0],
    ["BT23-037", true, 2],
  ])("digivolves from level-3 %s (alternate=%s) leaving %i memory", async (base, useAlternateCost, leftMemory) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base as string, as: "base" }],
          hand: [{ card: "BT23-042", as: "wasp" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const sourceId = s.perm("base").topCard!.instanceId;
    const drawnId = s.state.players[0]!.deck[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
        useAlternateCost: useAlternateCost as boolean,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-042" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(leftMemory);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("wasp").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects a level-3 source without the Royal Base or CS trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "illegal" }],
        hand: [{ card: "BT23-042", as: "wasp" }],
        deck: ["BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("illegal").permanentId,
      instanceId: s.inst("wasp").instanceId,
    });
    expect(result).not.toEqual({ ok: true });
    expect(s.perm("illegal").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT23-042");
    expect(s.state.memory).toBe(5);
  });

  it("plays a Tamer that only names Royal Base in its text, for free, from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-038", as: "base" }],
          hand: [
            { card: "BT23-042", as: "wasp" },
            { card: "BT23-083", as: "fei" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const feiId = s.inst("fei").instanceId;
    // Q5303: Fei carries no [Royal Base] trait; only her printed text names it.
    expect(getCardDefinition("BT23-083")?.types).not.toContain("Royal Base");
    expect(getCardDefinition("BT23-083")?.effectText).toContain("[Royal Base]");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === feiId) &&
        s.state.pendingDecision === undefined,
    );

    // Only the digivolution cost of 2 was paid; the Tamer itself cost nothing.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === feiId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === feiId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still plays the Tamer at exactly one own Tamer and stops at two", async () => {
    for (const [ownTamers, expectPlayed] of [
      [1, true],
      [2, false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT23-038", as: "base" },
              ...(ownTamers >= 1 ? [{ card: "BT23-084", as: "tamerA" }] : []),
              ...(ownTamers >= 2 ? [{ card: "BT23-083", as: "tamerB" }] : []),
            ],
            hand: [
              { card: "BT23-042", as: "wasp" },
              { card: "BT23-083", as: "fei" },
            ],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 3;
      const feiId = s.inst("fei").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("wasp").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-042" && s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === feiId)).toBe(
        expectPlayed,
      );
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === feiId)).toBe(!expectPlayed);
      expect(s.state.memory).toBe(1);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("counts only your own Tamers, not the opponent's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-038", as: "base" }],
          hand: [
            { card: "BT23-042", as: "wasp" },
            { card: "BT23-083", as: "fei" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT23-083", as: "theirs1" },
            { card: "BT23-084", as: "theirs2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const feiId = s.inst("fei").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === feiId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === feiId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("keeps the Tamer in hand when the controller declines", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-038", as: "base" }],
          hand: [
            { card: "BT23-042", as: "wasp" },
            { card: "BT23-083", as: "fei" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    const feiId = s.inst("fei").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-042" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === feiId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores a nonmatching Tamer in hand and a matching Tamer in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-038", as: "base" }],
          hand: [
            { card: "BT23-042", as: "wasp" },
            { card: "BT23-084", as: "erika" },
          ],
          trash: [{ card: "BT23-083", as: "trashedFei" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const erikaId = s.inst("erika").instanceId;
    const trashedId = s.inst("trashedFei").instanceId;
    // Erika names neither the trait nor the words; the trashed Tamer matches but is out of zone.
    expect(getCardDefinition("BT23-084")?.effectText).not.toContain("[Royal Base]");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-042" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(erikaId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(trashedId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("boosts only friendly Royal Base Digimon from face-up security, on both turns", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-042", as: "securityWasp", faceUp: true }],
        battleArea: [
          { card: "BT23-043", as: "royalBase" },
          { card: "BT23-041", as: "other" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT23-043", as: "opposingRoyalBase" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();

    expect(s.perm("royalBase").currentDP).toBe(9000);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(s.perm("opposingRoyalBase").currentDP).toBe(8000);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("royalBase").currentDP).toBe(9000);
    expect(s.perm("opposingRoyalBase").currentDP).toBe(8000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not boost while the security card stays face down", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-042", as: "securityWasp" }],
        battleArea: [{ card: "BT23-043", as: "royalBase" }],
      },
    });
    await s.ready();
    expect(s.inst("securityWasp").faceUp).toBe(false);
    expect(s.perm("royalBase").currentDP).toBe(8000);
  });

  // BT23-037 is the base here because it carries no inherited DP of its own, so the
  // +1000 measured on the finished stack can only come from BT23-042.
  it("carries the inherited +1000 DP after a real evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-037", as: "base" }],
          hand: [
            { card: "BT23-042", as: "wasp" },
            { card: "BT23-043", as: "cannon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT23-043", as: "control" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-042" && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cannon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-043" && s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard?.cardId).toBe("BT23-043");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT23-037", "BT23-042"]);
    expect(s.perm("base").currentDP).toBe(9000);
    // The opponent's identical Digimon has no BT23-042 in its stack, so it stays at printed DP.
    expect(s.perm("control").currentDP).toBe(8000);
  });
});
