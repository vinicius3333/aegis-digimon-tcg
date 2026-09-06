import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-021.js";
import "../index.js";

describe("BT21-021 OmniShoutmon", () => {
  it("does not use its DigiXros-only alias for an alternate digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-021", as: "base" }],
        hand: [{ card: "BT21-021", as: "destination" }],
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
    expect(s.perm("base").topCard.cardId).toBe("BT21-021");
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

  it("verifies End of Attack play/delete, On Deletion Save flow, DigiXros identity, and Xros Heart-gated Rush", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Shoutmon"] }],
    });
    expect(
      compiled.effects.some((effect) => effect.keywords?.some((keyword) => keyword.keyword === "SecurityAttack")),
    ).toBe(false);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "EndOfAttack",
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: true,
            costReduction: 5,
            optional: true,
          }),
          expect.objectContaining({
            kind: "Delete",
            condition: { kind: "ifThisEffectActed", raw: "you did" },
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "PlaceUnder",
            target: expect.objectContaining({
              filter: expect.objectContaining({ controller: "mine", kind: ["Digimon"] }),
            }),
          }),
          expect.objectContaining({
            kind: "PlaceUnder",
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          }),
        ],
      }),
    );
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
        },
      ],
    });
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["Shoutmon"] }], count: 2, maxMaterials: 1 }]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Shoutmon"], cost: 4, isAlternate: true },
      { level: 4, traits: ["Xros Heart", "Hero"], cost: 3, isAlternate: true },
    ]);
  });

  it("saves a qualifying Xros Heart card and itself under a Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-021", as: "omnishoutmon" },
            { card: "BT21-083", as: "tamer" },
          ],
          trash: [{ card: "BT21-011", as: "savedCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("omnishoutmon").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.length >= 2);

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT21-021", "BT21-011"]));
  });

  it("plays an eligible trait card at cost reduced by 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-021", as: "omni" },
            { card: "BT21-083", as: "tamer" },
          ],
          hand: [{ card: "BT10-007", as: "dondokomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("omni"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-007"));
    expect(s.state.memory).toBe(3);
  });

  it("uses DigiXros with exactly one Shoutmon material through the public play intent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-021", as: "material" }], hand: [{ card: "BT21-021", as: "omni" }] },
    });
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("omni").instanceId,
        digiXros: { materialInstanceIds: [s.perm("material").topCard.instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-021"));
    expect(s.state.memory).toBe(1);
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("omni").instanceId)?.stack.map(
        (card) => card.instanceId,
      ),
    ).toEqual([s.inst("material").instanceId]);
  });

  it("inherits Rush from BT21-021 under a legal public BT21-027 DigiXros host", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-027", as: "host" },
            { card: "BT21-021", as: "source" },
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
        instanceId: s.inst("host").instanceId,
        digiXros: { materialInstanceIds: [s.inst("source").instanceId, s.inst("zeig").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("host").instanceId));
    const hostId = s.perm("host").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
  });

  it("does not grant Rush when BT21-021 is under a non-Xros Heart public DigiXros host", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-012", as: "host" },
            { card: "BT21-021", as: "source" },
            { card: "BT10-049", as: "ballistamon" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("host").instanceId,
        digiXros: { materialInstanceIds: [s.inst("source").instanceId, s.inst("ballistamon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("host").instanceId));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("rejects a DigiXros intent offering two materials for the one-material recipe", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-011", as: "first" },
          { card: "BT21-011", as: "second" },
        ],
        hand: [{ card: "BT21-021", as: "omni" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("omni").instanceId,
        digiXros: { materialInstanceIds: [s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("omni").instanceId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT21-011", "BT21-011"]);
  });

  it("Q4530 publicly plays an eligible Tamer at end of attack, then deletes and saves itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-021", as: "omni" }],
          hand: [{ card: "BT21-083", as: "tamer" }],
        },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omni").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId,
        ) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("omni").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === s.inst("omni").instanceId)).toBe(true);
  });

  it("publicly pays the reduced cost above five before deleting itself after a successful play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-021", as: "omni" }],
          hand: [{ card: "BT11-012", as: "candidate" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omni").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("candidate").instanceId),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("omni").instanceId)).toBe(true);
  });

  it("does not delete itself when the play is declined or no eligible card exists", async () => {
    for (const [card, options] of [
      ["BT21-011", { autoDeclineOptional: true }],
      ["BT1-009", { autoAcceptOptional: true, autoSelectCards: true }],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: "BT21-021", as: "omni" }], hand: [{ card }] } }, options);
      await s.ready();
      await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("omni"));
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-021")).toBe(true);
    }
  });

  it("grants inherited Rush only to an Xros Heart host", async () => {
    const xros = setupEngine({ 0: { battleArea: [{ card: "BT21-011", as: "host", under: ["BT21-021"] }] } });
    await xros.ready();
    expect(observe(xros.engine).hasKeyword(xros.perm("host"), "Rush")).toBe(true);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT21-021"] }] } });
    await other.ready();
    expect(observe(other.engine).hasKeyword(other.perm("host"), "Rush")).toBe(false);
  });
});
