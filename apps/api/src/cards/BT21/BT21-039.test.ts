import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-039.js";
import "../index.js";

describe("BT21-039 compiled implementation", () => {
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

  it("preserves Alliance", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
    );
  });

  it("optionally plays a level 4 or lower WG Digimon from hand when digivolving", () => {
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
          },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      },
    ]);
  });

  it("once per turn lets another Digimon digivolve from hand into a WG Digimon for free", () => {
    const whenAttacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(whenAttacking?.actions).toEqual([
      {
        kind: "Digivolve",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
        },
        payCost: false,
        from: ["hand"],
        optional: true,
      },
    ]);
  });

  it("enters through the public play intent with Alliance and WG evolution hooks registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-039", as: "gryphonmon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gryphonmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gryphonmon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gryphonmon").instanceId)).toBe(
      true,
    );
    expect(observe(s.engine).hasKeyword(s.perm("gryphonmon"), "Alliance")).toBe(true);
    expect(s.state.memory).toBe(-2);
  });

  it("plays exactly one level-4-or-lower WG Digimon for free when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-039", as: "gryphonmon" }],
          hand: [
            { card: "BT21-034", as: "legal" },
            { card: "BT21-038", as: "tooHigh" },
            { card: "BT1-009", as: "nonWg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gryphonmon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-034"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooHigh").instanceId, s.inst("nonWg").instanceId]),
    );
  });

  it("publicly digivolves from the legal level-5 WG route and resolves its free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-038", as: "base" }],
          hand: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT21-034", as: "freeWg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gryphonmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gryphonmon").instanceId);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("freeWg").instanceId),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT21-039");
  });

  it("publicly plays exactly one eligible WG card on digivolution and preserves the other candidates", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-038", as: "base" }],
          hand: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT21-034", as: "firstEligible" },
            { card: "BT21-033", as: "secondEligible" },
            { card: "BT21-038", as: "tooHigh" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 4;
    await s.ready();
    preferInstanceIds.push(s.inst("firstEligible").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gryphonmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-039");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-034"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("secondEligible").instanceId,
        s.inst("tooHigh").instanceId,
        s.inst("wrongTrait").instanceId,
      ]),
    );
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT21-034")).toHaveLength(
      1,
    );
    expect(s.state.memory).toBe(0);
  });

  it("publicly declines the eligible WG play after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-038", as: "base" }],
          hand: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT21-034", as: "eligible" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gryphonmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-039");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("may decline the free WG play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-039", as: "gryphonmon" }],
          hand: [{ card: "BT21-034", as: "legal" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gryphonmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("legal").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("digivolves another Digimon into a WG card for free and only once per turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT21-033", as: "firstBase" },
            { card: "BT21-033", as: "secondBase" },
          ],
          hand: [
            { card: "BT21-034", as: "firstEvolution" },
            { card: "BT21-034", as: "secondEvolution" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("firstBase").permanentId, s.inst("firstEvolution").instanceId);
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gryphonmon"));
    await settle(() => s.perm("firstBase").topCard.cardId === "BT21-034");
    expect(s.state.memory).toBe(3);

    preferInstanceIds.splice(
      0,
      preferInstanceIds.length,
      s.perm("secondBase").permanentId,
      s.inst("secondEvolution").instanceId,
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gryphonmon"));

    expect(s.perm("secondBase").topCard.cardId).toBe("BT21-033");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEvolution").instanceId);
  });

  it("uses the public attack origin to free-digivolve another WG Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT21-033", as: "base" },
          ],
          hand: [{ card: "BT21-034", as: "evolution" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gryphonmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-034");
    expect(s.state.memory).toBe(3);
  });

  it("does not free-digivolve a non-WG base when no legal target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT1-009", as: "nonWgBase" },
          ],
          hand: [{ card: "BT21-034", as: "evolution" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gryphonmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.perm("nonWgBase").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("evolution").instanceId }),
    );
  });

  it("uses the public When Attacking evolution only once per turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-039", as: "gryphonmon" },
            { card: "BT21-033", as: "firstBase" },
            { card: "BT21-033", as: "secondBase" },
            { card: "BT1-089", as: "greenTamer" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          hand: [
            { card: "BT21-034", as: "firstEvolution" },
            { card: "BT21-034", as: "secondEvolution" },
            { card: "ST8-11", as: "victorySword" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("firstBase").permanentId, s.inst("firstEvolution").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gryphonmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstBase").topCard.cardId === "BT21-034");
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("gryphonmon").topCard.cardId).toBe("BT21-039");
    preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("gryphonmon").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("victorySword").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("gryphonmon").isSuspended);
    expect(s.state.memory).toBe(7);
    preferInstanceIds.splice(
      0,
      preferInstanceIds.length,
      s.perm("secondBase").permanentId,
      s.inst("secondEvolution").instanceId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gryphonmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length >= 2);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 2);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("secondBase").topCard.cardId).toBe("BT21-033");
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("secondEvolution").instanceId }),
    );
  });
});
