import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-031.js";
import "../index.js";

describe("EX5-031 Chirinmon", () => {
  it("matches the catalog and encodes both printed clauses", () => {
    expect(getCardDefinition("EX5-031")).toMatchObject({
      cardId: "EX5-031",
      nameEn: "Chirinmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      types: ["Holy Beast"],
      effectText: expect.stringContaining("By trashing the top card of your security stack"),
      inheritedEffectText: expect.stringContaining("6 or fewer total cards in both players' security stacks"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          allowCostWithoutTarget: true,
          optional: false,
          cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security", position: "top" } } },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      optional: true,
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          from: ["hand"],
          toTop: true,
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
          source: { filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1 },
        },
      ],
    });
  });

  it("publicly pays the mandatory security cost even when already unsuspended (Q3595)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-029", as: "base" }],
          hand: [{ card: "EX5-031", as: "chirinmon" }],
          security: [{ card: "BT1-009", as: "paidSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponentTarget", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-031");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("paidSecurity").instanceId);
  });

  it("does not unsuspend when the mandatory security cost is unavailable", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-029", as: "base", suspended: true }],
        hand: [{ card: "EX5-031", as: "chirinmon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-031");
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places a yellow hand card at security top at the six-card boundary (Q3596)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-031"] }],
          hand: [{ card: "BT1-087", as: "yellowCard" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("yellowCard").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not place a card when the combined security count is above six", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-031"] }],
          hand: [{ card: "BT1-087", as: "yellowCard" }],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("yellowCard").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly preserves the inherited use on refusal, then spends it on a later attack", async () => {
    const preferred: string[] = [];
    const options = {
      autoDeclineOptional: true,
      autoAcceptOptional: false,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-063", as: "host", under: ["EX5-031"] }],
          hand: [
            { card: "BT1-045", as: "securityCost" },
            { card: "BT1-036", as: "firstUnsuspend" },
            { card: "BT1-036", as: "secondUnsuspend" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstVictim", dp: 1000, suspended: true },
            { card: "BT1-010", as: "secondVictim", dp: 1000, suspended: true },
            { card: "BT1-011", as: "thirdVictim", dp: 1000, suspended: true },
          ],
        },
      },
      options,
    );
    s.state.memory = 12;
    preferred.push(s.perm("host").permanentId, s.inst("securityCost").instanceId);
    await s.ready();
    const attack = async (victim: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: s.perm(victim).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };
    const playUnsuspender = async (alias: string) => {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(() => !s.perm("host").isSuspended);
    };

    await attack("firstVictim");
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX5-031")).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    await playUnsuspender("firstUnsuspend");
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;

    await attack("secondVictim");
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX5-031")).toHaveLength(2);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("securityCost").instanceId,
    ]);
    await playUnsuspender("secondUnsuspend");

    await attack("thirdVictim");
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX5-031")).toHaveLength(2);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("securityCost").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
  });

  it("preserves the turn use on refusal and allows a later attack activation", async () => {
    const options = { autoDeclineOptional: true, autoAcceptOptional: false, autoSelectCards: true };
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-031"] }], hand: ["BT1-087", "BT1-087"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      options,
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX5-031")).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX5-031")).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(1);
    const decisions = s.decisions.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.decisions).toHaveLength(decisions);
  });
});
