import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-027.js";
import "../index.js";

describe("BT21-027 compiled implementation", () => {
  it("does not use its DigiXros-only alias for an alternate digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-027", as: "base" }],
        hand: [{ card: "BT21-027", as: "destination" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("destination").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe("BT21-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("destination").instanceId);
    expect(s.state.memory).toBe(10);
  });

  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("requires OmniShoutmon and ZeigGreymon as the two DigiXros materials", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["OmniShoutmon"] }, { names: ["ZeigGreymon"] }], count: 3 },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [expect.objectContaining({ keyword: "SecurityAttack", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
          },
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
          },
        ],
      }),
    );
  });

  it("publishes both alternate evolution routes and its additional DigiXros names", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["ZeigGreymon"], cost: 2, isAlternate: true },
      { level: 5, traits: ["Xros Heart"], cost: 3, isAlternate: true },
    ]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-027", as: "shoutmon-dx" }] } });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("shoutmon-dx"))).toEqual(["shoutmon dx"]);
    expect(observe(s.engine).hasKeyword(s.perm("shoutmon-dx"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("shoutmon-dx"), "SecurityAttack")).toBe(1);
  });

  it("accepts the printed alias in a later public DigiXros recipe", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-018", as: "nextHost" },
          { card: "BT21-021", as: "omni" },
          { card: "BT21-027", as: "zeigAlias" },
        ],
      },
    });
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("nextHost").instanceId,
        digiXros: { materialInstanceIds: [s.inst("omni").instanceId, s.inst("zeigAlias").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("nextHost").instanceId),
    );
    const host = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("nextHost").instanceId)!;
    expect(host.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("omni").instanceId, s.inst("zeigAlias").instanceId]),
    );
  });

  it("deletes exactly the lowest-DP opponent on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-027", as: "superior" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT11-075", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
  });

  it("deletes one selected lowest-DP tie and preserves the other tie and higher target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-027", as: "superior" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-009", as: "lowB" },
            { card: "BT1-019", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    const highId = s.perm("high").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("superior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
    expect(
      [lowAId, lowBId].filter((id) => s.state.players[1]!.battleArea.some((p) => p.permanentId === id)),
    ).toHaveLength(1);
  });

  it("publicly DigiXroses OmniShoutmon and ZeigGreymon with the printed -3 per material", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT21-027", as: "superior" },
          { card: "BT21-021", as: "omni" },
          { card: "AD1-013", as: "zeig" },
        ],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("omni").instanceId, s.inst("zeig").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-027"));
    const fused = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-027")!;
    expect(s.state.memory).toBe(1);
    expect(fused.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-021", "AD1-013"]));
  });

  it.each([
    { base: "AD1-013", expectedCost: 2 },
    { base: "BT21-021", expectedCost: 3 },
  ])(
    "uses the alternate route from $base for cost $expectedCost and deletes the lowest DP Digimon",
    async ({ base, expectedCost }) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT21-027", as: "shoutmon-dx" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "low", dp: 3000 },
              { card: "BT11-075", as: "high" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shoutmon-dx").instanceId,
          alternateRequirementIndex: base === "AD1-013" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT21-027");
      await settle(() => s.state.players[1]!.battleArea.length === 1);

      expect(s.state.memory).toBe(6 - expectedCost);
      expect(s.state.players[1]!.battleArea[0]?.topCard.cardId).toBe("BT11-075");
    },
  );

  it("publicly performs two Security checks after DigiXrosing with an inherited Rush source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-027", as: "superior" },
            { card: "BT21-021", as: "rushSource" },
            { card: "AD1-013", as: "zeig" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("superior").instanceId,
        digiXros: { materialInstanceIds: [s.inst("rushSource").instanceId, s.inst("zeig").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("superior").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("superior"), "Rush")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("superior").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
  });

  it("rejects both alternate routes from a nonmatching level-3 base without paying", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT21-027", as: "shoutmon-dx" }] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shoutmon-dx").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
  });

  it("places only Xros Heart and Blue Flare Digimon sources under a Tamer, then still leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-027",
              as: "shoutmon-dx",
              under: [
                { card: "BT21-021", as: "xros-heart" },
                { card: "AD1-013", as: "blue-flare" },
                { card: "BT1-009", as: "nonmatching" },
              ],
            },
            { card: "BT1-010", as: "other-host", under: [{ card: "BT21-021", as: "foreign-source" }] },
            { card: "BT1-085", as: "tamer" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "red-source" }],
          hand: [{ card: "ST1-16", as: "gaia-force" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia-force").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-027"));
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-021", "AD1-013"]));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT21-027", "BT1-009"]),
    );
    expect(s.perm("other-host").stack.map((card) => card.instanceId)).toContain(s.inst("foreign-source").instanceId);
  });

  it("may decline moving sources and leaves without offering the effect when no Tamer exists", async () => {
    for (const [withTamer, options] of [
      [true, { autoDeclineOptional: true }],
      [false, { autoAcceptOptional: true, autoSelectCards: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-027", as: "shoutmon-dx", under: [{ card: "BT21-021", as: "source" }] },
              ...(withTamer ? [{ card: "BT1-085", as: "tamer" }] : []),
            ],
          },
          1: {
            battleArea: [{ card: "BT1-010", as: "red-source" }],
            hand: [{ card: "ST1-16", as: "gaia-force" }],
          },
        },
        options,
      );
      s.state.turnSeat = 1;
      s.state.memory = 8;
      await s.ready();

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia-force").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-027"));

      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT21-027", "BT21-021"]),
      );
    }
  });
});
