import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-066.js";
import "../index.js";

describe("BT21-066 Arresterdramon", () => {
  async function battleDeleteWithSaveChoices(firstPlacement: boolean, secondSave: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT21-080", as: "tamer" },
          ],
          hand: [{ card: "BT21-063", as: "saved" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT10-055", as: "opponent", suspended: true }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: false },
    );
    const arresterId = s.inst("arrester").instanceId;
    const savedId = s.inst("saved").instanceId;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arrester").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });

    let optionalCount = 0;
    for (let step = 0; step < 2; step += 1) {
      await settle(() => s.state.pendingDecision !== undefined, 5000);
      const pending = s.state.pendingDecision;
      if (pending === undefined) break;
      expect(pending.kind).toBe("optional");
      optionalCount += 1;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: optionalCount === 1 ? firstPlacement : secondSave },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    }
    expect(optionalCount).toBe(2);
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    return { s, arresterId, savedId };
  }

  it("preserves both alternate Digivolution requirements, DigiXros, and complete coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Save"], cost: 2, isAlternate: true },
      { level: 3, traits: ["Hero"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ texts: ["Save"] }], count: 2, maxMaterials: 1 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("DigiXroses with exactly one Save-text Digimon for a 2-memory reduction", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT21-066", as: "arrester" },
          { card: "BT21-011", as: "first" },
          { card: "BT21-063", as: "second" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("arrester").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("arrester").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT21-066"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("arrester").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("second").instanceId)).toBe(true);
  });

  it("plays Hunter/Hero Tamers and saves a qualifying Digimon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"] })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "WhenDigivolving" }));
    const deletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(deletion?.keywords).toContainEqual(expect.objectContaining({ keyword: "Save" }));
    const saveAction = deletion?.actions[0] as { target?: { orFilters?: Array<{ keywords?: string[] }> } };
    expect(saveAction.target?.orFilters).toEqual(
      expect.arrayContaining([expect.objectContaining({ keywords: ["Save"] })]),
    );
    expect(saveAction).toMatchObject({
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] },
        orFilters: [{ controller: "mine", kind: ["Digimon"], keywords: ["Save"] }],
        count: 1,
        from: ["hand", "trash"],
      },
      underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", target: expect.anything(), amount: 2000, duration: "permanent" }],
      }),
    );
  });

  it.each([
    ["Hunter", "BT12-087"],
    ["Hero", "BT21-080"],
  ])("plays a %s Tamer from hand without cost on play", async (_label, tamer) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-066", as: "arrester" },
            { card: tamer, as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arrester").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.memory).toBe(4);
  });

  it("does not play a nonmatching Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT21-066", as: "arrester" }], hand: [{ card: "BT1-085", as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("arrester"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("publicly declines an eligible Hunter Tamer on play without moving or paying it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT12-087", as: "hunter" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hunterId = s.inst("hunter").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arrester").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-066"));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === hunterId)).toBe(true);
  });

  it("publicly declines an eligible Hero Tamer on digivolving without moving or paying it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-063", as: "base" }],
          hand: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT21-080", as: "heroTamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const heroTamerId = s.inst("heroTamer").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("arrester").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-066");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === heroTamerId)).toBe(true);
  });

  it("publicly uses the Hero alternate evolution route at its printed cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-063", as: "hero" }],
        hand: [{ card: "BT21-066", as: "arrester" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hero").permanentId,
        instanceId: s.inst("arrester").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hero").topCard.cardId === "BT21-066");
    expect(s.state.memory).toBe(1);
    expect(s.perm("hero").currentDP).toBe(8000);
  });

  it("publicly plays a Hunter Tamer for free on the When Digivolving trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-063", as: "hero" }],
          hand: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT12-087", as: "hunter" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hero").permanentId,
        instanceId: s.inst("arrester").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hero").topCard.cardId === "BT21-066");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-087"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-087")).toBe(true);
  });

  it.each([
    ["Save-text-only trash card", "BT12-008", "trash"],
    ["Hero-only hand card", "BT21-010", "hand"],
  ] as const)("places a %s and itself under an own Tamer on deletion", async (_label, savedCard, zone) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT21-080", as: "tamer" },
          ],
          [zone]: [
            { card: savedCard, as: "saved" },
            { card: "BT1-009", as: "nonmatching" },
          ],
        },
        1: { battleArea: [{ card: "BT10-055", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("saved").instanceId, s.perm("tamer").permanentId);
    const selfId = s.perm("arrester").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arrester").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]![zone].some((card) => card.instanceId === s.inst("nonmatching").instanceId)).toBe(true);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([selfId, s.inst("saved").instanceId]),
    );
  });

  it("can decline both optional On Deletion placement and Save", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT21-080", as: "tamer" },
          ],
          hand: [{ card: "BT21-063", as: "saved" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("arrester").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("arrester").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === selfId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).not.toContain(selfId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("saved").instanceId)).toBe(true);
  });

  it("public battle deletion declines placement but accepts optional Save", async () => {
    const { s, arresterId, savedId } = await battleDeleteWithSaveChoices(false, true);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toContain(arresterId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).not.toContain(savedId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === savedId)).toBe(true);
  });

  it("public battle deletion accepts placement but declines optional Save", async () => {
    const { s, arresterId, savedId } = await battleDeleteWithSaveChoices(true, false);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toContain(savedId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).not.toContain(arresterId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === arresterId)).toBe(true);
  });

  it("public battle deletion declines both choices and preserves source zones", async () => {
    const { s, arresterId, savedId } = await battleDeleteWithSaveChoices(false, false);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === arresterId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === savedId)).toBe(true);
  });

  it("publicly triggers On Deletion after losing a battle and Saves under an own Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT21-080", as: "tamer" },
          ],
          hand: [{ card: "BT21-063", as: "saved" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT10-055", as: "opponent", suspended: true }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const arresterId = s.inst("arrester").instanceId;
    const savedId = s.inst("saved").instanceId;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arrester").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === arresterId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([arresterId, savedId]));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-066")).toBe(false);
  });

  it("gives its evolution host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-073", as: "host", under: [{ card: "BT21-066", as: "source" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
